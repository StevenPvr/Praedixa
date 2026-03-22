# ruff: noqa: PLR2004
"""Silver-quality and feature-selection helpers for the medallion pipeline."""

from __future__ import annotations

import math
from collections import defaultdict, deque
from datetime import date, timedelta
from typing import Any

from scripts.medallion_pipeline_base import (
    LEGACY_DATASET_PREFIX,
    MISSING_TOKENS,
    MONTHLY_DATASETS,
    BronzeAsset,
    coerce_scalar,
    normalize_identifier,
    parse_date_any,
    to_float,
)
from scripts.medallion_pipeline_bronze import parse_source_rows, resolve_key_columns
from scripts.numpy_helpers import array as np_array
from scripts.numpy_helpers import column_stack as np_column_stack
from scripts.numpy_helpers import corrcoef as np_corrcoef
from scripts.numpy_helpers import eye as np_eye
from scripts.numpy_helpers import median as np_median
from scripts.numpy_helpers import ones as np_ones
from scripts.numpy_helpers import percentile as np_percentile
from scripts.numpy_helpers import solve as np_solve
from scripts.numpy_helpers import std as np_std
from scripts.numpy_helpers import sum_ as np_sum


def month_start(d: date) -> date:
    return d.replace(day=1)


def previous_month_start(d: date) -> date:
    first = month_start(d)
    return month_start(first - timedelta(days=1))


def daterange(start: date, end: date) -> list[date]:
    out: list[date] = []
    current = start
    while current <= end:
        out.append(current)
        current += timedelta(days=1)
    return out


def _merge_silver_metrics(
    source_row: dict[str, Any],
    *,
    metric_prefix: str,
    skip_columns: set[str],
) -> dict[str, Any]:
    metrics: dict[str, Any] = {}
    for col_name, value in source_row.items():
        if col_name in skip_columns:
            continue
        metrics[f"{metric_prefix}{normalize_identifier(col_name)}"] = coerce_scalar(
            value
        )
    return metrics


def _record_site_bounds(
    site_min_max: dict[tuple[str, str], tuple[date, date]],
    client_slug: str,
    site_code: str,
    parsed_date: date,
) -> None:
    existing = site_min_max.get((client_slug, site_code))
    if existing is None:
        site_min_max[(client_slug, site_code)] = (parsed_date, parsed_date)
        return

    low, high = existing
    site_min_max[(client_slug, site_code)] = (
        min(low, parsed_date),
        max(high, parsed_date),
    )


def _ingest_silver_source_row(
    asset: BronzeAsset,
    source_row: dict[str, Any],
    *,
    date_col: str,
    site_code_col: str,
    site_name_col: str | None,
    metric_prefix: str,
    is_monthly: bool,
    skip_columns: set[str],
    daily_rows: dict[tuple[str, str, date], dict[str, Any]],
    monthly_rows: dict[tuple[str, str, date], dict[str, Any]],
    site_names: dict[tuple[str, str], str],
    site_min_max: dict[tuple[str, str], tuple[date, date]],
) -> None:
    raw_date = source_row.get(date_col)
    parsed = parse_date_any(str(raw_date)) if raw_date is not None else None
    if parsed is None:
        return

    site_code = str(source_row.get(site_code_col) or "").strip().upper()
    if not site_code:
        return

    if site_name_col is not None:
        site_name = str(source_row.get(site_name_col) or "").strip()
        if site_name:
            site_names[(asset.client_slug, site_code)] = site_name

    metrics = _merge_silver_metrics(
        source_row,
        metric_prefix=metric_prefix,
        skip_columns=skip_columns,
    )

    if is_monthly:
        key = (asset.client_slug, site_code, month_start(parsed))
        monthly_rows.setdefault(key, {}).update(metrics)
        return

    key = (asset.client_slug, site_code, parsed)
    daily_rows.setdefault(key, {}).update(metrics)
    _record_site_bounds(site_min_max, asset.client_slug, site_code, parsed)


