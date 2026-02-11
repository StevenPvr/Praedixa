"""Data Quality Service -- backward-compatible re-export shim.

This module re-exports everything from the refactored ``quality`` package
so that existing imports (``from app.services.data_quality import ...``)
continue to work without modification.

The actual implementation now lives in:
- quality/types.py          -- Types, constants, helpers
- quality/deduplication.py  -- Stage 1: dedup
- quality/missing_imputation.py -- Stages 2-3: classification + imputation
- quality/outlier_detection.py  -- Stage 4: outlier detection + clamping
- quality/__init__.py       -- Orchestrator (run_quality_checks)
"""

# Re-export the full public API
from app.services.quality import (  # noqa: F401
    _SYSTEM_COLUMNS,
    ColumnReport,
    QualityConfig,
    QualityResult,
    _clamp_values,
    _classify_missing,
    _collect_past_group_values,
    _collect_past_values,
    _compute_outlier_bounds,
    _config_to_dict,
    _deduplicate,
    _detect_and_clamp_outliers,
    _impute_column,
    _impute_forward_fill,
    _impute_mar,
    _impute_mar_grouped,
    _impute_mcar_temporal,
    _iqr_bounds,
    _is_mar_group,
    _is_mar_temporal,
    _iso_week,
    _median,
    _normalize_date,
    _parse_date_string,
    _percentile,
    _ratio_exceeds_threshold,
    _temporal_sort_key,
    _try_global_median,
    _try_group_ffill,
    _try_group_median,
    _zscore_bounds,
    run_quality_checks,
)

__all__ = ["QualityConfig", "QualityResult", "ColumnReport", "run_quality_checks"]
