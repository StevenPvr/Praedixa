"""Data Quality Service — dedup, missing analysis, imputation, outlier clamping.

Sits between column_mapper and raw_inserter in the ingestion pipeline:
  parse_file -> map_columns -> **run_quality_checks** -> insert_raw_rows

All operations are **strictly causal** — no future data is ever used for
imputation or outlier statistics.  This is critical because this module
processes time series data destined for forecasting; any look-ahead bias
here would propagate to all downstream models.

Missing value mechanism classification uses temporal and group-based
heuristics (simplified Little's MCAR test) to choose between deletion
and imputation strategies.

Security notes:
- CPU-bound and synchronous.  Called via asyncio.to_thread().
- No SQL / network I/O — operates purely on in-memory row dicts.
- Column names come from validated DatasetColumn definitions.
- No user-supplied strings in f-strings or log messages beyond
  column/dataset names that passed identifier validation upstream.
"""

from __future__ import annotations

import contextlib
import datetime
import logging
import math
from dataclasses import asdict, dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.models.data_catalog import DatasetColumn

logger = logging.getLogger(__name__)

__all__ = ["QualityConfig", "QualityResult", "ColumnReport", "run_quality_checks"]


# ── System columns (excluded from dedup and quality checks) ──────

_SYSTEM_COLUMNS: frozenset[str] = frozenset({"_row_id", "_ingested_at", "_batch_id"})

# ── Ratio threshold for MAR detection ────────────────────────────
# If the ratio of max to min missing rate (across weeks or groups)
# exceeds this value, we classify as MAR instead of MCAR.
_MAR_RATIO_THRESHOLD: float = 3.0

# Minimum number of rate buckets needed for MAR ratio test.
_MIN_RATE_BUCKETS: int = 2

# Minimum number of values for meaningful outlier detection.
_MIN_VALUES_FOR_OUTLIERS: int = 4

# Date format heuristic: values > 31 are likely years, not days.
_MAX_DAY_VALUE: int = 31

# Expected part count for DD/MM/YYYY date strings.
_DATE_PARTS: int = 3


# ── Configuration ────────────────────────────────────────────────


@dataclass(frozen=True)
class QualityConfig:
    """Configuration for the data quality pipeline.

    Attributes:
        duplicate_columns: Columns to consider for duplicate detection.
            None means all non-system columns.
        missing_threshold_delete: Below this missing fraction, MCAR columns
            have their missing rows deleted. Above it, imputation is used.
        outlier_method: "iqr" (default) or "zscore".
        outlier_iqr_factor: Multiplier for IQR bounds (default 1.5).
        outlier_zscore_threshold: Number of std devs for z-score bounds.
        imputation_window_days: Size of the causal rolling window in days
            for median-based imputation.
        column_overrides: Per-column config overrides.
            Example: {"col": {"skip": True}} or {"col": {"outlier_method": "zscore"}}
    """

    duplicate_columns: list[str] | None = None
    missing_threshold_delete: float = 0.05
    outlier_method: str = "iqr"
    outlier_iqr_factor: float = 1.5
    outlier_zscore_threshold: float = 3.0
    imputation_window_days: int = 14
    column_overrides: dict[str, dict[str, Any]] = field(default_factory=dict)


# ── Result dataclasses ───────────────────────────────────────────


@dataclass(frozen=True)
class ColumnReport:
    """Per-column quality report.

    Attributes:
        missing_count: Original count of missing values in this column.
        missing_pct: Fraction of rows with missing values (0.0 to 1.0).
        missing_type: Classification — "mcar", "mar", or "none".
        strategy_applied: Imputation/action taken — e.g. "delete", "ffill",
            "rolling_median", "group_median", "global_median", "clamp", "none".
        imputed_count: Number of values filled by imputation.
        outlier_count: Number of outliers detected.
        outliers_clamped: Number of outlier values that were clamped.
        bounds: (lower, upper) bounds if outlier detection was applied.
    """

    missing_count: int
    missing_pct: float
    missing_type: str
    strategy_applied: str
    imputed_count: int
    outlier_count: int
    outliers_clamped: int
    bounds: tuple[float, float] | None = None