def _ingest_silver_asset(
    asset: BronzeAsset,
    aliases: dict[str, list[str]],
    daily_rows: dict[tuple[str, str, date], dict[str, Any]],
    monthly_rows: dict[tuple[str, str, date], dict[str, Any]],
    site_names: dict[tuple[str, str], str],
    site_min_max: dict[tuple[str, str], tuple[date, date]],
) -> None:
    if asset.dataset.startswith(LEGACY_DATASET_PREFIX):
        raise RuntimeError(
            "Bronze assets must already use canonical dataset names; "
            f"got '{asset.dataset}'"
        )

    source_rows, source_columns = parse_source_rows(asset)
    date_col, site_code_col, site_name_col = resolve_key_columns(
        source_columns,
        asset.dataset,
        aliases,
    )
    metric_prefix = f"{normalize_identifier(asset.dataset)}__"
    is_monthly = asset.dataset in MONTHLY_DATASETS
    skip_columns = {date_col, site_code_col}
    if site_name_col is not None:
        skip_columns.add(site_name_col)

    for source_row in source_rows:
        _ingest_silver_source_row(
            asset,
            source_row,
            date_col=date_col,
            site_code_col=site_code_col,
            site_name_col=site_name_col,
            metric_prefix=metric_prefix,
            is_monthly=is_monthly,
            skip_columns=skip_columns,
            daily_rows=daily_rows,
            monthly_rows=monthly_rows,
            site_names=site_names,
            site_min_max=site_min_max,
        )


def _materialize_silver_rows(
    daily_rows: dict[tuple[str, str, date], dict[str, Any]],
    monthly_rows: dict[tuple[str, str, date], dict[str, Any]],
    site_names: dict[tuple[str, str], str],
    site_min_max: dict[tuple[str, str], tuple[date, date]],
) -> list[dict[str, Any]]:
    dense_keys: list[tuple[str, str, date]] = []
    for (client_slug, site_code), (start, end) in site_min_max.items():
        dense_keys.extend((client_slug, site_code, d) for d in daterange(start, end))

    dense_keys.sort()

    rows: list[dict[str, Any]] = []
    for client_slug, site_code, d in dense_keys:
        dense_row: dict[str, Any] = {
            "client_slug": client_slug,
            "site_code": site_code,
            "site_name": site_names.get((client_slug, site_code)),
            "date": d.isoformat(),
        }
        dense_row.update(daily_rows.get((client_slug, site_code, d), {}))
        dense_row.update(
            monthly_rows.get(
                (client_slug, site_code, previous_month_start(d)),
                {},
            )
        )
        rows.append(dense_row)

    return rows


def build_silver_rows(
    assets: list[BronzeAsset],
    aliases: dict[str, list[str]],
) -> list[dict[str, Any]]:
    daily_rows: dict[tuple[str, str, date], dict[str, Any]] = {}
    monthly_rows: dict[tuple[str, str, date], dict[str, Any]] = {}
    site_names: dict[tuple[str, str], str] = {}
    site_min_max: dict[tuple[str, str], tuple[date, date]] = {}

    for asset in assets:
        _ingest_silver_asset(
            asset,
            aliases,
            daily_rows,
            monthly_rows,
            site_names,
            site_min_max,
        )

    return _materialize_silver_rows(daily_rows, monthly_rows, site_names, site_min_max)


def extract_numeric_columns(rows: list[dict[str, Any]]) -> list[str]:
    numeric_cols: list[str] = []
    if not rows:
        return numeric_cols

    candidates = sorted(
        {k for row in rows for k in row if "__" in k and not k.endswith("_method")}
    )
    for col in candidates:
        values = [to_float(row.get(col)) for row in rows]
        non_null = [v for v in values if v is not None]
        if not non_null:
            continue
        row_has_string = any(
            isinstance(row.get(col), str)
            and to_float(row.get(col)) is None
            and str(row.get(col)).strip().lower() not in MISSING_TOKENS
            for row in rows
        )
        if row_has_string:
            continue
        numeric_cols.append(col)
    return numeric_cols


def _collect_missing_mechanism_rows(
    rows: list[dict[str, Any]],
    column: str,
) -> list[tuple[date, bool, str]]:
    dated_rows: list[tuple[date, bool, str]] = []
    for row in rows:
        d = parse_date_any(row.get("date"))
        if d is None:
            continue
        dated_rows.append(
            (d, to_float(row.get(column)) is None, str(row.get("site_code") or ""))
        )
    return dated_rows


