# ruff: noqa: PLR0911, PLR2004
"""Shared dataclasses and low-level helpers for the medallion pipeline."""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

DAILY_DATASETS: frozenset[str] = frozenset(
    {
        "workforce_daily",
        "operations_daily",
        "labor_cost_daily",
        "quality_incidents_daily",
        "actions_adoption_daily",
        "pipeline_observability_daily",
        "model_monitoring_daily",
        "forecasts_daily",
    }
)

MONTHLY_DATASETS: frozenset[str] = frozenset(
    {
        "hr_monthly",
        "finance_monthly",
        "roi_monthly",
    }
)

MISSING_TOKENS: frozenset[str] = frozenset(
    {"", "na", "n/a", "null", "none", "-", "--"}
)

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

LEGACY_DATASET_PREFIX = "mock_"
LEGACY_RUNTIME_COLUMN_PREFIX = "mock_"

VALID_SCHOOL_ZONES: dict[str, str] = {
    "a": "A",
    "b": "B",
    "c": "C",
    "corse": "Corse",
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


@dataclass(frozen=True)
class SourceInspection:
    rows: list[dict[str, Any]]
    source_columns: list[str]
    date_column: str
    min_date: date | None
    max_date: date | None


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


def _normalize_numeric_text(value: str) -> str | None:
    compact = value.replace(" ", "").replace("\u00a0", "")
    if not compact:
        return None
    if "," not in compact:
        return compact
    if "." not in compact:
        return compact.replace(",", ".")
    if compact.rfind(",") > compact.rfind("."):
        return compact.replace(".", "").replace(",", ".")
    return compact.replace(",", "")


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

    token = value.strip()
    if token.lower() in MISSING_TOKENS:
        return None

    compact = _normalize_numeric_text(token)
    if compact is None:
        return None

    try:
        return float(compact)
    except ValueError:
        return None


def _coerce_scalar_text(value: str) -> Any:
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


def coerce_scalar(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        return _coerce_scalar_text(value)

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


def _resolve_trusted_source_path(path: Path, *, root: Path) -> Path | None:
    try:
        resolved_root = root.resolve(strict=True)
        resolved_path = path.resolve(strict=True)
    except OSError:
        return None

    if path.is_symlink():
        return None
    if not resolved_path.is_file():
        return None
    if not resolved_path.is_relative_to(resolved_root):
        return None
    return resolved_path


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(f"{path.suffix}.tmp")
    with temp.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
    temp.replace(path)