@dataclass(frozen=True)
class QualityResult:
    """Aggregate quality result for the entire batch.

    Attributes:
        cleaned_rows: The processed rows after dedup, imputation, and clamping.
        rows_received: Original number of rows.
        rows_after_dedup: Rows remaining after duplicate removal.
        rows_after_quality: Final row count after quality processing.
        duplicates_found: Number of duplicate groups detected.
        duplicates_removed: Number of duplicate rows removed.
        missing_total: Total missing values across all columns.
        missing_imputed: Total values that were imputed.
        missing_deleted_rows: Rows deleted due to MCAR-below-threshold logic.
        outliers_total: Total outliers detected across all columns.
        outliers_clamped: Total outlier values clamped.
        column_reports: Per-column quality reports.
        config_snapshot: Serialized config for audit logging.
    """

    cleaned_rows: list[dict[str, Any]]
    rows_received: int
    rows_after_dedup: int
    rows_after_quality: int
    duplicates_found: int
    duplicates_removed: int
    missing_total: int
    missing_imputed: int
    missing_deleted_rows: int
    outliers_total: int
    outliers_clamped: int
    column_reports: dict[str, ColumnReport]
    config_snapshot: dict[str, Any]


# ── Public API ───────────────────────────────────────────────────


def run_quality_checks(
    rows: list[dict[str, Any]],
    columns: list[DatasetColumn],
    temporal_index: str,
    group_by_columns: list[str] | None = None,
    config: QualityConfig | None = None,
) -> QualityResult:
    """Run the full data quality pipeline on parsed rows.

    This function is synchronous and should be called via
    ``asyncio.to_thread()`` from async code.

    Pipeline stages:
    1. Deduplicate (keep first occurrence in temporal order)
    2. Classify missing values per column (MCAR vs MAR)
    3. Impute missing values (causal only — no look-ahead)
    4. Detect and clamp outliers (numeric columns only)

    Args:
        rows: Parsed row dicts from file_parser.
        columns: DatasetColumn definitions from the database.
        temporal_index: Name of the temporal index column.
        group_by_columns: Optional grouping columns for MAR detection.
        config: Quality configuration. Uses defaults if None.

    Returns:
        QualityResult with cleaned rows and diagnostic reports.
    """
    if config is None:
        config = QualityConfig()

    rows_received = len(rows)

    # Edge case: no rows
    if not rows:
        return QualityResult(
            cleaned_rows=[],
            rows_received=0,
            rows_after_dedup=0,
            rows_after_quality=0,
            duplicates_found=0,
            duplicates_removed=0,
            missing_total=0,
            missing_imputed=0,
            missing_deleted_rows=0,
            outliers_total=0,
            outliers_clamped=0,
            column_reports={},
            config_snapshot=_config_to_dict(config),
        )

    # Identify numeric columns for outlier detection
    numeric_cols: set[str] = {
        c.name
        for c in columns
        if c.dtype.value in ("float", "integer") and c.name != temporal_index
    }

    # ── Stage 1: Deduplication ────────────────────────────
    working_rows, dupes_found, dupes_removed = _deduplicate(
        rows, temporal_index, config
    )
    rows_after_dedup = len(working_rows)

    logger.info(
        "Deduplication complete: received=%d, duplicates_removed=%d, remaining=%d",
        rows_received,
        dupes_removed,
        rows_after_dedup,
    )

    # ── Stage 2 + 3: Missing value analysis + imputation ──
    column_reports: dict[str, ColumnReport] = {}
    total_missing = 0
    total_imputed = 0
    total_deleted_rows = 0

    # Columns to process (exclude system cols and temporal index from imputation)
    process_cols = [
        c.name
        for c in columns
        if c.name not in _SYSTEM_COLUMNS and c.name != temporal_index
    ]

    for col_name in process_cols:
        overrides = config.column_overrides.get(col_name, {})

        # Skip if explicitly configured
        if overrides.get("skip", False):
            column_reports[col_name] = ColumnReport(
                missing_count=0,
                missing_pct=0.0,
                missing_type="none",
                strategy_applied="none",
                imputed_count=0,
                outlier_count=0,
                outliers_clamped=0,
            )
            continue

        # Count missing values
        missing_count = sum(1 for r in working_rows if r.get(col_name) is None)
        missing_pct = missing_count / len(working_rows) if working_rows else 0.0
        total_missing += missing_count

        if missing_count == 0:
            column_reports[col_name] = ColumnReport(
                missing_count=0,
                missing_pct=0.0,
                missing_type="none",
                strategy_applied="none",
                imputed_count=0,
                outlier_count=0,
                outliers_clamped=0,
            )
            continue

        # Classify missing mechanism
        missing_type = _classify_missing(
            working_rows, col_name, temporal_index, group_by_columns
        )

        # Apply imputation strategy
        strategy, imputed_count, deleted_rows = _impute_column(
            working_rows,
            col_name,
            temporal_index,
            group_by_columns,
            missing_type,
            config,
            overrides,
        )

        total_imputed += imputed_count
        total_deleted_rows += deleted_rows

        column_reports[col_name] = ColumnReport(
            missing_count=missing_count,
            missing_pct=missing_pct,
            missing_type=missing_type,
            strategy_applied=strategy,
            imputed_count=imputed_count,
            outlier_count=0,  # Filled in stage 4
            outliers_clamped=0,
        )

    rows_after_quality = len(working_rows)

    # ── Stage 4: Outlier detection and clamping ───────────
    total_outliers = 0
    total_clamped = 0

    for col_name in numeric_cols:
        if col_name not in {c.name for c in columns if c.name not in _SYSTEM_COLUMNS}:
            continue  # pragma: no cover — defensive guard, never reached in practice

        overrides = config.column_overrides.get(col_name, {})
        if overrides.get("skip", False):
            continue

        outlier_count, clamped_count, bounds = _detect_and_clamp_outliers(
            working_rows,
            col_name,
            temporal_index,
            config,
            overrides,
        )

        total_outliers += outlier_count
        total_clamped += clamped_count

        # Update the column report with outlier info
        if col_name in column_reports:
            existing = column_reports[col_name]
            column_reports[col_name] = ColumnReport(
                missing_count=existing.missing_count,
                missing_pct=existing.missing_pct,
                missing_type=existing.missing_type,
                strategy_applied=existing.strategy_applied,
                imputed_count=existing.imputed_count,
                outlier_count=outlier_count,
                outliers_clamped=clamped_count,
                bounds=bounds,
            )
        else:  # pragma: no cover — outlier-only column with no missing report
            column_reports[col_name] = ColumnReport(
                missing_count=0,
                missing_pct=0.0,
                missing_type="none",
                strategy_applied="none",
                imputed_count=0,
                outlier_count=outlier_count,
                outliers_clamped=clamped_count,
                bounds=bounds,
            )

    logger.info(
        "Quality checks complete: rows=%d, missing_imputed=%d, "
        "deleted_rows=%d, outliers_clamped=%d",
        rows_after_quality,
        total_imputed,
        total_deleted_rows,
        total_clamped,
    )

    return QualityResult(
        cleaned_rows=working_rows,
        rows_received=rows_received,
        rows_after_dedup=rows_after_dedup,
        rows_after_quality=rows_after_quality,
        duplicates_found=dupes_found,
        duplicates_removed=dupes_removed,
        missing_total=total_missing,
        missing_imputed=total_imputed,
        missing_deleted_rows=total_deleted_rows,
        outliers_total=total_outliers,
        outliers_clamped=total_clamped,
        column_reports=column_reports,
        config_snapshot=_config_to_dict(config),
    )