def _accumulate_missing_counts(
    dated_rows: list[tuple[date, bool, str]],
) -> tuple[dict[tuple[int, int], tuple[int, int]], dict[str, tuple[int, int]]]:
    weekly_counts: dict[tuple[int, int], tuple[int, int]] = {}
    site_counts: dict[str, tuple[int, int]] = {}

    for d, is_missing, site in dated_rows:
        week_key = d.isocalendar()[:2]
        total, miss = weekly_counts.get(week_key, (0, 0))
        weekly_counts[week_key] = (total + 1, miss + int(is_missing))

        site_total, site_missing = site_counts.get(site, (0, 0))
        site_counts[site] = (site_total + 1, site_missing + int(is_missing))

    return weekly_counts, site_counts


def _has_strong_rate_gap(counts: dict[Any, tuple[int, int]]) -> bool:
    rates = [miss / total for total, miss in counts.values() if total > 0]
    positive_rates = [rate for rate in rates if rate > 0]
    if len(positive_rates) < 2:
        return False
    low = min(positive_rates)
    high = max(positive_rates)
    return low > 0 and (high / low) > 3.0


def classify_missing_mechanism(
    rows: list[dict[str, Any]],
    column: str,
) -> str:
    dated_rows = _collect_missing_mechanism_rows(rows, column)
    if not dated_rows:
        return "mcar"

    missing_total = sum(1 for _d, is_missing, _site in dated_rows if is_missing)
    if missing_total == 0:
        return "none"

    weekly_counts, site_counts = _accumulate_missing_counts(dated_rows)
    if _has_strong_rate_gap(weekly_counts) or _has_strong_rate_gap(site_counts):
        return "mar"
    return "mcar"


def get_group_indices(rows: list[dict[str, Any]]) -> dict[tuple[str, str], list[int]]:
    groups: dict[tuple[str, str], list[int]] = defaultdict(list)
    for idx, row in enumerate(rows):
        groups[
            (str(row.get("client_slug") or ""), str(row.get("site_code") or ""))
        ].append(idx)
    return groups


def get_client_indices(rows: list[dict[str, Any]]) -> dict[str, list[int]]:
    clients: dict[str, list[int]] = defaultdict(list)
    for idx, row in enumerate(rows):
        clients[str(row.get("client_slug") or "")].append(idx)
    return clients


def _select_usable_causal_predictors(
    current_row: dict[str, Any],
    target_col: str,
    predictor_cols: list[str],
) -> list[str]:
    usable_predictors: list[str] = []
    for col in predictor_cols:
        if col == target_col:
            continue
        if col.endswith(("__imputed", "__outlier_clamped")):
            continue
        if to_float(current_row.get(col)) is None:
            continue
        usable_predictors.append(col)
    return usable_predictors


def _collect_causal_xy(
    rows: list[dict[str, Any]],
    current_idx: int,
    target_col: str,
    predictor: str,
    candidate_indices: list[int],
) -> list[tuple[float, float]]:
    xy: list[tuple[float, float]] = []
    for idx in candidate_indices:
        if idx >= current_idx:
            continue
        y = to_float(rows[idx].get(target_col))
        x = to_float(rows[idx].get(predictor))
        if y is None or x is None:
            continue
        xy.append((x, y))
    return xy


def _score_single_causal_predictor(
    rows: list[dict[str, Any]],
    current_idx: int,
    target_col: str,
    predictor: str,
    candidate_indices: list[int],
    *,
    min_samples: int,
) -> tuple[float, str] | None:
    xy = _collect_causal_xy(
        rows,
        current_idx,
        target_col,
        predictor,
        candidate_indices,
    )
    if len(xy) < min_samples:
        return None

    x_arr = np_array([v[0] for v in xy], dtype=float)
    y_arr = np_array([v[1] for v in xy], dtype=float)
    if np_std(x_arr) < 1e-9 or np_std(y_arr) < 1e-9:
        return None

    corr = float(np_corrcoef(x_arr, y_arr)[0, 1])
    if math.isnan(corr):
        return None

    return abs(corr), predictor


