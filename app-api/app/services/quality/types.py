"""Data Quality types, constants and helpers shared across quality sub-modules.

Security notes:
- CPU-bound and synchronous.  Called via asyncio.to_thread().
- No SQL / network I/O -- operates purely on in-memory row dicts.
- Column names come from validated DatasetColumn definitions.
- No user-supplied strings in f-strings or log messages beyond
  column/dataset names that passed identifier validation upstream.
"""

from __future__ import annotations

import contextlib
import datetime
import math
from dataclasses import asdict, dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.models.data_catalog import DatasetColumn  # noqa: F401

__all__ = [
    "QualityConfig",
    "QualityResult",
    "ColumnReport",
    "SYSTEM_COLUMNS",
    "MAR_RATIO_THRESHOLD",
    "MIN_RATE_BUCKETS",
    "MIN_VALUES_FOR_OUTLIERS",
    "MAX_DAY_VALUE",
    "DATE_PARTS",
    "normalize_date",
    "temporal_sort_key",
    "parse_date_string",
    "iso_week",
    "collect_past_values",
    "collect_past_group_values",
    "ratio_exceeds_threshold",
    "median",
    "percentile",
    "iqr_bounds",
    "zscore_bounds",
    "config_to_dict",
]


# ── System columns (excluded from dedup and quality checks) ──────
SYSTEM_COLUMNS: frozenset[str] = frozenset({"_row_id", "_ingested_at", "_batch_id"})

# ── Ratio threshold for MAR detection ────────────────────────────
MAR_RATIO_THRESHOLD: float = 3.0

# Minimum number of rate buckets needed for MAR ratio test.
MIN_RATE_BUCKETS: int = 2

# Minimum number of values for meaningful outlier detection.
MIN_VALUES_FOR_OUTLIERS: int = 4

# Date format heuristic: values > 31 are likely years, not days.
MAX_DAY_VALUE: int = 31

# Expected part count for DD/MM/YYYY date strings.
DATE_PARTS: int = 3


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
        missing_type: Classification -- "mcar", "mar", or "none".
        strategy_applied: Imputation/action taken -- e.g. "delete", "ffill",
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


# ── Temporal Helpers ─────────────────────────────────────────────


def normalize_date(value: Any) -> datetime.date | None:
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
        return parse_date_string(value)
    return None


def temporal_sort_key(value: Any) -> tuple[int, datetime.date]:
    """Sort key for temporal values that may be missing/invalid.

    Returns:
      (0, date) for valid dates
      (1, date.max) for missing/invalid values
    """
    normalized = normalize_date(value)
    if normalized is None:
        return (1, datetime.date.max)
    return (0, normalized)


def parse_date_string(value: str) -> datetime.date | None:
    """Parse a date string in ISO or French DD/MM/YYYY format."""
    # Try ISO format first (YYYY-MM-DD)
    try:
        return datetime.date.fromisoformat(value[:10])
    except (ValueError, IndexError):
        pass
    # Try French format (DD/MM/YYYY)
    parts = value.replace("-", "/").split("/")
    if len(parts) == DATE_PARTS:
        try:
            day, month, year = (
                int(parts[0]),
                int(parts[1]),
                int(parts[2]),
            )
            if year > MAX_DAY_VALUE:
                return datetime.date(year, month, day)
            return datetime.date(day, month, year)
        except (ValueError, OverflowError):
            pass
    return None


def iso_week(dt: datetime.date) -> int:
    """Return the ISO week number for a date."""
    return dt.isocalendar()[1]


def collect_past_values(
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
        row_date = normalize_date(row.get(temporal_index))
        if row_date is None or row_date >= current_date:
            continue
        if row_date < cutoff:
            continue

        val = row.get(col_name)
        if val is not None:
            with contextlib.suppress(TypeError, ValueError):
                result.append(float(val))

    return result


def collect_past_group_values(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str],
    group_key: tuple[Any, ...],
    current_date: datetime.date,
    window_days: int,
) -> list[float]:
    """Collect non-None numeric values for a specific group from past rows.

    Same causal constraint as collect_past_values, but filtered to the
    same group.
    """
    cutoff = current_date - datetime.timedelta(days=window_days)
    result: list[float] = []

    for row in rows:
        row_date = normalize_date(row.get(temporal_index))
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


# ── Statistical Helpers ──────────────────────────────────────────


def ratio_exceeds_threshold(rates: list[float]) -> bool:
    """Return True if max/min of nonzero rates exceeds MAR threshold."""
    nonzero = [r for r in rates if r > 0.0]
    if len(nonzero) < MIN_RATE_BUCKETS or len(rates) < MIN_RATE_BUCKETS:
        return False
    min_rate = min(nonzero)
    max_rate = max(nonzero)
    return min_rate > 0.0 and max_rate / min_rate > MAR_RATIO_THRESHOLD


def iqr_bounds(values: list[float], factor: float) -> tuple[float, float] | None:
    """Compute IQR-based outlier bounds.

    Lower = Q1 - factor * IQR
    Upper = Q3 + factor * IQR

    Returns None if IQR is zero (constant data).
    """
    sorted_vals = sorted(values)

    q1 = percentile(sorted_vals, 0.25)
    q3 = percentile(sorted_vals, 0.75)
    iqr = q3 - q1

    if iqr == 0.0:
        return None

    lower = q1 - factor * iqr
    upper = q3 + factor * iqr
    return (lower, upper)


def zscore_bounds(values: list[float], threshold: float) -> tuple[float, float] | None:
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


def percentile(sorted_values: list[float], p: float) -> float:
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


def median(values: list[Any]) -> float:
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


# ── Serialization Helpers ────────────────────────────────────────


def config_to_dict(config: QualityConfig) -> dict[str, Any]:
    """Serialize a QualityConfig to a plain dict for audit logging."""
    return asdict(config)