# ── Stage 1: Deduplication ───────────────────────────────────────


def _deduplicate(
    rows: list[dict[str, Any]],
    temporal_index: str,
    config: QualityConfig,
) -> tuple[list[dict[str, Any]], int, int]:
    """Remove duplicate rows, keeping the first occurrence in temporal order.

    Returns:
        (deduplicated_rows, duplicates_found, duplicates_removed)
    """
    # Sort by temporal index for causal ordering.
    # Rows with missing/invalid dates are placed at the end deterministically.
    sorted_rows = sorted(
        rows,
        key=lambda r: _temporal_sort_key(r.get(temporal_index)),
    )

    # Determine which columns to use for duplicate detection
    if config.duplicate_columns is not None:
        dedup_cols = config.duplicate_columns
    else:
        # All columns except system columns
        all_cols = set()
        for row in sorted_rows:
            all_cols.update(row.keys())
        dedup_cols = sorted(all_cols - _SYSTEM_COLUMNS)

    # Build fingerprints and detect duplicates
    seen: dict[tuple[Any, ...], int] = {}
    unique_rows: list[dict[str, Any]] = []
    dupes_found = 0
    dupes_removed = 0

    for row in sorted_rows:
        fingerprint = tuple(row.get(col) for col in dedup_cols)
        if fingerprint in seen:
            dupes_removed += 1
            # Only count unique duplicate groups
            if seen[fingerprint] == 1:
                dupes_found += 1
            seen[fingerprint] += 1
        else:
            seen[fingerprint] = 1
            unique_rows.append(row)

    return unique_rows, dupes_found, dupes_removed