def _score_causal_predictors(
    rows: list[dict[str, Any]],
    current_idx: int,
    target_col: str,
    predictor_cols: list[str],
    candidate_indices: list[int],
    *,
    min_samples: int,
) -> list[tuple[float, str]]:
    correlations: list[tuple[float, str]] = []
    for predictor in predictor_cols:
        scored = _score_single_causal_predictor(
            rows,
            current_idx,
            target_col,
            predictor,
            candidate_indices,
            min_samples=min_samples,
        )
        if scored is not None:
            correlations.append(scored)

    correlations.sort(reverse=True)
    return correlations


def _build_causal_ridge_training_data(
    rows: list[dict[str, Any]],
    current_idx: int,
    target_col: str,
    selected: list[str],
    candidate_indices: list[int],
    *,
    min_samples: int,
) -> tuple[list[list[float]], list[float]] | None:
    x_train: list[list[float]] = []
    y_train: list[float] = []
    for idx in candidate_indices:
        if idx >= current_idx:
            continue
        y = to_float(rows[idx].get(target_col))
        if y is None:
            continue

        row_values: list[float] = []
        for col in selected:
            x = to_float(rows[idx].get(col))
            if x is None:
                break
            row_values.append(x)
        else:
            x_train.append(row_values)
            y_train.append(y)

    if len(y_train) < min_samples:
        return None
    return x_train, y_train


def _solve_causal_ridge_prediction(
    current_row: dict[str, Any],
    selected: list[str],
    x_train: list[list[float]],
    y_train: list[float],
    *,
    ridge_alpha: float,
) -> tuple[float | None, float]:
    x_matrix = np_array(x_train, dtype=float)
    y_vector = np_array(y_train, dtype=float)

    x_aug = np_column_stack((np_ones(len(x_matrix)), x_matrix))
    lhs = x_aug.T @ x_aug
    lhs += ridge_alpha * np_eye(lhs.shape[0])
    rhs = x_aug.T @ y_vector

    try:
        beta = np_solve(lhs, rhs)
    except ValueError:
        return None, 0.0

    pred_features = [to_float(current_row.get(col)) for col in selected]
    pred_features_clean = [value for value in pred_features if value is not None]
    if len(pred_features_clean) != len(selected):
        return None, 0.0

    x_current = np_array([1.0, *pred_features_clean], dtype=float)
    predicted = float(x_current @ beta)

    y_hat = x_aug @ beta
    residual = float(np_sum((y_vector - y_hat) ** 2))
    total = float(np_sum((y_vector - y_vector.mean()) ** 2))
    r2 = 0.0 if total < 1e-9 else max(0.0, 1.0 - residual / total)

    return predicted, r2


def _collect_hierarchical_history(
    rows: list[dict[str, Any]],
    current_idx: int,
    column: str,
    indices: list[int],
    current_date: date,
    *,
    same_dow: bool,
    window_days: int,
) -> list[float]:
    out: list[float] = []
    for idx in indices:
        if idx >= current_idx:
            continue
        d = parse_date_any(rows[idx].get("date"))
        if d is None:
            continue
        if d >= current_date:
            continue
        if d < current_date - timedelta(days=window_days):
            continue
        if same_dow and d.weekday() != current_date.weekday():
            continue
        v = to_float(rows[idx].get(column))
        if v is not None:
            out.append(v)
    return out


def _clamp_history_value(
    rolling_history: deque[float],
    value: float,
) -> tuple[float, bool]:
    if len(rolling_history) < 14:
        return value, False

    arr = np_array(rolling_history, dtype=float)
    median = float(np_median(arr))
    mad = float(np_median(abs(arr - median)))
    if mad <= 1e-9:
        return value, False

    scale = 1.4826 * mad
    low = median - 4.5 * scale
    high = median + 4.5 * scale
    if low <= value <= high:
        return value, False

    return max(low, min(high, value)), True


