"""Validation helpers for runtime feature-engineering configuration."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from app.core.config import settings
from app.core.exceptions import PraedixaError

_ALLOWED_RULE_OVERRIDE_KEYS = frozenset(
    {"lags", "rolling_windows", "normalize", "standardize", "minmax"}
)
_FEATURE_BOOLEAN_KEYS = ("normalize", "standardize", "minmax")
_ALLOWED_DATA_QUALITY_KEYS = frozenset(
    {
        "dedup_enabled",
        "missing_threshold_delete",
        "outlier_method",
        "outlier_iqr_factor",
        "outlier_zscore_threshold",
        "imputation_window_days",
    }
)
_ALLOWED_OUTLIER_METHODS = frozenset({"iqr", "zscore"})
_MAX_OUTLIER_FACTOR = 10.0
_MAX_ZSCORE_THRESHOLD = 10.0


class PipelineConfigValidationError(PraedixaError):
    """Raised when runtime pipeline config is malformed or unsafe."""

    def __init__(self, message: str, *, field: str) -> None:
        super().__init__(
            message=message,
            code="PIPELINE_CONFIG_VALIDATION_ERROR",
            status_code=422,
            details={"field": field},
        )


def _reject_unknown_keys(
    mapping: Mapping[str, Any],
    *,
    allowed_keys: frozenset[str],
    field_prefix: str,
    label: str,
) -> None:
    for key in mapping:
        if key not in allowed_keys:
            raise PipelineConfigValidationError(
                f"Unsupported {label} key",
                field=f"{field_prefix}.{key}",
            )


def _require_mapping(value: Any, *, field: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise PipelineConfigValidationError(
            "Pipeline configuration must be a JSON object",
            field=field,
        )
    return value


def _require_bool(value: Any, *, field: str) -> bool:
    if isinstance(value, bool):
        return value
    raise PipelineConfigValidationError("Expected a boolean value", field=field)


def _sanitize_window_list(
    value: Any,
    *,
    field: str,
    min_size: int,
) -> list[int]:
    if not isinstance(value, list):
        raise PipelineConfigValidationError(
            "Expected a list of integers",
            field=field,
        )

    max_windows = settings.MAX_WINDOWS_PER_DATASET
    if len(value) > max_windows:
        raise PipelineConfigValidationError(
            f"Too many windows ({len(value)} > {max_windows})",
            field=field,
        )

    out: list[int] = []
    seen: set[int] = set()
    max_size = settings.MAX_WINDOW_SIZE
    for item in value:
        if not isinstance(item, int) or isinstance(item, bool):
            raise PipelineConfigValidationError(
                "Window values must be integers",
                field=field,
            )
        if item < min_size or item > max_size:
            raise PipelineConfigValidationError(
                f"Window size {item} out of bounds [{min_size}, {max_size}]",
                field=field,
            )
        if item in seen:
            continue
        out.append(item)
        seen.add(item)
    return out


def _sanitize_feature_windows(
    mapping: Mapping[str, Any],
    *,
    field_prefix: str,
) -> dict[str, list[int]]:
    sanitized: dict[str, list[int]] = {}

    if "lags" in mapping:
        sanitized["lags"] = _sanitize_window_list(
            mapping["lags"],
            field=f"{field_prefix}.lags",
            min_size=settings.MIN_WINDOW_SIZE,
        )

    if "rolling_windows" in mapping:
        sanitized["rolling_windows"] = _sanitize_window_list(
            mapping["rolling_windows"],
            field=f"{field_prefix}.rolling_windows",
            min_size=max(2, settings.MIN_WINDOW_SIZE),
        )

    return sanitized


def _require_number(value: Any, *, field: str) -> float:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    raise PipelineConfigValidationError("Expected a numeric value", field=field)


def _sanitize_threshold_01(value: Any, *, field: str) -> float:
    threshold = _require_number(value, field=field)
    if threshold < 0 or threshold > 1:
        raise PipelineConfigValidationError(
            "missing_threshold_delete must be between 0 and 1",
            field=field,
        )
    return threshold


def _sanitize_bounded_positive_number(
    value: Any,
    *,
    field: str,
    upper_bound: float,
    label: str,
) -> float:
    number = _require_number(value, field=field)
    if number <= 0 or number > upper_bound:
        raise PipelineConfigValidationError(
            f"{label} must be in (0, {upper_bound}]",
            field=field,
        )
    return number


def _sanitize_outlier_method(value: Any, *, field: str) -> str:
    if value not in _ALLOWED_OUTLIER_METHODS:
        raise PipelineConfigValidationError(
            "Unsupported outlier_method",
            field=field,
        )
    return str(value)


def _sanitize_imputation_window_days(value: Any, *, field: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise PipelineConfigValidationError(
            "imputation_window_days must be an integer",
            field=field,
        )
    if value < 1 or value > settings.MAX_WINDOW_SIZE:
        raise PipelineConfigValidationError(
            "imputation_window_days out of bounds",
            field=field,
        )
    return value


def _sanitize_data_quality_config(
    value: Any,
    *,
    field: str,
) -> dict[str, Any]:
    mapping = _require_mapping(value, field=field)
    sanitized: dict[str, Any] = {}

    _reject_unknown_keys(
        mapping,
        allowed_keys=_ALLOWED_DATA_QUALITY_KEYS,
        field_prefix=field,
        label="data_quality",
    )

    if "dedup_enabled" in mapping:
        sanitized["dedup_enabled"] = _require_bool(
            mapping["dedup_enabled"],
            field=f"{field}.dedup_enabled",
        )

    if "missing_threshold_delete" in mapping:
        sanitized["missing_threshold_delete"] = _sanitize_threshold_01(
            mapping["missing_threshold_delete"],
            field=f"{field}.missing_threshold_delete",
        )

    if "outlier_method" in mapping:
        sanitized["outlier_method"] = _sanitize_outlier_method(
            mapping["outlier_method"],
            field=f"{field}.outlier_method",
        )

    if "outlier_iqr_factor" in mapping:
        sanitized["outlier_iqr_factor"] = _sanitize_bounded_positive_number(
            mapping["outlier_iqr_factor"],
            field=f"{field}.outlier_iqr_factor",
            upper_bound=_MAX_OUTLIER_FACTOR,
            label="outlier_iqr_factor",
        )

    if "outlier_zscore_threshold" in mapping:
        sanitized["outlier_zscore_threshold"] = _sanitize_bounded_positive_number(
            mapping["outlier_zscore_threshold"],
            field=f"{field}.outlier_zscore_threshold",
            upper_bound=_MAX_ZSCORE_THRESHOLD,
            label="outlier_zscore_threshold",
        )

    if "imputation_window_days" in mapping:
        sanitized["imputation_window_days"] = _sanitize_imputation_window_days(
            mapping["imputation_window_days"],
            field=f"{field}.imputation_window_days",
        )

    return sanitized


def _sanitize_feature_booleans(
    mapping: Mapping[str, Any],
    *,
    field_prefix: str,
) -> dict[str, bool]:
    sanitized: dict[str, bool] = {}

    for key in _FEATURE_BOOLEAN_KEYS:
        if key in mapping:
            sanitized[key] = _require_bool(
                mapping[key],
                field=f"{field_prefix}.{key}",
            )

    return sanitized


def sanitize_feature_pipeline_config(
    config: Mapping[str, Any] | None,
) -> dict[str, Any]:
    """Return a validated copy of the runtime pipeline config.

    Unknown keys are preserved for backward compatibility, but the keys that
    directly influence feature expansion are validated and bounded here so they
    cannot trigger DDL/runtime amplification.
    """

    if config is None:
        return {}

    mapping = _require_mapping(config, field="pipeline_config")
    sanitized = dict(mapping)
    sanitized.update(_sanitize_feature_windows(mapping, field_prefix="pipeline_config"))
    sanitized.update(
        _sanitize_feature_booleans(mapping, field_prefix="pipeline_config")
    )

    if "data_quality" in mapping and mapping["data_quality"] is not None:
        sanitized["data_quality"] = _sanitize_data_quality_config(
            mapping["data_quality"],
            field="pipeline_config.data_quality",
        )

    return sanitized


def sanitize_feature_rules_override(
    overrides: Mapping[str, Any] | None,
) -> dict[str, Any] | None:
    """Validate column-level feature overrides used during DDL expansion."""

    if overrides is None:
        return None

    mapping = _require_mapping(overrides, field="rules_override")
    _reject_unknown_keys(
        mapping,
        allowed_keys=_ALLOWED_RULE_OVERRIDE_KEYS,
        field_prefix="rules_override",
        label="rules_override",
    )
    sanitized: dict[str, Any] = _sanitize_feature_windows(
        mapping,
        field_prefix="rules_override",
    )
    sanitized.update(_sanitize_feature_booleans(mapping, field_prefix="rules_override"))
    return sanitized