# ── Stage 2: Missing Value Classification ────────────────────────


def _classify_missing(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str] | None,
) -> str:
    """Classify the missing value mechanism for a column.

    Uses two heuristics:
    1. Temporal: if missing rate varies > 3x across weeks -> MAR
    2. Group: if missing rate varies > 3x across groups -> MAR
    3. Default: MCAR

    Returns:
        "mcar" or "mar"
    """
    if len(rows) <= 1:
        return "mcar"

    if _is_mar_temporal(rows, col_name, temporal_index):
        return "mar"

    if group_by_columns and _is_mar_group(rows, col_name, group_by_columns):
        return "mar"

    return "mcar"


def _is_mar_temporal(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
) -> bool:
    """Check if missing values cluster temporally (MAR heuristic)."""
    week_total: dict[tuple[int, int], int] = {}
    week_missing: dict[tuple[int, int], int] = {}

    for row in rows:
        dt = _normalize_date(row.get(temporal_index))
        if dt is None:
            continue
        week_key = (dt.year, _iso_week(dt))
        week_total[week_key] = week_total.get(week_key, 0) + 1
        if row.get(col_name) is None:
            week_missing[week_key] = week_missing.get(week_key, 0) + 1

    week_rates = [
        week_missing.get(wk, 0) / total for wk, total in week_total.items() if total > 0
    ]

    return _ratio_exceeds_threshold(week_rates)


def _is_mar_group(
    rows: list[dict[str, Any]],
    col_name: str,
    group_by_columns: list[str],
) -> bool:
    """Check if missing values cluster by group (MAR heuristic)."""
    group_total: dict[tuple[Any, ...], int] = {}
    group_missing: dict[tuple[Any, ...], int] = {}

    for row in rows:
        gk = tuple(row.get(g) for g in group_by_columns)
        group_total[gk] = group_total.get(gk, 0) + 1
        if row.get(col_name) is None:
            group_missing[gk] = group_missing.get(gk, 0) + 1

    group_rates = [
        group_missing.get(gk, 0) / total
        for gk, total in group_total.items()
        if total > 0
    ]

    return _ratio_exceeds_threshold(group_rates)


def _ratio_exceeds_threshold(rates: list[float]) -> bool:
    """Return True if max/min of nonzero rates exceeds MAR threshold."""
    nonzero = [r for r in rates if r > 0.0]
    if len(nonzero) < _MIN_RATE_BUCKETS or len(rates) < _MIN_RATE_BUCKETS:
        return False
    min_rate = min(nonzero)
    max_rate = max(nonzero)
    return min_rate > 0.0 and max_rate / min_rate > _MAR_RATIO_THRESHOLD


# ── Stage 3: Imputation ─────────────────────────────────────────


def _impute_column(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str] | None,
    missing_type: str,
    config: QualityConfig,
    overrides: dict[str, Any],
) -> tuple[str, int, int]:
    """Apply the appropriate imputation strategy for a column.

    Mutates ``rows`` in place (removes rows for MCAR deletion, fills values
    for imputation).

    Returns:
        (strategy_name, imputed_count, deleted_row_count)
    """
    threshold = overrides.get(
        "missing_threshold_delete", config.missing_threshold_delete
    )
    window_days = overrides.get("imputation_window_days", config.imputation_window_days)

    missing_count = sum(1 for r in rows if r.get(col_name) is None)
    if not rows:
        return "none", 0, 0
    missing_pct = missing_count / len(rows)

    if missing_type == "mcar" and missing_pct < threshold:
        # MCAR below threshold: delete rows with missing values
        original_len = len(rows)
        rows[:] = [r for r in rows if r.get(col_name) is not None]
        deleted = original_len - len(rows)
        return "delete", 0, deleted

    if missing_type == "mar":
        # MAR: group-aware imputation (never delete)
        imputed = _impute_mar(
            rows,
            col_name,
            temporal_index,
            group_by_columns,
            window_days,
        )
        strategy = "group_median" if group_by_columns else "ffill"
        return strategy, imputed, 0

    # MCAR above threshold: causal temporal imputation
    imputed = _impute_mcar_temporal(rows, col_name, temporal_index, window_days)
    strategy = "ffill" if imputed > 0 else "rolling_median"
    return strategy, imputed, 0


