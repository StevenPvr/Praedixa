"""Data quality types, constants and helpers."""

from __future__ import annotations

import contextlib
import datetime
import math
from dataclasses import asdict, dataclass, field
from typing import Any

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


def _empty_overrides() -> dict[str, dict[str, Any]]:
    return {}


SYSTEM_COLUMNS: frozenset[str] = frozenset({"_row_id", "_ingested_at", "_batch_id"})
MAR_RATIO_THRESHOLD: float = 3.0
MIN_RATE_BUCKETS: int = 2
MIN_VALUES_FOR_OUTLIERS: int = 4
MAX_DAY_VALUE: int = 31
DATE_PARTS: int = 3


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
    column_overrides: dict[str, dict[str, Any]] = field(
        default_factory=_empty_overrides
    )


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


def normalize_date(value: Any) -> datetime.date | None:
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
    normalized = normalize_date(value)
    if normalized is None:
        return (1, datetime.date.max)
    return (0, normalized)


def parse_date_string(value: str) -> datetime.date | None:
    try:
        return datetime.date.fromisoformat(value[:10])
    except (ValueError, IndexError):
        pass
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
    return dt.isocalendar()[1]


def collect_past_values(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    current_date: datetime.date,
    window_days: int,
) -> list[float]:
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
    cutoff = current_date - datetime.timedelta(days=window_days)
    result: list[float] = []

    for row in rows:
        row_date = normalize_date(row.get(temporal_index))
        if row_date is None or row_date >= current_date:
            continue
        if row_date < cutoff:
            continue

        row_group = tuple(row.get(g) for g in group_by_columns)
        if row_group != group_key:
            continue

        val = row.get(col_name)
        if val is not None:
            with contextlib.suppress(TypeError, ValueError):
                result.append(float(val))

    return result


def ratio_exceeds_threshold(rates: list[float]) -> bool:
    nonzero = [r for r in rates if r > 0.0]
    if len(nonzero) < MIN_RATE_BUCKETS or len(rates) < MIN_RATE_BUCKETS:
        return False
    min_rate = min(nonzero)
    max_rate = max(nonzero)
    return min_rate > 0.0 and max_rate / min_rate > MAR_RATIO_THRESHOLD


def iqr_bounds(values: list[float], factor: float) -> tuple[float, float] | None:
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
    n = len(sorted_values)
    if n == 1:
        return sorted_values[0]
    idx = p * (n - 1)
    lower_idx = math.floor(idx)
    upper_idx = min(lower_idx + 1, n - 1)
    fraction = idx - lower_idx

    return sorted_values[lower_idx] + fraction * (
        sorted_values[upper_idx] - sorted_values[lower_idx]
    )


def median(values: list[Any]) -> float:
    numeric = sorted(float(v) for v in values)
    n = len(numeric)
    if n == 0:
        return 0.0
    mid = n // 2
    if n % 2 == 0:
        return (numeric[mid - 1] + numeric[mid]) / 2.0
    return numeric[mid]


def config_to_dict(config: QualityConfig) -> dict[str, Any]:
    return asdict(config)
