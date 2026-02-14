"""MCAR/MAR classification and causal imputation."""

from __future__ import annotations

from typing import Any

from app.services.quality.types import (
    QualityConfig,
    collect_past_group_values,
    collect_past_values,
    iso_week,
    median,
    normalize_date,
    ratio_exceeds_threshold,
)

__all__ = [
    "classify_missing",
    "impute_column",
    "impute_mcar_temporal",
    "impute_mar",
    "impute_mar_grouped",
    "impute_forward_fill",
    "is_mar_temporal",
    "is_mar_group",
    "try_group_ffill",
    "try_group_median",
    "try_global_median",
]


def classify_missing(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str] | None,
) -> str:
    if len(rows) <= 1:
        return "mcar"

    if is_mar_temporal(rows, col_name, temporal_index):
        return "mar"

    if group_by_columns and is_mar_group(rows, col_name, group_by_columns):
        return "mar"

    return "mcar"


def is_mar_temporal(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
) -> bool:
    week_total: dict[tuple[int, int], int] = {}
    week_missing: dict[tuple[int, int], int] = {}

    for row in rows:
        dt = normalize_date(row.get(temporal_index))
        if dt is None:
            continue
        week_key = (dt.year, iso_week(dt))
        week_total[week_key] = week_total.get(week_key, 0) + 1
        if row.get(col_name) is None:
            week_missing[week_key] = week_missing.get(week_key, 0) + 1

    week_rates = [
        week_missing.get(wk, 0) / total for wk, total in week_total.items() if total > 0
    ]

    return ratio_exceeds_threshold(week_rates)


def is_mar_group(
    rows: list[dict[str, Any]],
    col_name: str,
    group_by_columns: list[str],
) -> bool:
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

    return ratio_exceeds_threshold(group_rates)


def impute_column(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str] | None,
    missing_type: str,
    config: QualityConfig,
    overrides: dict[str, Any],
) -> tuple[str, int, int]:
    threshold = overrides.get(
        "missing_threshold_delete", config.missing_threshold_delete
    )
    window_days = overrides.get("imputation_window_days", config.imputation_window_days)

    missing_count = sum(1 for r in rows if r.get(col_name) is None)
    if not rows:
        return "none", 0, 0
    missing_pct = missing_count / len(rows)

    if missing_type == "mcar" and missing_pct < threshold:
        original_len = len(rows)
        rows[:] = [r for r in rows if r.get(col_name) is not None]
        deleted = original_len - len(rows)
        return "delete", 0, deleted

    if missing_type == "mar":
        imputed = impute_mar(
            rows,
            col_name,
            temporal_index,
            group_by_columns,
            window_days,
        )
        strategy = "group_median" if group_by_columns else "ffill"
        return strategy, imputed, 0

    imputed = impute_mcar_temporal(rows, col_name, temporal_index, window_days)
    strategy = "ffill" if imputed > 0 else "rolling_median"
    return strategy, imputed, 0


def impute_mcar_temporal(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    window_days: int,
) -> int:
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

        row_date = normalize_date(row.get(temporal_index))
        if row_date is not None:
            past_vals = collect_past_values(
                rows,
                col_name,
                temporal_index,
                row_date,
                window_days,
            )
            if past_vals:
                median_val = median(past_vals)
                row[col_name] = median_val
                imputed += 1
                last_known = median_val

    return imputed


def impute_mar(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str] | None,
    window_days: int,
) -> int:
    if group_by_columns:
        return impute_mar_grouped(
            rows,
            col_name,
            temporal_index,
            group_by_columns,
            window_days,
        )
    return impute_forward_fill(
        rows,
        col_name,
        temporal_index,
        window_days,
    )


def impute_mar_grouped(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str],
    window_days: int,
) -> int:
    imputed = 0
    group_last: dict[tuple[Any, ...], Any] = {}

    for row in rows:
        group_key = tuple(row.get(g) for g in group_by_columns)
        val = row.get(col_name)

        if val is not None:
            group_last[group_key] = val
            continue

        filled = try_group_ffill(row, col_name, group_key, group_last)
        if not filled:
            filled = try_group_median(
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
            try_global_median(
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


def try_group_ffill(
    row: dict[str, Any],
    col_name: str,
    group_key: tuple[Any, ...],
    group_last: dict[tuple[Any, ...], Any],
) -> bool:
    if group_key in group_last and group_last[group_key] is not None:
        row[col_name] = group_last[group_key]
        return True
    return False


def try_group_median(
    row: dict[str, Any],
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_by_columns: list[str],
    group_key: tuple[Any, ...],
    group_last: dict[tuple[Any, ...], Any],
    window_days: int,
) -> bool:
    row_date = normalize_date(row.get(temporal_index))
    if row_date is None:
        return False
    group_past = collect_past_group_values(
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
    median_val = median(group_past)
    row[col_name] = median_val
    group_last[group_key] = median_val
    return True


def try_global_median(
    row: dict[str, Any],
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    group_key: tuple[Any, ...],
    group_last: dict[tuple[Any, ...], Any],
    window_days: int,
) -> bool:
    row_date = normalize_date(row.get(temporal_index))
    if row_date is None:
        return False
    global_past = collect_past_values(
        rows,
        col_name,
        temporal_index,
        row_date,
        window_days,
    )
    if not global_past:
        return False
    median_val = median(global_past)
    row[col_name] = median_val
    group_last[group_key] = median_val
    return True


def impute_forward_fill(
    rows: list[dict[str, Any]],
    col_name: str,
    temporal_index: str,
    window_days: int,
) -> int:
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

        row_date = normalize_date(row.get(temporal_index))
        if row_date is not None:
            past_vals = collect_past_values(
                rows,
                col_name,
                temporal_index,
                row_date,
                window_days,
            )
            if past_vals:
                median_val = median(past_vals)
                row[col_name] = median_val
                last_known = median_val
                imputed += 1

    return imputed