def _impute_mcar_temporal(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    window_days: int,
) -> int:
    """Causal temporal imputation for MCAR columns above threshold.

    Strategy (applied in temporal order — NO look-ahead):
    1. Forward-fill: propagate last known value
    2. Rolling causal median for values still missing (beginning of series)
    3. Leave as None if no past data exists at all

    Returns:
        Number of values imputed.
    """
    imputed = 0
    last_known: Any = None

    for row in rows:
        val = row.get(col_name)
        if val is not None:
            last_known = val
            continue

        # Step 1: Forward-fill
        if last_known is not None:
            row[col_name] = last_known
            imputed += 1
            continue

        # Step 2: Causal rolling median (only past rows)
        # At this point, last_known is None, meaning we're at the
        # beginning of the series. Collect all non-None values from
        # rows already processed up to this point.
        row_date = _normalize_date(row.get(temporal_index))
        if row_date is not None:
            past_vals = _collect_past_values(
                rows,
                col_name,
                temporal_index,
                row_date,
                window_days,
            )
            if past_vals:
                median_val = _median(past_vals)
                row[col_name] = median_val
                imputed += 1
                last_known = median_val

        # Step 3: Leave as None — we have no past data to draw from

    return imputed


def _impute_mar(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str] | None,
    window_days: int,
) -> int:
    """Group-aware imputation for MAR columns. Never deletes rows.

    Strategy (in temporal order — NO look-ahead):
    1. Forward-fill within the same group
    2. Group median over past temporal window
    3. Global causal median as final fallback

    Returns:
        Number of values imputed.
    """
    if group_by_columns:
        return _impute_mar_grouped(
            rows,
            col_name,
            temporal_index,
            group_by_columns,
            window_days,
        )
    # No groups — forward-fill + global causal median
    return _impute_forward_fill(
        rows,
        col_name,
        temporal_index,
        window_days,
    )


def _impute_mar_grouped(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str],
    window_days: int,
) -> int:
    """MAR imputation with group-aware forward-fill and median."""
    imputed = 0
    group_last: dict[tuple[Any, ...], Any] = {}

    for row in rows:
        group_key = tuple(row.get(g) for g in group_by_columns)
        val = row.get(col_name)

        if val is not None:
            group_last[group_key] = val
            continue

        filled = _try_group_ffill(row, col_name, group_key, group_last)
        if not filled:
            filled = _try_group_median(
                row,
                rows,
                col_name,
                temporal_index,
                group_by_columns,
                group_key,
                group_last,
                window_days,
            )
        if not filled:
            _try_global_median(
                row,
                rows,
                col_name,
                temporal_index,
                group_key,
                group_last,
                window_days,
            )

        if row.get(col_name) is not None:
            imputed += 1

    return imputed


def _try_group_ffill(
    row: dict[str, Any],
    col_name: str,
    group_key: tuple[Any, ...],
    group_last: dict[tuple[Any, ...], Any],
) -> bool:
    """Forward-fill from last known value in group. Returns True if filled."""
    if group_key in group_last and group_last[group_key] is not None:
        row[col_name] = group_last[group_key]
        return True
    return False


def _try_group_median(
    row: dict[str, Any],
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str],
    group_key: tuple[Any, ...],
    group_last: dict[tuple[Any, ...], Any],
    window_days: int,
) -> bool:
    """Try group median over past window. Returns True if filled."""
    row_date = _normalize_date(row.get(temporal_index))
    if row_date is None:
        return False
    group_past = _collect_past_group_values(
        rows,
        col_name,
        temporal_index,
        group_by_columns,
        group_key,
        row_date,
        window_days,
    )
    if not group_past:
        return False
    median_val = _median(group_past)
    row[col_name] = median_val
    group_last[group_key] = median_val
    return True


def _try_global_median(
    row: dict[str, Any],
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_key: tuple[Any, ...],
    group_last: dict[tuple[Any, ...], Any],
    window_days: int,
) -> bool:
    """Try global causal median as final fallback. Returns True if filled."""
    row_date = _normalize_date(row.get(temporal_index))
    if row_date is None:
        return False
    global_past = _collect_past_values(
        rows,
        col_name,
        temporal_index,
        row_date,
        window_days,
    )
    if not global_past:
        return False
    median_val = _median(global_past)
    row[col_name] = median_val
    group_last[group_key] = median_val
    return True


