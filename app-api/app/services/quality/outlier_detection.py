"""Stage 4: Outlier detection and clamping for numeric columns.

Uses either IQR or z-score method. Computes statistics on all
available (non-None) values.
"""

from __future__ import annotations

import contextlib
from typing import Any

from app.services.quality.types import (
    MIN_VALUES_FOR_OUTLIERS,
    QualityConfig,
    iqr_bounds,
    zscore_bounds,
)

__all__ = [
    "detect_and_clamp_outliers",
    "compute_outlier_bounds",
    "clamp_values",
]


def detect_and_clamp_outliers(
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
    bounds = compute_outlier_bounds(
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

    return clamp_values(rows, col_name, bounds, method)


def compute_outlier_bounds(
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

    if len(values) < MIN_VALUES_FOR_OUTLIERS:
        return None

    if method == "zscore":
        return zscore_bounds(values, zscore_threshold)
    return iqr_bounds(values, iqr_factor)


def clamp_values(
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