def _clamp_group_outliers(
    rows: list[dict[str, Any]],
    column: str,
    indices: list[int],
) -> int:
    rolling_history: deque[float] = deque(maxlen=56)
    clamped_count = 0

    for idx in indices:
        value = to_float(rows[idx].get(column))
        if value is None:
            continue

        clamped_value, was_clamped = _clamp_history_value(rolling_history, value)
        if was_clamped:
            rows[idx][column] = clamped_value
            rows[idx][f"{column}__outlier_clamped"] = True
            clamped_count += 1

        rolling_history.append(clamped_value)

    return clamped_count


def attempt_causal_ridge(
    rows: list[dict[str, Any]],
    current_idx: int,
    target_col: str,
    predictor_cols: list[str],
    candidate_indices: list[int],
    *,
    max_predictors: int = 6,
    min_samples: int = 40,
    ridge_alpha: float = 1.0,
) -> tuple[float | None, float]:
    current_row = rows[current_idx]
    usable_predictors = _select_usable_causal_predictors(
        current_row,
        target_col,
        predictor_cols,
    )
    if len(usable_predictors) < 2:
        return None, 0.0

    correlations = _score_causal_predictors(
        rows,
        current_idx,
        target_col,
        usable_predictors,
        candidate_indices,
        min_samples=min_samples,
    )
    selected = [name for _score, name in correlations[:max_predictors]]
    if len(selected) < 2:
        return None, 0.0

    training_data = _build_causal_ridge_training_data(
        rows,
        current_idx,
        target_col,
        selected,
        candidate_indices,
        min_samples=min_samples,
    )
    if training_data is None:
        return None, 0.0

    x_train, y_train = training_data
    return _solve_causal_ridge_prediction(
        current_row,
        selected,
        x_train,
        y_train,
        ridge_alpha=ridge_alpha,
    )


def hierarchical_median_impute(
    rows: list[dict[str, Any]],
    current_idx: int,
    column: str,
    group_indices: dict[tuple[str, str], list[int]],
    client_indices: dict[str, list[int]],
    *,
    window_days: int = 56,
) -> float | None:
    row = rows[current_idx]
    current_date = parse_date_any(row.get("date"))
    if current_date is None:
        return None

    client = str(row.get("client_slug") or "")
    site = str(row.get("site_code") or "")

    group_key = (client, site)
    site_indices = group_indices.get(group_key, [])
    same_dow = _collect_hierarchical_history(
        rows,
        current_idx,
        column,
        site_indices,
        current_date,
        same_dow=True,
        window_days=window_days,
    )
    if same_dow:
        return float(np_median(same_dow))

    site_values = _collect_hierarchical_history(
        rows,
        current_idx,
        column,
        site_indices,
        current_date,
        same_dow=False,
        window_days=window_days,
    )
    if site_values:
        return float(np_median(site_values))

    client_values = _collect_hierarchical_history(
        rows,
        current_idx,
        column,
        client_indices.get(client, []),
        current_date,
        same_dow=False,
        window_days=window_days,
    )
    if client_values:
        return float(np_median(client_values))

    return None


def clip_to_history(
    rows: list[dict[str, Any]],
    current_idx: int,
    column: str,
    history_indices: list[int],
    value: float,
) -> float:
    hist: list[float] = []
    for idx in history_indices:
        if idx >= current_idx:
            continue
        v = to_float(rows[idx].get(column))
        if v is not None:
            hist.append(v)

    if len(hist) < 20:
        return value

    low = float(np_percentile(hist, 1.0))
    high = float(np_percentile(hist, 99.0))
    return max(low, min(high, value))


def _seed_quality_column_flags(rows: list[dict[str, Any]], column: str) -> None:
    for row in rows:
        row.setdefault(f"{column}__imputed", False)
        row.setdefault(f"{column}__imputation_method", None)
        row.setdefault(f"{column}__outlier_clamped", False)


def _compute_quality_column_missing_stats(
    rows: list[dict[str, Any]],
    column: str,
) -> tuple[float, str]:
    values = [to_float(row.get(column)) for row in rows]
    missing_rate = sum(1 for value in values if value is None) / max(len(values), 1)
    return missing_rate, classify_missing_mechanism(rows, column)


