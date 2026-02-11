# ruff: noqa: PLR0911, PLR0912, PLR0915, PLR2004, T201, E501
"""Metadata-driven medallion pipeline for client datalake ingestion.

Architecture:
- Bronze: immutable raw file landing with manifest + checksums.
- Silver: single standardized site-day dataset with causal quality processing.
- Gold: ML-ready dataset with calendar, weather, school holidays, lags, rolling stats.

Key guarantees:
- Point-in-time transforms: no future leakage for imputation, outlier handling, lags.
- Event-driven operation: process only new/changed files.
- No historical backfill by default: files containing dates <= watermark are quarantined.
- Human intervention limited to metadata (column aliases + site metadata).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict, deque
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import numpy as np

from app.services.file_parser import parse_file

DAILY_DATASETS: frozenset[str] = frozenset(
    {
        "workforce_daily",
        "operations_daily",
        "labor_cost_daily",
        "quality_incidents_daily",
        "actions_adoption_daily",
        "pipeline_observability_daily",
        "mock_forecasts_daily",
        "model_monitoring_daily",
    }
)

MONTHLY_DATASETS: frozenset[str] = frozenset(
    {
        "hr_monthly",
        "finance_monthly",
        "roi_monthly",
    }
)

MISSING_TOKENS: frozenset[str] = frozenset({"", "na", "n/a", "null", "none", "-", "--"})

DEFAULT_COLUMN_ALIASES: dict[str, list[str]] = {
    "date": ["date", "jour", "day", "ds"],
    "month": ["month", "mois", "periode", "period"],
    "site_code": ["site_code", "site", "siteid", "site_id", "code_site"],
    "site_name": ["site_name", "site_nom", "site_label", "name_site"],
}

DEFAULT_STATE = {
    "version": 1,
    "files": {},
    "watermarks": {},
    "last_run": None,
}


@dataclass(frozen=True)
class SourceFile:
    client_slug: str
    domain: str
    dataset: str
    path: Path


@dataclass(frozen=True)
class BronzeAsset:
    client_slug: str
    dataset: str
    domain: str
    path: Path
    ingested_at: str


@dataclass(frozen=True)
class BronzeManifestEntry:
    source_path: str
    bronze_path: str
    client_slug: str
    domain: str
    dataset: str
    file_hash: str
    file_size_bytes: int
    rows_detected: int
    min_date: str | None
    max_date: str | None
    ingested_at: str


def now_utc() -> datetime:
    return datetime.now(UTC)


def normalize_identifier(value: str) -> str:
    lowered = value.strip().lower()
    chars: list[str] = []
    prev_underscore = False
    for char in lowered:
        if char.isalnum():
            chars.append(char)
            prev_underscore = False
            continue
        if not prev_underscore:
            chars.append("_")
            prev_underscore = True
    out = "".join(chars).strip("_")
    if not out:
        return "col"
    if out[0].isdigit():
        return f"c_{out}"
    return out


def parse_date_any(value: Any) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None

    raw = value.strip()
    if not raw:
        return None

    candidate = raw[:10]
    try:
        return date.fromisoformat(candidate)
    except ValueError:
        pass

    cleaned = raw.replace("/", "-")
    parts = cleaned.split("-")
    if len(parts) != 3:
        return None

    try:
        a, b, c = int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        return None

    # DD-MM-YYYY
    if c > 31:
        try:
            return date(c, b, a)
        except ValueError:
            return None

    # YYYY-MM-DD
    if a > 31:
        try:
            return date(a, b, c)
        except ValueError:
            return None

    return None


def to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and math.isnan(value):
            return None
        return float(value)
    if not isinstance(value, str):
        return None

    token = value.strip().lower()
    if token in MISSING_TOKENS:
        return None

    compact = value.strip().replace(" ", "").replace("\u00a0", "")
    if not compact:
        return None

    if "," in compact and "." in compact:
        if compact.rfind(",") > compact.rfind("."):
            compact = compact.replace(".", "").replace(",", ".")
        else:
            compact = compact.replace(",", "")
    elif "," in compact:
        compact = compact.replace(",", ".")

    try:
        return float(compact)
    except ValueError:
        return None


def coerce_scalar(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        token = value.strip()
        lowered = token.lower()
        if lowered in MISSING_TOKENS:
            return None
        if lowered in {"yes", "true", "oui"}:
            return True
        if lowered in {"no", "false", "non"}:
            return False

        parsed_date = parse_date_any(token)
        if parsed_date is not None:
            return parsed_date.isoformat()

        parsed_float = to_float(token)
        if parsed_float is not None:
            if parsed_float.is_integer():
                return int(parsed_float)
            return parsed_float

        return token

    if isinstance(value, date):
        return value.isoformat()
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(f"{path.suffix}.tmp")
    with temp.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
    temp.replace(path)


def discover_source_files(data_root: Path) -> list[SourceFile]:
    files: list[SourceFile] = []
    for client_dir in sorted(data_root.iterdir()):
        if not client_dir.is_dir():
            continue
        if client_dir.name in {"metadata", "reference"}:
            continue

        client_slug = client_dir.name
        for domain_dir in sorted(client_dir.iterdir()):
            if not domain_dir.is_dir():
                continue
            files.extend(
                SourceFile(
                    client_slug=client_slug,
                    domain=domain_dir.name,
                    dataset=file_path.stem,
                    path=file_path,
                )
                for file_path in sorted(domain_dir.glob("*.csv"))
            )
    return files


def detect_changed_files(
    files: list[SourceFile], state: dict[str, Any]
) -> list[SourceFile]:
    changed: list[SourceFile] = []
    tracked_files: dict[str, str] = state.get("files", {})

    for entry in files:
        key = str(entry.path)
        digest = sha256_file(entry.path)
        if tracked_files.get(key) != digest:
            changed.append(entry)

    return changed


def load_column_aliases(path: Path) -> dict[str, list[str]]:
    if not path.exists():
        return DEFAULT_COLUMN_ALIASES

    payload = load_json(path, {})
    out = {**DEFAULT_COLUMN_ALIASES}
    for key, values in payload.items():
        if not isinstance(values, list):
            continue
        clean = [normalize_identifier(str(v)) for v in values]
        out[key] = clean
    return out


def resolve_key_columns(
    source_columns: list[str],
    dataset: str,
    aliases: dict[str, list[str]],
) -> tuple[str, str, str | None]:
    normalized_map = {normalize_identifier(col): col for col in source_columns}

    date_alias_key = "month" if dataset in MONTHLY_DATASETS else "date"

    date_col = None
    for candidate in aliases.get(date_alias_key, []):
        if candidate in normalized_map:
            date_col = normalized_map[candidate]
            break

    site_code_col = None
    for candidate in aliases.get("site_code", []):
        if candidate in normalized_map:
            site_code_col = normalized_map[candidate]
            break

    site_name_col = None
    for candidate in aliases.get("site_name", []):
        if candidate in normalized_map:
            site_name_col = normalized_map[candidate]
            break

    if date_col is None:
        msg = f"Unable to resolve temporal column for dataset={dataset}"
        raise RuntimeError(msg)
    if site_code_col is None:
        msg = f"Unable to resolve site_code column for dataset={dataset}"
        raise RuntimeError(msg)

    return date_col, site_code_col, site_name_col


def parse_source_rows(source: SourceFile) -> tuple[list[dict[str, Any]], list[str]]:
    content = source.path.read_bytes()
    result = parse_file(
        content, source.path.name, format_hint="csv", max_rows=2_000_000
    )
    rows = [{k: coerce_scalar(v) for k, v in row.items()} for row in result.rows]
    return rows, result.source_columns


def stage_bronze(
    changed: list[SourceFile],
    output_root: Path,
    state: dict[str, Any],
    aliases: dict[str, list[str]],
    *,
    allow_reprocess: bool,
) -> list[BronzeManifestEntry]:
    run_id = now_utc().strftime("%Y%m%dT%H%M%SZ")
    bronze_root = output_root / "bronze"
    quarantine_root = output_root / "quarantine"
    manifest_entries: list[BronzeManifestEntry] = []
    tracked_files: dict[str, str] = state.setdefault("files", {})
    watermarks: dict[str, str] = state.setdefault("watermarks", {})

    for source in changed:
        rows, source_columns = parse_source_rows(source)
        date_col, _site_code_col, _site_name_col = resolve_key_columns(
            source_columns,
            source.dataset,
            aliases,
        )

        parsed_dates = [
            parse_date_any(str(row.get(date_col)))
            for row in rows
            if row.get(date_col) is not None
        ]
        parsed_dates = [d for d in parsed_dates if d is not None]
        min_date = min(parsed_dates) if parsed_dates else None
        max_date = max(parsed_dates) if parsed_dates else None

        wm_key = f"{source.client_slug}::{source.dataset}"
        watermark_raw = watermarks.get(wm_key)
        watermark = date.fromisoformat(watermark_raw) if watermark_raw else None

        if (
            not allow_reprocess
            and watermark is not None
            and min_date is not None
            and min_date <= watermark
        ):
            quarantine_dir = (
                quarantine_root
                / f"client={source.client_slug}"
                / f"dataset={source.dataset}"
                / f"detected_at={run_id}"
            )
            quarantine_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source.path, quarantine_dir / source.path.name)
            print(
                "quarantine",
                source.path,
                f"reason=min_date({min_date}) <= watermark({watermark})",
            )
            continue

        digest = sha256_file(source.path)
        bytes_size = source.path.stat().st_size
        bronze_dir = (
            bronze_root
            / f"client={source.client_slug}"
            / f"dataset={source.dataset}"
            / f"ingested_at={run_id}"
        )
        bronze_dir.mkdir(parents=True, exist_ok=True)
        bronze_path = bronze_dir / "part-000.csv"
        shutil.copy2(source.path, bronze_path)

        tracked_files[str(source.path)] = digest
        if max_date is not None:
            watermarks[wm_key] = max_date.isoformat()

        manifest_entries.append(
            BronzeManifestEntry(
                source_path=str(source.path),
                bronze_path=str(bronze_path),
                client_slug=source.client_slug,
                domain=source.domain,
                dataset=source.dataset,
                file_hash=digest,
                file_size_bytes=bytes_size,
                rows_detected=len(rows),
                min_date=min_date.isoformat() if min_date else None,
                max_date=max_date.isoformat() if max_date else None,
                ingested_at=run_id,
            )
        )

    if manifest_entries:
        manifest_path = output_root / "bronze" / "_manifests" / f"{run_id}.json"
        write_json(manifest_path, [asdict(entry) for entry in manifest_entries])

    return manifest_entries


def discover_latest_bronze_assets(bronze_root: Path) -> list[BronzeAsset]:
    if not bronze_root.exists():
        return []

    latest: dict[tuple[str, str], BronzeAsset] = {}
    for asset_path in sorted(
        bronze_root.glob("client=*/dataset=*/ingested_at=*/part-000.csv")
    ):
        try:
            client_part = asset_path.parts[-4]
            dataset_part = asset_path.parts[-3]
            ingested_part = asset_path.parts[-2]
        except IndexError:
            continue

        if not client_part.startswith("client="):
            continue
        if not dataset_part.startswith("dataset="):
            continue
        if not ingested_part.startswith("ingested_at="):
            continue

        client_slug = client_part.split("=", 1)[1]
        dataset = dataset_part.split("=", 1)[1]
        ingested_at = ingested_part.split("=", 1)[1]

        key = (client_slug, dataset)
        candidate = BronzeAsset(
            client_slug=client_slug,
            dataset=dataset,
            domain="unknown",
            path=asset_path,
            ingested_at=ingested_at,
        )

        current = latest.get(key)
        if current is None or candidate.ingested_at > current.ingested_at:
            latest[key] = candidate

    return sorted(latest.values(), key=lambda a: (a.client_slug, a.dataset))


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


def build_silver_rows(
    assets: list[BronzeAsset],
    aliases: dict[str, list[str]],
) -> list[dict[str, Any]]:
    daily_rows: dict[tuple[str, str, date], dict[str, Any]] = {}
    monthly_rows: dict[tuple[str, str, date], dict[str, Any]] = {}
    site_names: dict[tuple[str, str], str] = {}

    site_min_max: dict[tuple[str, str], tuple[date, date]] = {}

    for asset in assets:
        content = asset.path.read_bytes()
        result = parse_file(
            content, asset.path.name, format_hint="csv", max_rows=2_000_000
        )
        source_rows = [
            {k: coerce_scalar(v) for k, v in row.items()} for row in result.rows
        ]
        date_col, site_code_col, site_name_col = resolve_key_columns(
            result.source_columns,
            asset.dataset,
            aliases,
        )

        metric_prefix = f"{normalize_identifier(asset.dataset)}__"

        for row in source_rows:
            raw_date = row.get(date_col)
            parsed = parse_date_any(str(raw_date)) if raw_date is not None else None
            if parsed is None:
                continue

            site_code = str(row.get(site_code_col) or "").strip().upper()
            if not site_code:
                continue

            if site_name_col:
                site_name = str(row.get(site_name_col) or "").strip()
                if site_name:
                    site_names[(asset.client_slug, site_code)] = site_name

            metrics: dict[str, Any] = {}
            for col_name, value in row.items():
                if col_name in {date_col, site_code_col, site_name_col}:
                    continue
                normalized_col = normalize_identifier(col_name)
                metrics[f"{metric_prefix}{normalized_col}"] = coerce_scalar(value)

            if asset.dataset in MONTHLY_DATASETS:
                key = (asset.client_slug, site_code, month_start(parsed))
                monthly_rows.setdefault(key, {}).update(metrics)
                continue

            key = (asset.client_slug, site_code, parsed)
            daily_rows.setdefault(key, {}).update(metrics)

            existing = site_min_max.get((asset.client_slug, site_code))
            if existing is None:
                site_min_max[(asset.client_slug, site_code)] = (parsed, parsed)
            else:
                low, high = existing
                site_min_max[(asset.client_slug, site_code)] = (
                    min(low, parsed),
                    max(high, parsed),
                )

    dense_keys: list[tuple[str, str, date]] = []
    for (client_slug, site_code), (start, end) in site_min_max.items():
        dense_keys.extend((client_slug, site_code, d) for d in daterange(start, end))

    dense_keys.sort()

    rows: list[dict[str, Any]] = []
    for client_slug, site_code, d in dense_keys:
        row: dict[str, Any] = {
            "client_slug": client_slug,
            "site_code": site_code,
            "site_name": site_names.get((client_slug, site_code)),
            "date": d.isoformat(),
        }
        row.update(daily_rows.get((client_slug, site_code, d), {}))
        # Use only previous completed month aggregates to avoid leakage.
        row.update(
            monthly_rows.get(
                (client_slug, site_code, previous_month_start(d)),
                {},
            )
        )
        rows.append(row)

    return rows


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


def classify_missing_mechanism(
    rows: list[dict[str, Any]],
    column: str,
) -> str:
    dated_rows: list[tuple[date, Any, str]] = []
    for row in rows:
        d = parse_date_any(row.get("date"))
        if d is None:
            continue
        dated_rows.append((d, row.get(column), str(row.get("site_code") or "")))

    if not dated_rows:
        return "mcar"

    missing_total = sum(1 for _d, value, _site in dated_rows if to_float(value) is None)
    if missing_total == 0:
        return "none"

    weekly_counts: dict[tuple[int, int], tuple[int, int]] = {}
    site_counts: dict[str, tuple[int, int]] = {}

    for d, value, site in dated_rows:
        week_key = d.isocalendar()[:2]
        total, miss = weekly_counts.get(week_key, (0, 0))
        total += 1
        if to_float(value) is None:
            miss += 1
        weekly_counts[week_key] = (total, miss)

        site_total, site_missing = site_counts.get(site, (0, 0))
        site_total += 1
        if to_float(value) is None:
            site_missing += 1
        site_counts[site] = (site_total, site_missing)

    def has_strong_rate_gap(counts: dict[Any, tuple[int, int]]) -> bool:
        rates = [miss / total for total, miss in counts.values() if total > 0]
        positive_rates = [r for r in rates if r > 0]
        if len(positive_rates) < 2:
            return False
        low = min(positive_rates)
        high = max(positive_rates)
        return low > 0 and (high / low) > 3.0

    if has_strong_rate_gap(weekly_counts) or has_strong_rate_gap(site_counts):
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

    usable_predictors: list[str] = []
    for col in predictor_cols:
        if col == target_col:
            continue
        if col.endswith(("__imputed", "__outlier_clamped")):
            continue
        if to_float(current_row.get(col)) is None:
            continue
        usable_predictors.append(col)

    if len(usable_predictors) < 2:
        return None, 0.0

    correlations: list[tuple[float, str]] = []
    for predictor in usable_predictors:
        xy: list[tuple[float, float]] = []
        for idx in candidate_indices:
            if idx >= current_idx:
                continue
            y = to_float(rows[idx].get(target_col))
            x = to_float(rows[idx].get(predictor))
            if y is None or x is None:
                continue
            xy.append((x, y))

        if len(xy) < min_samples:
            continue

        x_arr = np.array([v[0] for v in xy], dtype=float)
        y_arr = np.array([v[1] for v in xy], dtype=float)
        if np.std(x_arr) < 1e-9 or np.std(y_arr) < 1e-9:
            continue
        corr = float(np.corrcoef(x_arr, y_arr)[0, 1])
        if math.isnan(corr):
            continue
        correlations.append((abs(corr), predictor))

    correlations.sort(reverse=True)
    selected = [name for _score, name in correlations[:max_predictors]]
    if len(selected) < 2:
        return None, 0.0

    x_train: list[list[float]] = []
    y_train: list[float] = []
    for idx in candidate_indices:
        if idx >= current_idx:
            continue
        y = to_float(rows[idx].get(target_col))
        if y is None:
            continue

        row_values: list[float] = []
        complete = True
        for col in selected:
            x = to_float(rows[idx].get(col))
            if x is None:
                complete = False
                break
            row_values.append(x)

        if not complete:
            continue

        x_train.append(row_values)
        y_train.append(y)

    if len(y_train) < min_samples:
        return None, 0.0

    x_matrix = np.array(x_train, dtype=float)
    y_vector = np.array(y_train, dtype=float)

    x_aug = np.column_stack((np.ones(len(x_matrix)), x_matrix))
    lhs = x_aug.T @ x_aug
    lhs += ridge_alpha * np.eye(lhs.shape[0])
    rhs = x_aug.T @ y_vector

    try:
        beta = np.linalg.solve(lhs, rhs)
    except np.linalg.LinAlgError:
        return None, 0.0

    pred_features = [to_float(current_row.get(col)) for col in selected]
    if any(val is None for val in pred_features):
        return None, 0.0

    x_current = np.array(
        [1.0, *[float(v) for v in pred_features if v is not None]], dtype=float
    )
    predicted = float(np.dot(beta, x_current))

    y_hat = x_aug @ beta
    residual = float(np.sum((y_vector - y_hat) ** 2))
    total = float(np.sum((y_vector - y_vector.mean()) ** 2))
    r2 = 0.0 if total < 1e-9 else max(0.0, 1.0 - residual / total)

    return predicted, r2


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

    def collect(indices: list[int], *, same_dow: bool) -> list[float]:
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

    group_key = (client, site)
    site_indices = group_indices.get(group_key, [])
    same_dow = collect(site_indices, same_dow=True)
    if same_dow:
        return float(np.median(same_dow))

    site_values = collect(site_indices, same_dow=False)
    if site_values:
        return float(np.median(site_values))

    client_values = collect(client_indices.get(client, []), same_dow=False)
    if client_values:
        return float(np.median(client_values))

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

    low = float(np.percentile(hist, 1.0))
    high = float(np.percentile(hist, 99.0))
    return max(low, min(high, value))


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
        for row in sorted_rows:
            row.setdefault(f"{col}__imputed", False)
            row.setdefault(f"{col}__imputation_method", None)
            row.setdefault(f"{col}__outlier_clamped", False)

        values = [to_float(row.get(col)) for row in sorted_rows]
        missing_rate = sum(1 for v in values if v is None) / max(len(values), 1)
        mechanism = classify_missing_mechanism(sorted_rows, col)

        imputed_count = 0
        unresolved_count = 0

        for idx, row in enumerate(sorted_rows):
            if to_float(row.get(col)) is not None:
                continue

            client = str(row.get("client_slug") or "")
            site = str(row.get("site_code") or "")
            history = group_indices.get((client, site), [])

            predicted: float | None = None
            method = None

            if missing_rate <= 0.30:
                if missing_rate >= 0.05 or mechanism == "mar":
                    predicted, score = attempt_causal_ridge(
                        sorted_rows,
                        idx,
                        col,
                        numeric_cols,
                        history,
                    )
                    if predicted is not None:
                        predicted = clip_to_history(
                            sorted_rows, idx, col, history, predicted
                        )
                        method = (
                            "causal_ridge" if score >= 0.15 else "causal_ridge_low_conf"
                        )

                if predicted is None:
                    predicted = hierarchical_median_impute(
                        sorted_rows,
                        idx,
                        col,
                        group_indices,
                        client_indices,
                    )
                    if predicted is not None:
                        method = "hierarchical_median"

            if predicted is None:
                unresolved_count += 1
                continue

            row[col] = predicted
            row[f"{col}__imputed"] = True
            row[f"{col}__imputation_method"] = method
            imputed_count += 1

        # Point-in-time robust outlier clamping (MAD)
        clamped_count = 0
        for indices in group_indices.values():
            history: deque[float] = deque(maxlen=56)
            for idx in indices:
                value = to_float(sorted_rows[idx].get(col))
                if value is None:
                    continue

                if len(history) >= 14:
                    arr = np.array(history, dtype=float)
                    median = float(np.median(arr))
                    mad = float(np.median(np.abs(arr - median)))
                    if mad > 1e-9:
                        scale = 1.4826 * mad
                        low = median - 4.5 * scale
                        high = median + 4.5 * scale
                        if value < low or value > high:
                            sorted_rows[idx][col] = max(low, min(high, value))
                            sorted_rows[idx][f"{col}__outlier_clamped"] = True
                            clamped_count += 1
                            value = to_float(sorted_rows[idx].get(col))

                if value is not None:
                    history.append(value)

        quality_summary["columns"][col] = {
            "missing_rate": round(missing_rate, 6),
            "missing_mechanism": mechanism,
            "imputed_count": imputed_count,
            "unresolved_missing_count": unresolved_count,
            "outliers_clamped": clamped_count,
        }

    return sorted_rows, quality_summary


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
            return json.loads(data.decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
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
        ):
            return cached.get("data", {})

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


def fetch_school_holiday_intervals(
    zone: str,
    years: set[int],
    cache_file: Path,
) -> list[tuple[date, date, str]]:
    if cache_file.exists():
        cached = load_json(cache_file, [])
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

    timezone = ZoneInfo("Europe/Paris")
    intervals: list[tuple[date, date, str]] = []

    for year in sorted(years):
        where = (
            f'zones like "%{zone}%" and '
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
        url = (
            "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/"
            f"fr-en-calendrier-scolaire/records?{query}"
        )
        payload = fetch_json(url)
        if payload is None:
            continue

        results = payload.get("results", [])
        if not isinstance(results, list):
            continue

        for rec in results:
            if not isinstance(rec, dict):
                continue
            start_raw = rec.get("start_date")
            end_raw = rec.get("end_date")
            label = str(rec.get("description") or "vacances")
            if not isinstance(start_raw, str) or not isinstance(end_raw, str):
                continue
            try:
                start_dt = datetime.fromisoformat(start_raw)
                end_dt = datetime.fromisoformat(end_raw)
            except ValueError:
                continue

            start_local = start_dt.astimezone(timezone).date()
            end_local_exclusive = end_dt.astimezone(timezone).date()
            if end_local_exclusive <= start_local:
                continue
            intervals.append((start_local, end_local_exclusive, label))

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


def add_external_features(
    rows: list[dict[str, Any]],
    site_locations: dict[tuple[str, str], dict[str, Any]],
    cache_root: Path,
) -> None:
    if not rows:
        return

    min_date = min(
        parse_date_any(row.get("date"))
        for row in rows
        if parse_date_any(row.get("date")) is not None
    )
    max_date = max(
        parse_date_any(row.get("date"))
        for row in rows
        if parse_date_any(row.get("date")) is not None
    )
    if min_date is None or max_date is None:
        return

    weather_cache_root = cache_root / "weather"
    holidays_cache_root = cache_root / "school_holidays"
    weather_cache_root.mkdir(parents=True, exist_ok=True)
    holidays_cache_root.mkdir(parents=True, exist_ok=True)

    weather_by_site: dict[tuple[str, str], dict[str, dict[str, float | None]]] = {}

    zone_years: dict[str, set[int]] = defaultdict(set)
    for row in rows:
        d = parse_date_any(row.get("date"))
        if d is None:
            continue
        key = (str(row.get("client_slug") or ""), str(row.get("site_code") or ""))
        metadata = site_locations.get(key, {})
        zone = str(metadata.get("school_zone") or "").strip()
        if zone:
            zone_years[zone].add(d.year)

    holiday_intervals_by_zone: dict[str, list[tuple[date, date, str]]] = {}
    for zone, years in zone_years.items():
        cache_file = holidays_cache_root / f"{normalize_identifier(zone)}.json"
        holiday_intervals_by_zone[zone] = fetch_school_holiday_intervals(
            zone, years, cache_file
        )

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
            lat, lon, min_date, max_date, cache_file
        )

    for row in rows:
        client = str(row.get("client_slug") or "")
        site = str(row.get("site_code") or "")
        d = parse_date_any(row.get("date"))
        if d is None:
            continue

        key = (client, site)
        weather = weather_by_site.get(key, {}).get(d.isoformat())
        if weather:
            row.update(weather)

        metadata = site_locations.get(key, {})
        zone = str(metadata.get("school_zone") or "").strip()
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
        group_rows.sort(key=lambda r: str(r.get("date") or ""))

        history: dict[str, deque[float | None]] = {
            col: deque(maxlen=90) for col in candidate_columns
        }

        for row in group_rows:
            for col in candidate_columns:
                hist_values = list(history[col])
                non_null_hist = [v for v in hist_values if v is not None]

                for lag in lags:
                    feature_col = f"{col}__lag_{lag}"
                    if len(hist_values) >= lag:
                        row[feature_col] = hist_values[-lag]
                    else:
                        row[feature_col] = None

                for window in windows:
                    roll_mean_col = f"{col}__rolling_mean_{window}"
                    roll_std_col = f"{col}__rolling_std_{window}"
                    if len(non_null_hist) >= window:
                        segment = np.array(non_null_hist[-window:], dtype=float)
                        row[roll_mean_col] = float(np.mean(segment))
                        row[roll_std_col] = float(np.std(segment))
                    else:
                        row[roll_mean_col] = None
                        row[roll_std_col] = None

            for col in candidate_columns:
                history[col].append(to_float(row.get(col)))


def select_gold_feature_columns(rows: list[dict[str, Any]]) -> list[str]:
    preferred = [
        "operations_daily__orders_received",
        "operations_daily__orders_processed",
        "operations_daily__backlog_orders",
        "workforce_daily__required_fte",
        "workforce_daily__absent_fte",
        "workforce_daily__present_fte",
        "labor_cost_daily__total_labor_cost_eur",
        "mock_forecasts_daily__forecasted_orders",
        "mock_forecasts_daily__predicted_required_fte",
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


def run_once(
    data_root: Path,
    output_root: Path,
    metadata_root: Path,
    *,
    allow_reprocess: bool,
    force_rebuild: bool,
) -> bool:
    state_path = output_root / ".medallion_state.json"
    state = load_json(state_path, DEFAULT_STATE)
    if force_rebuild:
        state["files"] = {}
        state["watermarks"] = {}

    aliases = load_column_aliases(metadata_root / "column_aliases.json")

    source_files = discover_source_files(data_root)
    changed = detect_changed_files(source_files, state)

    if force_rebuild:
        changed = source_files

    if not changed:
        print("No new source files detected.")
        return False

    manifest_entries = stage_bronze(
        changed,
        output_root,
        state,
        aliases,
        allow_reprocess=allow_reprocess,
    )
    if not manifest_entries:
        print("No files staged to bronze (all quarantined or invalid).")
        write_json(state_path, state)
        return False

    assets = discover_latest_bronze_assets(output_root / "bronze")
    silver_base = build_silver_rows(assets, aliases)
    silver_rows, quality_summary = apply_silver_quality(silver_base)

    silver_path = output_root / "silver" / "silver_site_day.csv"
    write_csv_rows(silver_path, silver_rows)

    gold_seed_rows, removed_quality_columns = split_gold_features_and_quality_metadata(
        silver_rows
    )
    gold_rows = [dict(row) for row in gold_seed_rows]
    add_calendar_features(gold_rows)

    site_locations = load_site_locations(metadata_root / "site_locations.json")
    add_external_features(gold_rows, site_locations, output_root / "cache")

    feature_cols = select_gold_feature_columns(gold_rows)
    add_lag_rolling_features(gold_rows, feature_cols)

    gold_path = output_root / "gold" / "gold_site_day.csv"
    write_csv_rows(gold_path, gold_rows)

    # Per-client exports for downstream secure routing.
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in gold_rows:
        grouped[str(row.get("client_slug") or "")].append(row)
    for client_slug, client_rows in grouped.items():
        client_path = (
            output_root / "gold" / f"client={client_slug}" / "gold_site_day.csv"
        )
        write_csv_rows(client_path, client_rows)

    run_summary = {
        "run_at": now_utc().isoformat(),
        "bronze_files": len(manifest_entries),
        "silver_rows": len(silver_rows),
        "gold_rows": len(gold_rows),
        "feature_columns_for_lags": feature_cols,
        "gold_removed_quality_columns_count": len(removed_quality_columns),
    }
    state["last_run"] = run_summary

    gold_feature_quality_report = {
        "generated_at": now_utc().isoformat(),
        "removed_from_gold_columns": removed_quality_columns,
        "removed_from_gold_columns_count": len(removed_quality_columns),
        "silver_quality_summary": quality_summary.get("columns", {}),
    }

    write_json(output_root / "reports" / "silver_quality_report.json", quality_summary)
    write_json(
        output_root / "reports" / "gold_feature_quality_report.json",
        gold_feature_quality_report,
    )
    write_json(output_root / "reports" / "last_run_summary.json", run_summary)
    write_json(state_path, state)

    print(f"Bronze staged files: {len(manifest_entries)}")
    print(f"Silver rows: {len(silver_rows)} -> {silver_path}")
    print(f"Gold rows: {len(gold_rows)} -> {gold_path}")

    return True


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run medallion data pipeline.")
    parser.add_argument(
        "--data-root", type=Path, default=Path(__file__).resolve().parents[2] / "data"
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data-ready",
    )
    parser.add_argument(
        "--metadata-root",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "config" / "medallion",
    )
    parser.add_argument(
        "--allow-reprocess",
        action="store_true",
        help="Allow retroactive files (disabled by default to prevent backfill leakage).",
    )
    parser.add_argument(
        "--force-rebuild",
        action="store_true",
        help="Ignore state and rebuild from all source files.",
    )
    parser.add_argument(
        "--watch", action="store_true", help="Poll source files continuously."
    )
    parser.add_argument("--poll-seconds", type=int, default=30)
    return parser


def main() -> None:
    args = build_parser().parse_args()

    if args.watch:
        while True:
            try:
                changed = run_once(
                    data_root=args.data_root,
                    output_root=args.output_root,
                    metadata_root=args.metadata_root,
                    allow_reprocess=args.allow_reprocess,
                    force_rebuild=args.force_rebuild,
                )
                if changed:
                    args.force_rebuild = False
            except Exception as exc:
                print(f"Pipeline failure: {exc}")
            time.sleep(args.poll_seconds)
    else:
        run_once(
            data_root=args.data_root,
            output_root=args.output_root,
            metadata_root=args.metadata_root,
            allow_reprocess=args.allow_reprocess,
            force_rebuild=args.force_rebuild,
        )


if __name__ == "__main__":
    main()