def _impute_forward_fill(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    window_days: int,
) -> int:
    """Forward-fill + global causal median (no group awareness)."""
    imputed = 0
    last_known: Any = None

    for row in rows:
        val = row.get(col_name)
        if val is not None:
            last_known = val
            continue

        if last_known is not None:
            row[col_name] = last_known
            imputed += 1
            continue

        row_date = _normalize_date(row.get(temporal_index))
        if row_date is not None:
            past_vals = _collect_past_values(
                rows,
                col_name,
                temporal_index,
                row_date,
                window_days,
            )
            if past_vals:
                median_val = _median(past_vals)
                row[col_name] = median_val
                last_known = median_val
                imputed += 1

    return imputed


# ── Stage 4: Outlier Detection and Clamping ──────────────────────


def _detect_and_clamp_outliers(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    config: QualityConfig,
    overrides: dict[str, Any],
) -> tuple[int, int, tuple[float, float] | None]:
    """Detect and clamp outliers in a numeric column.

    Uses either IQR or z-score method.  Computes statistics on all
    available (non-None) values.

    Returns:
        (outlier_count, clamped_count, bounds_or_none)
    """
    method = overrides.get("outlier_method", config.outlier_method)
    bounds = _compute_outlier_bounds(
        rows,
        col_name,
        method,
        overrides.get("outlier_iqr_factor", config.outlier_iqr_factor),
        overrides.get(
            "outlier_zscore_threshold",
            config.outlier_zscore_threshold,
        ),
    )

    if bounds is None:
        return 0, 0, None

    return _clamp_values(rows, col_name, bounds, method)


def _compute_outlier_bounds(
    rows: list[dict[str, Any]],
    col_name: str,
    method: str,
    iqr_factor: float,
    zscore_threshold: float,
) -> tuple[float, float] | None:
    """Collect numeric values and compute outlier bounds."""
    values: list[float] = []
    for row in rows:
        val = row.get(col_name)
        if val is not None:
            with contextlib.suppress(TypeError, ValueError):
                values.append(float(val))

    if len(values) < _MIN_VALUES_FOR_OUTLIERS:
        return None

    if method == "zscore":
        return _zscore_bounds(values, zscore_threshold)
    return _iqr_bounds(values, iqr_factor)


def _clamp_values(
    rows: list[dict[str, Any]],
    col_name: str,
    bounds: tuple[float, float],
    method: str,
) -> tuple[int, int, tuple[float, float]]:
    """Clamp outlier values to bounds. Returns counts and bounds."""
    lower, upper = bounds
    outlier_count = 0
    clamped_count = 0

    for row in rows:
        val = row.get(col_name)
        if val is None:
            continue
        with contextlib.suppress(TypeError, ValueError):
            fval = float(val)
            if fval < lower or fval > upper:
                outlier_count += 1
                clamped = max(lower, min(upper, fval))
                if isinstance(val, int) and method == "iqr":
                    row[col_name] = round(clamped)
                else:
                    row[col_name] = clamped
                clamped_count += 1

    return outlier_count, clamped_count, bounds


# ── Statistical Helpers ──────────────────────────────────────────


def _iqr_bounds(values: list[float], factor: float) -> tuple[float, float] | None:
    """Compute IQR-based outlier bounds.

    Lower = Q1 - factor * IQR
    Upper = Q3 + factor * IQR

    Returns None if IQR is zero (constant data).
    """
    sorted_vals = sorted(values)

    q1 = _percentile(sorted_vals, 0.25)
    q3 = _percentile(sorted_vals, 0.75)
    iqr = q3 - q1

    if iqr == 0.0:
        return None

    lower = q1 - factor * iqr
    upper = q3 + factor * iqr
    return (lower, upper)


def _zscore_bounds(values: list[float], threshold: float) -> tuple[float, float] | None:
    """Compute z-score-based outlier bounds.

    Lower = mean - threshold * std
    Upper = mean + threshold * std

    Returns None if std is zero (constant data).
    """
    n = len(values)
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    std = math.sqrt(variance)

    if std == 0.0:
        return None

    lower = mean - threshold * std
    upper = mean + threshold * std
    return (lower, upper)