def _predict_quality_imputation(
    rows: list[dict[str, Any]],
    current_idx: int,
    column: str,
    numeric_cols: list[str],
    group_indices: dict[tuple[str, str], list[int]],
    client_indices: dict[str, list[int]],
    *,
    missing_rate: float,
    mechanism: str,
) -> tuple[float | None, str | None]:
    if missing_rate > 0.30:
        return None, None

    client = str(rows[current_idx].get("client_slug") or "")
    site = str(rows[current_idx].get("site_code") or "")
    site_history_indices = group_indices.get((client, site), [])

    if missing_rate >= 0.05 or mechanism == "mar":
        predicted, score = attempt_causal_ridge(
            rows,
            current_idx,
            column,
            numeric_cols,
            site_history_indices,
        )
        if predicted is not None:
            predicted = clip_to_history(
                rows,
                current_idx,
                column,
                site_history_indices,
                predicted,
            )
            method = "causal_ridge" if score >= 0.15 else "causal_ridge_low_conf"
            return predicted, method

    predicted = hierarchical_median_impute(
        rows,
        current_idx,
        column,
        group_indices,
        client_indices,
    )
    if predicted is not None:
        return predicted, "hierarchical_median"

    return None, None


def _impute_quality_column(
    rows: list[dict[str, Any]],
    column: str,
    numeric_cols: list[str],
    group_indices: dict[tuple[str, str], list[int]],
    client_indices: dict[str, list[int]],
    *,
    missing_rate: float,
    mechanism: str,
) -> tuple[int, int]:
    imputed_count = 0
    unresolved_count = 0

    for idx, row in enumerate(rows):
        if to_float(row.get(column)) is not None:
            continue

        predicted, method = _predict_quality_imputation(
            rows,
            idx,
            column,
            numeric_cols,
            group_indices,
            client_indices,
            missing_rate=missing_rate,
            mechanism=mechanism,
        )
        if predicted is None:
            unresolved_count += 1
            continue

        row[column] = predicted
        row[f"{column}__imputed"] = True
        row[f"{column}__imputation_method"] = method
        imputed_count += 1

    return imputed_count, unresolved_count


def _clamp_quality_outliers(
    rows: list[dict[str, Any]],
    column: str,
    group_indices: dict[tuple[str, str], list[int]],
) -> int:
    clamped_count = 0
    for indices in group_indices.values():
        clamped_count += _clamp_group_outliers(rows, column, indices)

    return clamped_count


def _store_quality_column_summary(
    quality_summary: dict[str, Any],
    column: str,
    *,
    missing_rate: float,
    mechanism: str,
    imputed_count: int,
    unresolved_count: int,
    clamped_count: int,
) -> None:
    quality_summary["columns"][column] = {
        "missing_rate": round(missing_rate, 6),
        "missing_mechanism": mechanism,
        "imputed_count": imputed_count,
        "unresolved_missing_count": unresolved_count,
        "outliers_clamped": clamped_count,
    }


def apply_silver_quality(
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    sorted_rows = sorted(
        rows,
        key=lambda r: (
            str(r.get("client_slug") or ""),
            str(r.get("site_code") or ""),
            str(r.get("date") or ""),
        ),
    )
    numeric_cols = extract_numeric_columns(sorted_rows)
    group_indices = get_group_indices(sorted_rows)
    client_indices = get_client_indices(sorted_rows)

    quality_summary: dict[str, Any] = {"columns": {}}

    for col in numeric_cols:
        _seed_quality_column_flags(sorted_rows, col)
        missing_rate, mechanism = _compute_quality_column_missing_stats(
            sorted_rows,
            col,
        )
        imputed_count, unresolved_count = _impute_quality_column(
            sorted_rows,
            col,
            numeric_cols,
            group_indices,
            client_indices,
            missing_rate=missing_rate,
            mechanism=mechanism,
        )
        clamped_count = _clamp_quality_outliers(sorted_rows, col, group_indices)
        _store_quality_column_summary(
            quality_summary,
            col,
            missing_rate=missing_rate,
            mechanism=mechanism,
            imputed_count=imputed_count,
            unresolved_count=unresolved_count,
            clamped_count=clamped_count,
        )

    return sorted_rows, quality_summary
