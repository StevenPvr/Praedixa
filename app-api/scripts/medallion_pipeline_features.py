# ruff: noqa: PLR2004, E501
"""External features and Gold export helpers for the medallion pipeline."""

from __future__ import annotations

import json
import math
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict, deque
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from scripts.medallion_pipeline_base import (
    LEGACY_RUNTIME_COLUMN_PREFIX,
    VALID_SCHOOL_ZONES,
    load_json,
    normalize_identifier,
    parse_date_any,
    to_float,
    write_json,
)
from scripts.medallion_pipeline_quality import extract_numeric_columns
from scripts.numpy_helpers import array as np_array
from scripts.numpy_helpers import mean as np_mean
from scripts.numpy_helpers import std as np_std


def load_site_locations(path: Path) -> dict[tuple[str, str], dict[str, Any]]:
    payload = load_json(path, {})
    out: dict[tuple[str, str], dict[str, Any]] = {}
    for client_slug, sites in payload.items():
        if not isinstance(sites, dict):
            continue
        for site_code, meta in sites.items():
            if not isinstance(meta, dict):
                continue
            out[(str(client_slug), str(site_code).upper())] = meta
    return out


def fetch_json(url: str) -> dict[str, Any] | None:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https":
        return None
    req = urllib.request.Request(  # noqa: S310
        url,
        headers={"User-Agent": "praedixa-medallion/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:  # noqa: S310  # nosec B310
            data = response.read()
            payload = json.loads(data.decode("utf-8"))
            return payload if isinstance(payload, dict) else None
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None


def fetch_weather_series(
    lat: float,
    lon: float,
    start: date,
    end: date,
    cache_file: Path,
) -> dict[str, dict[str, float | None]]:
    if cache_file.exists():
        cached = load_json(cache_file, {})
        if (
            isinstance(cached, dict)
            and cached.get("start") == start.isoformat()
            and cached.get("end") == end.isoformat()
            and isinstance(cached.get("data"), dict)
        ):
            data = cached["data"]
            return {
                str(day): values if isinstance(values, dict) else {}
                for day, values in data.items()
            }

    query = urllib.parse.urlencode(
        {
            "latitude": lat,
            "longitude": lon,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "daily": "temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
            "timezone": "Europe/Paris",
        }
    )
    url = f"https://archive-api.open-meteo.com/v1/archive?{query}"
    payload = fetch_json(url)
    if payload is None:
        return {}

    daily = payload.get("daily")
    if not isinstance(daily, dict):
        return {}

    times = daily.get("time", [])
    out: dict[str, dict[str, float | None]] = {}
    for i, day in enumerate(times):
        out[str(day)] = {
            "weather_temp_mean_c": _safe_index_float(
                daily.get("temperature_2m_mean", []), i
            ),
            "weather_temp_max_c": _safe_index_float(
                daily.get("temperature_2m_max", []), i
            ),
            "weather_temp_min_c": _safe_index_float(
                daily.get("temperature_2m_min", []), i
            ),
            "weather_precip_mm": _safe_index_float(
                daily.get("precipitation_sum", []), i
            ),
            "weather_wind_max_kmh": _safe_index_float(
                daily.get("wind_speed_10m_max", []), i
            ),
        }

    write_json(
        cache_file,
        {"start": start.isoformat(), "end": end.isoformat(), "data": out},
    )
    return out


def _safe_index_float(values: Any, idx: int) -> float | None:
    if not isinstance(values, list):
        return None
    if idx >= len(values):
        return None
    val = values[idx]
    return to_float(val)


def _load_school_holiday_intervals_from_cache(
    cache_file: Path,
) -> list[tuple[date, date, str]] | None:
    if not cache_file.exists():
        return None

    cached = load_json(cache_file, [])
    if not isinstance(cached, list):
        return []

    out: list[tuple[date, date, str]] = []
    for row in cached:
        try:
            out.append(
                (
                    date.fromisoformat(row["start"]),
                    date.fromisoformat(row["end"]),
                    str(row["label"]),
                )
            )
        except (KeyError, ValueError, TypeError):
            continue
    return out


def _build_school_holiday_query_url(normalized_zone: str, year: int) -> str:
    where = (
        f'zones like "%{normalized_zone}%" and '
        f'start_date < date"{year + 1}-01-01" and '
        f'end_date >= date"{year}-01-01"'
    )
    query = urllib.parse.urlencode(
        {
            "select": "start_date,end_date,description,zones",
            "where": where,
            "limit": "500",
        }
    )
    return (
        "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/"
        f"fr-en-calendrier-scolaire/records?{query}"
    )


def _parse_school_holiday_record(
    rec: Any,
    timezone: ZoneInfo,
) -> tuple[date, date, str] | None:
    if not isinstance(rec, dict):
        return None

    start_raw = rec.get("start_date")
    end_raw = rec.get("end_date")
    label = str(rec.get("description") or "vacances")
    if not isinstance(start_raw, str) or not isinstance(end_raw, str):
        return None

    try:
        start_dt = datetime.fromisoformat(start_raw)
        end_dt = datetime.fromisoformat(end_raw)
    except ValueError:
        return None

    start_local = start_dt.astimezone(timezone).date()
    end_local_exclusive = end_dt.astimezone(timezone).date()
    if end_local_exclusive <= start_local:
        return None
    return start_local, end_local_exclusive, label


def _fetch_school_holiday_intervals_for_year(
    normalized_zone: str,
    year: int,
    timezone: ZoneInfo,
) -> list[tuple[date, date, str]]:
    payload = fetch_json(_build_school_holiday_query_url(normalized_zone, year))
    if payload is None:
        return []

    results = payload.get("results", [])
    if not isinstance(results, list):
        return []

    intervals: list[tuple[date, date, str]] = []
    for rec in results:
        parsed = _parse_school_holiday_record(rec, timezone)
        if parsed is not None:
            intervals.append(parsed)
    return intervals


def fetch_school_holiday_intervals(
    zone: str,
    years: set[int],
    cache_file: Path,
) -> list[tuple[date, date, str]]:
    normalized_zone = normalize_school_zone(zone)
    if normalized_zone is None:
        return []

    cached_intervals = _load_school_holiday_intervals_from_cache(cache_file)
    if cached_intervals is not None:
        return cached_intervals

    timezone = ZoneInfo("Europe/Paris")
    intervals: list[tuple[date, date, str]] = []

    for year in sorted(years):
        intervals.extend(
            _fetch_school_holiday_intervals_for_year(
                normalized_zone,
                year,
                timezone,
            )
        )

    serializable = [
        {"start": start.isoformat(), "end": end.isoformat(), "label": label}
        for start, end, label in intervals
    ]
    write_json(cache_file, serializable)
    return intervals


def add_calendar_features(rows: list[dict[str, Any]]) -> None:
    for row in rows:
        d = parse_date_any(row.get("date"))
        if d is None:
            continue

        dow = d.weekday()
        month_num = d.month
        doy = d.timetuple().tm_yday

        row["cal_year"] = d.year
        row["cal_month"] = month_num
        row["cal_day"] = d.day
        row["cal_weekday"] = dow
        row["cal_weekofyear"] = d.isocalendar()[1]
        row["cal_quarter"] = ((month_num - 1) // 3) + 1
        row["cal_dayofyear"] = doy
        row["cal_is_weekend"] = dow >= 5
        row["cal_is_month_start"] = d.day == 1
        next_day = d + timedelta(days=1)
        row["cal_is_month_end"] = next_day.month != d.month

        row["cal_weekday_sin"] = round(math.sin(2 * math.pi * dow / 7), 6)
        row["cal_weekday_cos"] = round(math.cos(2 * math.pi * dow / 7), 6)
        row["cal_month_sin"] = round(math.sin(2 * math.pi * month_num / 12), 6)
        row["cal_month_cos"] = round(math.cos(2 * math.pi * month_num / 12), 6)
        row["cal_dayofyear_sin"] = round(math.sin(2 * math.pi * doy / 366), 6)
        row["cal_dayofyear_cos"] = round(math.cos(2 * math.pi * doy / 366), 6)


def normalize_school_zone(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    if not normalized:
        return None
    return VALID_SCHOOL_ZONES.get(normalized)


def add_external_features(
    rows: list[dict[str, Any]],
    site_locations: dict[tuple[str, str], dict[str, Any]],
    cache_root: Path,
) -> None:
    if not rows:
        return

    dated_values = _collect_dated_values(rows)
    if not dated_values:
        return
    min_date = min(dated_values)
    max_date = max(dated_values)

    weather_cache_root = cache_root / "weather"
    holidays_cache_root = cache_root / "school_holidays"
    weather_cache_root.mkdir(parents=True, exist_ok=True)
    holidays_cache_root.mkdir(parents=True, exist_ok=True)

    zone_years = _collect_zone_years(rows, site_locations)
    holiday_intervals_by_zone = _load_holiday_intervals_by_zone(
        zone_years,
        holidays_cache_root,
    )
    weather_by_site = _load_weather_series_by_site(
        site_locations,
        weather_cache_root,
        min_date,
        max_date,
    )

    _apply_external_features(
        rows,
        site_locations,
        weather_by_site=weather_by_site,
        holiday_intervals_by_zone=holiday_intervals_by_zone,
    )


def _collect_dated_values(rows: list[dict[str, Any]]) -> list[date]:
    return [
        parsed_date
        for row in rows
        for parsed_date in [parse_date_any(row.get("date"))]
        if parsed_date is not None
    ]


def _collect_zone_years(
    rows: list[dict[str, Any]],
    site_locations: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, set[int]]:
    zone_years: dict[str, set[int]] = defaultdict(set)
    for row in rows:
        d = parse_date_any(row.get("date"))
        if d is None:
            continue
        key = (str(row.get("client_slug") or ""), str(row.get("site_code") or ""))
        metadata = site_locations.get(key, {})
        zone = normalize_school_zone(metadata.get("school_zone"))
        if zone:
            zone_years[zone].add(d.year)
    return zone_years


def _load_holiday_intervals_by_zone(
    zone_years: dict[str, set[int]],
    holidays_cache_root: Path,
) -> dict[str, list[tuple[date, date, str]]]:
    holiday_intervals_by_zone: dict[str, list[tuple[date, date, str]]] = {}
    for zone, years in zone_years.items():
        cache_file = holidays_cache_root / f"{normalize_identifier(zone)}.json"
        holiday_intervals_by_zone[zone] = fetch_school_holiday_intervals(
            zone,
            years,
            cache_file,
        )
    return holiday_intervals_by_zone


def _load_weather_series_by_site(
    site_locations: dict[tuple[str, str], dict[str, Any]],
    weather_cache_root: Path,
    min_date: date,
    max_date: date,
) -> dict[tuple[str, str], dict[str, dict[str, float | None]]]:
    weather_by_site: dict[tuple[str, str], dict[str, dict[str, float | None]]] = {}
    for key, metadata in site_locations.items():
        lat = to_float(metadata.get("lat"))
        lon = to_float(metadata.get("lon"))
        if lat is None or lon is None:
            continue
        cache_file = (
            weather_cache_root
            / f"{normalize_identifier(key[0])}_{normalize_identifier(key[1])}.json"
        )
        weather_by_site[key] = fetch_weather_series(
            lat,
            lon,
            min_date,
            max_date,
            cache_file,
        )
    return weather_by_site


def _apply_external_features(
    rows: list[dict[str, Any]],
    site_locations: dict[tuple[str, str], dict[str, Any]],
    *,
    weather_by_site: dict[tuple[str, str], dict[str, dict[str, float | None]]],
    holiday_intervals_by_zone: dict[str, list[tuple[date, date, str]]],
) -> None:
    for row in rows:
        _apply_external_features_row(
            row,
            site_locations,
            weather_by_site=weather_by_site,
            holiday_intervals_by_zone=holiday_intervals_by_zone,
        )


def _apply_external_features_row(
    row: dict[str, Any],
    site_locations: dict[tuple[str, str], dict[str, Any]],
    *,
    weather_by_site: dict[tuple[str, str], dict[str, dict[str, float | None]]],
    holiday_intervals_by_zone: dict[str, list[tuple[date, date, str]]],
) -> None:
    client = str(row.get("client_slug") or "")
    site = str(row.get("site_code") or "")
    d = parse_date_any(row.get("date"))
    if d is None:
        return

    key = (client, site)
    weather = weather_by_site.get(key, {}).get(d.isoformat())
    if weather:
        row.update(weather)

    metadata = site_locations.get(key, {})
    zone = normalize_school_zone(metadata.get("school_zone"))
    row["school_zone"] = zone or None
    row["is_school_holiday"] = False
    row["school_holiday_label"] = None

    if zone and zone in holiday_intervals_by_zone:
        for start, end_exclusive, label in holiday_intervals_by_zone[zone]:
            if start <= d < end_exclusive:
                row["is_school_holiday"] = True
                row["school_holiday_label"] = label
                break


def add_lag_rolling_features(
    rows: list[dict[str, Any]], candidate_columns: list[str]
) -> None:
    if not rows:
        return

    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[
            (str(row.get("client_slug") or ""), str(row.get("site_code") or ""))
        ].append(row)

    lags = [1, 7, 14, 28]
    windows = [7, 14, 28]

    for group_rows in grouped.values():
        _apply_lag_rolling_features_to_group(
            group_rows,
            candidate_columns,
            lags=lags,
            windows=windows,
        )


def _apply_lag_rolling_features_to_group(
    group_rows: list[dict[str, Any]],
    candidate_columns: list[str],
    *,
    lags: list[int],
    windows: list[int],
) -> None:
    group_rows.sort(key=lambda r: str(r.get("date") or ""))

    history: dict[str, deque[float | None]] = {
        col: deque(maxlen=90) for col in candidate_columns
    }

    for row in group_rows:
        _apply_lag_rolling_features_for_row(
            row,
            candidate_columns,
            history,
            lags=lags,
            windows=windows,
        )


def _apply_lag_rolling_features_for_row(
    row: dict[str, Any],
    candidate_columns: list[str],
    history: dict[str, deque[float | None]],
    *,
    lags: list[int],
    windows: list[int],
) -> None:
    for col in candidate_columns:
        hist_values = list(history[col])
        non_null_hist = [v for v in hist_values if v is not None]

        _apply_lag_values_for_column(row, col, hist_values, lags)
        _apply_rolling_values_for_column(row, col, non_null_hist, windows)

    for col in candidate_columns:
        history[col].append(to_float(row.get(col)))


def _apply_lag_values_for_column(
    row: dict[str, Any],
    col: str,
    hist_values: list[float | None],
    lags: list[int],
) -> None:
    for lag in lags:
        feature_col = f"{col}__lag_{lag}"
        row[feature_col] = hist_values[-lag] if len(hist_values) >= lag else None


def _apply_rolling_values_for_column(
    row: dict[str, Any],
    col: str,
    non_null_hist: list[float],
    windows: list[int],
) -> None:
    for window in windows:
        roll_mean_col = f"{col}__rolling_mean_{window}"
        roll_std_col = f"{col}__rolling_std_{window}"
        if len(non_null_hist) >= window:
            segment = np_array(non_null_hist[-window:], dtype=float)
            row[roll_mean_col] = float(np_mean(segment))
            row[roll_std_col] = float(np_std(segment))
        else:
            row[roll_mean_col] = None
            row[roll_std_col] = None


def select_gold_feature_columns(rows: list[dict[str, Any]]) -> list[str]:
    preferred = [
        "operations_daily__orders_received",
        "operations_daily__orders_processed",
        "operations_daily__backlog_orders",
        "workforce_daily__required_fte",
        "workforce_daily__absent_fte",
        "workforce_daily__present_fte",
        "labor_cost_daily__total_labor_cost_eur",
        "forecasts_daily__forecasted_orders",
        "forecasts_daily__predicted_required_fte",
    ]

    available = {k for row in rows for k in row}
    selected = [col for col in preferred if col in available]
    if selected:
        return selected

    numeric_cols = extract_numeric_columns(rows)
    return numeric_cols[:8]


def split_gold_features_and_quality_metadata(
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    legacy_runtime_columns = sorted(
        {
            key
            for row in rows
            for key in row
            if key.startswith(LEGACY_RUNTIME_COLUMN_PREFIX)
        }
    )
    if legacy_runtime_columns:
        raise RuntimeError(
            "Gold features must use canonical runtime column names; "
            f"found: {', '.join(legacy_runtime_columns)}"
        )

    key_columns = {"client_slug", "site_code", "site_name", "date"}
    quality_suffixes = ("__imputation_method", "__imputed", "__outlier_clamped")

    feature_rows: list[dict[str, Any]] = []
    removed_columns: set[str] = set()

    for row in rows:
        clean_row: dict[str, Any] = {}
        for key, value in row.items():
            if key in key_columns:
                clean_row[key] = value
                continue
            if key.endswith(quality_suffixes):
                removed_columns.add(key)
                continue
            clean_row[key] = value
        feature_rows.append(clean_row)

    return feature_rows, sorted(removed_columns)


def write_csv_rows(path: Path, rows: list[dict[str, Any]]) -> None:
    import csv

    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        with path.open("w", encoding="utf-8", newline="") as handle:
            handle.write("")
        return

    key_order = ["client_slug", "site_code", "site_name", "date"]
    all_fields = sorted({k for row in rows for k in row if k not in key_order})
    fields = [*key_order, *all_fields]

    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