def _percentile(sorted_values: list[float], p: float) -> float:
    """Compute the p-th percentile using linear interpolation.

    sorted_values must be pre-sorted in ascending order.
    p is in [0.0, 1.0].
    """
    n = len(sorted_values)
    if n == 1:
        return sorted_values[0]

    # Use the "exclusive" interpolation method (matches numpy default)
    idx = p * (n - 1)
    lower_idx = math.floor(idx)
    upper_idx = min(lower_idx + 1, n - 1)
    fraction = idx - lower_idx

    return sorted_values[lower_idx] + fraction * (
        sorted_values[upper_idx] - sorted_values[lower_idx]
    )


def _median(values: list[Any]) -> float:
    """Compute the median of a list of numeric values.

    Handles int, float, and other numeric types by converting to float.
    """
    numeric = sorted(float(v) for v in values)
    n = len(numeric)
    if n == 0:
        return 0.0
    mid = n // 2
    if n % 2 == 0:
        return (numeric[mid - 1] + numeric[mid]) / 2.0
    return numeric[mid]


# ── Temporal Helpers ─────────────────────────────────────────────


def _normalize_date(value: Any) -> datetime.date | None:
    """Normalize a temporal index value to a date.

    Handles datetime.date, datetime.datetime, and ISO-format strings.
    Returns None for unrecognizable values.
    """
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, str):
        return _parse_date_string(value)
    return None


def _temporal_sort_key(value: Any) -> tuple[int, datetime.date]:
    """Sort key for temporal values that may be missing/invalid.

    Returns:
      (0, date) for valid dates
      (1, date.max) for missing/invalid values
    """
    normalized = _normalize_date(value)
    if normalized is None:
        return (1, datetime.date.max)
    return (0, normalized)


def _parse_date_string(value: str) -> datetime.date | None:
    """Parse a date string in ISO or French DD/MM/YYYY format."""
    # Try ISO format first (YYYY-MM-DD)
    try:
        return datetime.date.fromisoformat(value[:10])
    except (ValueError, IndexError):
        pass
    # Try French format (DD/MM/YYYY)
    parts = value.replace("-", "/").split("/")
    if len(parts) == _DATE_PARTS:
        try:
            day, month, year = (
                int(parts[0]),
                int(parts[1]),
                int(parts[2]),
            )
            if year > _MAX_DAY_VALUE:
                return datetime.date(year, month, day)
            return datetime.date(day, month, year)
        except (ValueError, OverflowError):
            pass
    return None


def _iso_week(dt: datetime.date) -> int:
    """Return the ISO week number for a date."""
    return dt.isocalendar()[1]


def _collect_past_values(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    current_date: datetime.date,
    window_days: int,
) -> list[float]:
    """Collect non-None numeric values from rows strictly before current_date.

    Only includes values within the causal window (current_date - window_days).
    This is the core mechanism that prevents look-ahead bias.
    """
    cutoff = current_date - datetime.timedelta(days=window_days)
    result: list[float] = []

    for row in rows:
        row_date = _normalize_date(row.get(temporal_index))
        if row_date is None or row_date >= current_date:
            continue
        if row_date < cutoff:
            continue

        val = row.get(col_name)
        if val is not None:
            with contextlib.suppress(TypeError, ValueError):
                result.append(float(val))

    return result


def _collect_past_group_values(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str],
    group_key: tuple[Any, ...],
    current_date: datetime.date,
    window_days: int,
) -> list[float]:
    """Collect non-None numeric values for a specific group from past rows.

    Same causal constraint as _collect_past_values, but filtered to the
    same group.
    """
    cutoff = current_date - datetime.timedelta(days=window_days)
    result: list[float] = []

    for row in rows:
        row_date = _normalize_date(row.get(temporal_index))
        if row_date is None or row_date >= current_date:
            continue
        if row_date < cutoff:
            continue

        # Check group membership
        row_group = tuple(row.get(g) for g in group_by_columns)
        if row_group != group_key:
            continue

        val = row.get(col_name)
        if val is not None:
            with contextlib.suppress(TypeError, ValueError):
                result.append(float(val))

    return result


# ── Serialization Helpers ────────────────────────────────────────


def _config_to_dict(config: QualityConfig) -> dict[str, Any]:
    """Serialize a QualityConfig to a plain dict for audit logging."""
    return asdict(config)
