"""Data Quality Service -- dedup, missing analysis, imputation, outlier clamping.

Sits between column_mapper and raw_inserter in the ingestion pipeline:
  parse_file -> map_columns -> **run_quality_checks** -> insert_raw_rows

All operations are **strictly causal** -- no future data is ever used for
imputation or outlier statistics.  This is critical because this module
processes time series data destined for forecasting; any look-ahead bias
here would propagate to all downstream models.

Missing value mechanism classification uses temporal and group-based
heuristics (simplified Little's MCAR test) to choose between deletion
and imputation strategies.

Security notes:
- CPU-bound and synchronous.  Called via asyncio.to_thread().
- No SQL / network I/O -- operates purely on in-memory row dicts.
- Column names come from validated DatasetColumn definitions.
- No user-supplied strings in f-strings or log messages beyond
  column/dataset names that passed identifier validation upstream.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from app.services.quality.deduplication import deduplicate
from app.services.quality.missing_imputation import (
    classify_missing,
    impute_column,
    impute_forward_fill,
    impute_mar,
    impute_mar_grouped,
    impute_mcar_temporal,
    is_mar_group,
    is_mar_temporal,
    try_global_median,
    try_group_ffill,
    try_group_median,
)
from app.services.quality.outlier_detection import (
    clamp_values,
    compute_outlier_bounds,
    detect_and_clamp_outliers,
)
from app.services.quality.types import (
    SYSTEM_COLUMNS,
    ColumnReport,
    QualityConfig,
    QualityResult,
    collect_past_group_values,
    collect_past_values,
    config_to_dict,
    iqr_bounds,
    iso_week,
    median,
    normalize_date,
    parse_date_string,
    percentile,
    ratio_exceeds_threshold,
    temporal_sort_key,
    zscore_bounds,
)

if TYPE_CHECKING:
    from app.models.data_catalog import DatasetColumn

logger = logging.getLogger(__name__)

__all__ = ["QualityConfig", "QualityResult", "ColumnReport", "run_quality_checks"]

# ── Backward-compatible private aliases ──────────────────────────
# These allow existing tests and callers that import private names
# from the old monolithic module to keep working unchanged.

_SYSTEM_COLUMNS = SYSTEM_COLUMNS
_deduplicate = deduplicate
_classify_missing = classify_missing
_impute_column = impute_column
_impute_mcar_temporal = impute_mcar_temporal
_impute_mar = impute_mar
_impute_mar_grouped = impute_mar_grouped
_impute_forward_fill = impute_forward_fill
_is_mar_temporal = is_mar_temporal
_is_mar_group = is_mar_group
_try_group_ffill = try_group_ffill
_try_group_median = try_group_median
_try_global_median = try_global_median
_detect_and_clamp_outliers = detect_and_clamp_outliers
_compute_outlier_bounds = compute_outlier_bounds
_clamp_values = clamp_values
_normalize_date = normalize_date
_temporal_sort_key = temporal_sort_key
_parse_date_string = parse_date_string
_iso_week = iso_week
_collect_past_values = collect_past_values
_collect_past_group_values = collect_past_group_values
_ratio_exceeds_threshold = ratio_exceeds_threshold
_median = median
_percentile = percentile
_iqr_bounds = iqr_bounds
_zscore_bounds = zscore_bounds
_config_to_dict = config_to_dict


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
    3. Impute missing values (causal only -- no look-ahead)
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
            config_snapshot=config_to_dict(config),
        )

    # Identify numeric columns for outlier detection
    numeric_cols: set[str] = {
        c.name
        for c in columns
        if c.dtype.value in ("float", "integer") and c.name != temporal_index
    }

    # ── Stage 1: Deduplication ────────────────────────────
    working_rows, dupes_found, dupes_removed = deduplicate(rows, temporal_index, config)
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
        if c.name not in SYSTEM_COLUMNS and c.name != temporal_index
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
        missing_type = classify_missing(
            working_rows, col_name, temporal_index, group_by_columns
        )

        # Apply imputation strategy
        strategy, imputed_count, deleted_rows = impute_column(
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
        if col_name not in {c.name for c in columns if c.name not in SYSTEM_COLUMNS}:
            continue  # pragma: no cover -- defensive guard, never reached in practice

        overrides = config.column_overrides.get(col_name, {})
        if overrides.get("skip", False):
            continue

        outlier_count, clamped_count, bounds = detect_and_clamp_outliers(
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
        else:  # pragma: no cover -- outlier-only column with no missing report
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
        config_snapshot=config_to_dict(config),
    )
