"""Full demo seed - complete tenant seeded from DB pipelines.

Usage:
    cd apps/api
    uv run python -m scripts.seed_full_demo

This script is idempotent: it creates missing entities/datasets and only
skips steps that would duplicate already-materialized downstream artifacts.

Pipeline (10 steps):
 1. Organization "Praedixa Demo"
 2. 6 Sites (embedded blueprints)
 3. 12 Departments (2 per site)
 4. Core demo datasets + client CSV datasets (from /data) through DB pipeline
 5. Canonical + cost parameters computed from DB-cleaned core datasets
 6. Mock forecasts → coverage alerts
 7. Scenario options (per alert)
 8. Operational decisions (~70% of alerts)
 9. Proof records (per site-month)
10. Dashboard alerts + ForecastRun + DailyForecasts
"""
# ruff: noqa: PLR2004, PLR0911, PLR0915, DTZ011, RUF046

from __future__ import annotations

import asyncio
import csv
import io
import json
import math
import os
import random
import re
import statistics
import unicodedata
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING

import structlog
from psycopg.errors import InsufficientPrivilege
from sqlalchemy import select

from app.core.database import async_session_factory, engine
from app.core.ddl_validation import (
    DDLValidationError,
    validate_client_slug,
    validate_identifier,
)
from app.core.security import TenantFilter
from app.models.daily_forecast import DailyForecast, ForecastDimension
from app.models.dashboard_alert import (
    AlertSeverity,
    AlertType,
    DashboardAlert,
    RelatedEntityType,
)
from app.models.data_catalog import (
    ClientDataset,
    ColumnDtype,
    ColumnRole,
    DatasetColumn,
    DatasetStatus,
    IngestionLog,
    IngestionMode,
    QualityReport,
    RunStatus,
)
from app.models.department import Department
from app.models.forecast_run import ForecastModelType, ForecastRun, ForecastStatus
from app.models.operational import (
    CanonicalRecord,
    CostParameter,
    CoverageAlert,
    CoverageAlertSeverity,
    OperationalDecision,
    ScenarioOption,
)
from app.models.organization import (
    IndustrySector,
    Organization,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.models.site import Site
from app.services.canonical_data_service import bulk_import_canonical
from app.services.column_mapper import ColumnMapping, MappingResult, map_columns
from app.services.data_quality import QualityConfig, run_quality_checks
from app.services.datasets import get_dataset_data
from app.services.file_parser import parse_file
from app.services.mock_forecast_service import generate_mock_forecasts
from app.services.proof_service import generate_proof_record
from app.services.raw_inserter import insert_raw_rows
from app.services.scenario_engine_service import generate_scenarios
from app.services.schema_manager import create_client_schemas, create_dataset_tables

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.services.file_parser import ParseResult

log = structlog.get_logger()

_REPO_ROOT = Path(__file__).resolve().parents[2]
_DATA_ROOT = _REPO_ROOT / "data"
_CLIENT_METADATA_PATH = _DATA_ROOT / "clients_metadata.json"
_DEFAULT_DATA_CLIENT_BY_ORG_SLUG: dict[str, str] = {
    "demo_org": "acme-logistics",
    "praedixa_demo": "acme-logistics",
    "praedixa-demo": "acme-logistics",
}


@dataclass(frozen=True)
class ExternalDatasetSeed:
    """One external CSV dataset prepared for DB ingestion."""

    definition: dict[str, object]
    rows: list[dict[str, object]]
    file_name: str


# ── Fixed UUIDs for reproducibility ──────────────────────
_MANAGER_UUID = uuid.UUID("00000000-0000-4000-a000-000000000001")

_DEMO_SITE_BLUEPRINTS: list[dict[str, object]] = [
    {
        "code": "S_LYON",
        "name": "Lyon Logistics",
        "city": "Lyon",
        "headcount": 450,
    },
    {
        "code": "S_ORLEANS",
        "name": "Orleans Hub",
        "city": "Orleans",
        "headcount": 300,
    },
    {
        "code": "S_LILLE",
        "name": "Lille Distribution",
        "city": "Lille",
        "headcount": 250,
    },
    {
        "code": "S_NANTES",
        "name": "Nantes Centre",
        "city": "Nantes",
        "headcount": 200,
    },
    {
        "code": "S_BORDEAUX",
        "name": "Bordeaux Plateforme",
        "city": "Bordeaux",
        "headcount": 350,
    },
    {
        "code": "S_MARSEILLE",
        "name": "Marseille Port",
        "city": "Marseille",
        "headcount": 400,
    },
]

# ── Dataset metadata used by both schema creation and ingestion ───
DEMO_DATASETS: list[dict[str, object]] = [
    {
        "name": "effectifs",
        "table_name": "effectifs",
        "temporal_index": "date_mois",
        "group_by": ["site", "departement"],
        "pipeline_config": {
            "data_quality": {
                "missing_threshold_delete": 0.08,
                "outlier_method": "iqr",
            }
        },
        "columns": [
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("site", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("departement", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("effectif_total", ColumnDtype.INTEGER, ColumnRole.TARGET),
            ("effectif_cdi", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("effectif_cdd", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("effectif_interim", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_feminisation", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ],
    },
    {
        "name": "absences",
        "table_name": "absences",
        "temporal_index": "date_mois",
        "group_by": ["site"],
        "pipeline_config": {
            "data_quality": {
                "missing_threshold_delete": 0.10,
                "outlier_method": "iqr",
            }
        },
        "columns": [
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("site", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("absences_maladie", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("absences_conges", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("absences_rtt", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("absences_autre", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_absenteisme", ColumnDtype.FLOAT, ColumnRole.TARGET),
        ],
    },
    {
        "name": "turnover",
        "table_name": "turnover",
        "temporal_index": "date_mois",
        "group_by": ["departement"],
        "pipeline_config": {
            "data_quality": {
                "missing_threshold_delete": 0.07,
                "outlier_method": "zscore",
            }
        },
        "columns": [
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("departement", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("entrees", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("sorties", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_turnover", ColumnDtype.FLOAT, ColumnRole.TARGET),
            ("anciennete_moyenne", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ],
    },
    {
        "name": "masse_salariale",
        "table_name": "masse_salariale",
        "temporal_index": "date_mois",
        "group_by": ["site", "categorie"],
        "pipeline_config": {
            "data_quality": {
                "missing_threshold_delete": 0.06,
                "outlier_method": "iqr",
            }
        },
        "columns": [
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("site", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("categorie", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("salaire_brut_total", ColumnDtype.FLOAT, ColumnRole.TARGET),
            ("charges_patronales", ColumnDtype.FLOAT, ColumnRole.FEATURE),
            ("primes", ColumnDtype.FLOAT, ColumnRole.FEATURE),
            ("heures_sup", ColumnDtype.FLOAT, ColumnRole.FEATURE),
            ("cout_total", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ],
    },
]

# ── Override reasons for decision overrides ──────────────
_OVERRIDE_REASONS = [
    "Contrainte syndicale",
    "Budget réduit",
    "Préférence site",
]

_DECISION_PROBABILITY = 0.70
_OVERRIDE_PROBABILITY = 0.80

_COMPLETED_MONTHS = 12
_WORK_HOURS_PER_FTE_DAY = 7.2


def _month_shift(d: date, offset: int) -> date:
    month_idx = (d.year * 12 + (d.month - 1)) + offset
    return date(month_idx // 12, month_idx % 12 + 1, 1)


def _rolling_month_starts(reference: date, months: int) -> list[date]:
    current_month = reference.replace(day=1)
    first_month = _month_shift(current_month, -(months - 1))
    return [_month_shift(first_month, i) for i in range(months)]


def _iter_working_days(month_start: date) -> list[date]:
    next_month = _month_shift(month_start, 1)
    days: list[date] = []
    d = month_start
    while d < next_month:
        if d.weekday() < 6:
            days.append(d)
        d += timedelta(days=1)
    return days


def _month_seasonality(month: int) -> float:
    table = {
        1: 1.03,
        2: 1.00,
        3: 1.02,
        4: 1.00,
        5: 0.98,
        6: 0.95,
        7: 0.82,
        8: 0.80,
        9: 0.90,
        10: 1.04,
        11: 1.15,
        12: 1.28,
    }
    return table[month]


def _demand_factor(day: date) -> float:
    base = 1.0
    season = _month_seasonality(day.month)
    base *= 0.88 + (season - 0.80) * 0.50
    if day.weekday() in (0, 1):
        base *= 1.04
    if day.weekday() == 5:
        base *= 0.93
    return base


def _as_float(value: object | None, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().replace(",", ".")
        if not cleaned:
            return default
        try:
            return float(cleaned)
        except ValueError:
            return default
    return default


def _as_date(value: object | None) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        with_iso = stripped[:10]
        try:
            return date.fromisoformat(with_iso)
        except ValueError:
            pass
        parts = stripped.replace("-", "/").split("/")
        if len(parts) == 3:
            try:
                d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
                if y <= 31:
                    d, m, y = y, d, m
                return date(y, m, d)
            except ValueError:
                return None
    return None


def _normalize_identifier(value: str) -> str:
    """Normalize free-form labels to SQL-safe snake_case identifiers."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    lowered = ascii_only.lower().strip()
    lowered = lowered.replace("%", " pct ")
    lowered = re.sub(r"[^a-z0-9]+", "_", lowered)
    lowered = re.sub(r"_+", "_", lowered).strip("_")
    if not lowered:
        lowered = "col"
    if lowered[0].isdigit():
        lowered = f"c_{lowered}"

    candidate = lowered[:63]
    try:
        return validate_identifier(candidate, field="normalized_identifier")
    except DDLValidationError:
        # External CSV headers can legitimately start with app-reserved prefixes
        # (e.g. "platform_fee_eur"). Prefix once to make them DDL-safe.
        fallback = f"c_{candidate}"[:63]
        return validate_identifier(fallback, field="normalized_identifier")


def _infer_numeric_value(value: object) -> float | None:
    """Infer numeric values from heterogeneous CSV parsing outputs."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float, Decimal)):
        return float(value)
    if not isinstance(value, str):
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    compact = cleaned.replace(" ", "").replace("\u00a0", "")
    if compact in {"-", "--"}:
        return None

    # Handle "1.234,56", "1234,56", "1234.56", "1234"
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


def _infer_column_dtype(values: list[object | None]) -> ColumnDtype:  # noqa: PLR0912
    """Infer DatasetColumn dtype from parsed row values."""
    non_null = [v for v in values if v is not None]
    if not non_null:
        return ColumnDtype.TEXT

    date_count = 0
    bool_count = 0
    int_count = 0
    float_count = 0
    text_values: list[str] = []

    for value in non_null:
        if isinstance(value, bool):
            bool_count += 1
            continue

        parsed_date = _as_date(value)
        if parsed_date is not None:
            date_count += 1
            continue

        numeric = _infer_numeric_value(value)
        if numeric is not None:
            if float(numeric).is_integer():
                int_count += 1
            else:
                float_count += 1
            continue

        text_values.append(str(value))

    typed_total = date_count + bool_count + int_count + float_count
    if typed_total == len(non_null):
        if date_count == len(non_null):
            return ColumnDtype.DATE
        if bool_count == len(non_null):
            return ColumnDtype.BOOLEAN
        if float_count > 0:
            return ColumnDtype.FLOAT
        return ColumnDtype.INTEGER

    if int_count + float_count == len(non_null) and (int_count + float_count) > 0:
        return ColumnDtype.FLOAT if float_count > 0 else ColumnDtype.INTEGER

    unique_text = len(set(text_values))
    cardinality_ratio = unique_text / max(len(text_values), 1)
    if unique_text <= 40 or cardinality_ratio <= 0.35:
        return ColumnDtype.CATEGORY
    return ColumnDtype.TEXT


def _resolve_external_client_slug(org_slug: str, metadata: dict[str, object]) -> str:
    """Resolve which data/<client> folder should feed the target organization."""
    clients = metadata.get("clients")
    if not isinstance(clients, dict) or not clients:
        msg = "clients_metadata.json is missing a non-empty 'clients' object"
        raise RuntimeError(msg)

    requested = os.getenv("PRAEDIXA_DATA_CLIENT_SLUG")
    if requested:
        if requested not in clients:
            msg = (
                "PRAEDIXA_DATA_CLIENT_SLUG is invalid: "
                f"{requested}. Known clients: {', '.join(sorted(clients.keys()))}"
            )
            raise RuntimeError(msg)
        return requested

    mapped = _DEFAULT_DATA_CLIENT_BY_ORG_SLUG.get(org_slug)
    if mapped and mapped in clients:
        return mapped

    if org_slug in clients:
        return org_slug

    msg = (
        f"No data client mapping defined for org slug '{org_slug}'. "
        "Set PRAEDIXA_DATA_CLIENT_SLUG explicitly."
    )
    raise RuntimeError(msg)


def _schema_safe_slug(org_slug: str) -> str:
    """Return a DB-schema-safe slug from organization slug.

    Backward compatibility:
    - historical org slugs may contain '-'
    - dynamic DB schemas only allow [a-z0-9_]
    """
    candidate = org_slug.replace("-", "_")
    try:
        return validate_client_slug(candidate)
    except DDLValidationError:
        # Backward-compatible fallback for historical slugs
        # that collide with reserved prefixes (e.g. "praedixa_*").
        fallback = f"tenant_{candidate}"[:35]
        try:
            return validate_client_slug(fallback)
        except DDLValidationError:
            msg = (
                "Organization slug cannot be converted to a valid schema slug: "
                f"org_slug='{org_slug}', candidate='{candidate}', fallback='{fallback}'"
            )
            raise RuntimeError(msg) from None


def _build_external_dataset_definition(
    dataset_name: str,
    parse_result: ParseResult,
) -> dict[str, object]:
    """Build ClientDataset definition with strict source->target column mapping."""
    seen_targets: set[str] = set()
    source_to_target: dict[str, str] = {}
    column_specs: list[tuple[str, ColumnDtype, ColumnRole]] = []

    for source_col in parse_result.source_columns:
        base_target = _normalize_identifier(source_col)
        target = base_target
        suffix = 2
        while target in seen_targets:
            candidate = f"{base_target}_{suffix}"
            target = candidate[:63]
            suffix += 1
        seen_targets.add(target)
        source_to_target[source_col] = target

    target_order = [source_to_target[src] for src in parse_result.source_columns]
    target_dtypes: dict[str, ColumnDtype] = {}
    for source_col in parse_result.source_columns:
        target = source_to_target[source_col]
        values = [row.get(source_col) for row in parse_result.rows]
        target_dtypes[target] = _infer_column_dtype(values)

    temporal_candidates = [
        col
        for col in target_order
        if target_dtypes[col] == ColumnDtype.DATE
        or col in {"date", "month"}
        or col.endswith(("_date", "_month"))
    ]
    if not temporal_candidates:
        msg = f"Dataset '{dataset_name}' has no temporal index candidate"
        raise RuntimeError(msg)
    temporal_index = temporal_candidates[0]

    group_by: list[str] = [
        c for c in ("site_code", "site", "site_name") if c in target_order
    ]
    if not group_by:
        msg = f"Dataset '{dataset_name}' has no group_by candidate (site_code/site)"
        raise RuntimeError(msg)

    for target_col in target_order:
        role = ColumnRole.FEATURE
        if target_col == temporal_index:
            role = ColumnRole.TEMPORAL_INDEX
        elif target_col in group_by:
            role = ColumnRole.GROUP_BY
        elif target_col.endswith("_id"):
            role = ColumnRole.ID
        column_specs.append((target_col, target_dtypes[target_col], role))

    numeric_candidates = [
        idx
        for idx, (_name, dtype, role) in enumerate(column_specs)
        if role == ColumnRole.FEATURE
        and dtype in {ColumnDtype.FLOAT, ColumnDtype.INTEGER}
    ]
    if not numeric_candidates:
        msg = f"Dataset '{dataset_name}' has no numeric feature/target column"
        raise RuntimeError(msg)
    first_numeric_idx = numeric_candidates[0]
    name, dtype, _role = column_specs[first_numeric_idx]
    column_specs[first_numeric_idx] = (name, dtype, ColumnRole.TARGET)

    return {
        "name": dataset_name,
        "table_name": _normalize_identifier(dataset_name),
        "temporal_index": temporal_index,
        "group_by": group_by,
        "source_to_target": source_to_target,
        "pipeline_config": {
            "data_quality": {
                "missing_threshold_delete": 0.08,
                "outlier_method": "iqr",
            }
        },
        "columns": column_specs,
    }


async def _load_external_dataset_seeds(org_slug: str) -> list[ExternalDatasetSeed]:
    """Load all CSV datasets from data/<client_slug> with inferred DB definitions."""
    if not _CLIENT_METADATA_PATH.exists():
        msg = f"Missing metadata file: {_CLIENT_METADATA_PATH}"
        raise RuntimeError(msg)

    metadata = json.loads(_CLIENT_METADATA_PATH.read_text(encoding="utf-8"))
    client_slug = _resolve_external_client_slug(org_slug, metadata)
    client_root = _DATA_ROOT / client_slug
    if not client_root.exists() or not client_root.is_dir():
        msg = f"Missing client data directory: {client_root}"
        raise RuntimeError(msg)

    csv_paths = sorted(
        path
        for path in client_root.rglob("*.csv")
        if _resolve_trusted_csv_path(path, root=client_root) is not None
    )
    if not csv_paths:
        msg = f"No CSV datasets found under: {client_root}"
        raise RuntimeError(msg)

    seeds: list[ExternalDatasetSeed] = []
    for csv_path in csv_paths:
        content = csv_path.read_bytes()
        parse_result = await asyncio.to_thread(
            parse_file,
            content,
            csv_path.name,
            format_hint="csv",
        )
        definition = _build_external_dataset_definition(csv_path.stem, parse_result)
        seeds.append(
            ExternalDatasetSeed(
                definition=definition,
                rows=parse_result.rows,
                file_name=csv_path.name,
            )
        )

    log.info(
        "external_datasets: prepared",
        org_slug=org_slug,
        client_slug=client_slug,
        count=len(seeds),
    )
    return seeds


def _resolve_trusted_csv_path(path: Path, *, root: Path) -> Path | None:
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


def _inject_missing(
    rows: list[dict[str, object]],
    *,
    field: str,
    rate: float,
    rng: random.Random,
) -> None:
    for row in rows:
        if rng.random() < rate:
            row[field] = None


def _inject_outliers(
    rows: list[dict[str, object]],
    *,
    field: str,
    factor: float,
    count: int,
    rng: random.Random,
) -> None:
    if not rows:
        return
    idxs = rng.sample(range(len(rows)), k=min(count, len(rows)))
    for idx in idxs:
        row = rows[idx]
        value = _as_float(row.get(field))
        row[field] = round(value * factor, 2)


def _append_duplicates(
    rows: list[dict[str, object]],
    *,
    ratio: float,
    rng: random.Random,
) -> None:
    if not rows:
        return
    dup_count = max(1, int(len(rows) * ratio))
    idxs = rng.sample(range(len(rows)), k=min(dup_count, len(rows)))
    rows.extend(dict(rows[idx]) for idx in idxs)


def _build_dataset_source_rows(sites: list[Site]) -> dict[str, list[dict[str, object]]]:
    rng = random.Random(42)  # noqa: S311
    months = _rolling_month_starts(date.today(), _COMPLETED_MONTHS)
    departments = ("Exploitation", "Support")
    categories = ("operateurs", "encadrement")

    effectifs_rows: list[dict[str, object]] = []
    absences_rows: list[dict[str, object]] = []
    turnover_rows: list[dict[str, object]] = []
    payroll_rows: list[dict[str, object]] = []

    workforce_site_month: dict[tuple[str, date], float] = {}
    workforce_dept_month: dict[tuple[str, date], float] = {}

    for month_start in months:
        season = _month_seasonality(month_start.month)
        for site in sites:
            site_noise = 0.93 + 0.14 * rng.random()
            total_site = max(60, int(site.headcount * season * site_noise))

            for dept_name, ratio in zip(departments, (0.72, 0.28), strict=True):
                dept_total = max(15, int(total_site * ratio))
                interim_share = (
                    0.05 + max(0.0, season - 1.0) * 0.16 + rng.random() * 0.03
                )
                cdd_share = 0.10 + rng.random() * 0.05
                interim = int(dept_total * interim_share)
                cdd = int(dept_total * cdd_share)
                cdi = max(0, dept_total - interim - cdd)

                workforce_site_month[(site.code, month_start)] = (
                    workforce_site_month.get((site.code, month_start), 0.0) + dept_total
                )
                workforce_dept_month[(dept_name, month_start)] = (
                    workforce_dept_month.get((dept_name, month_start), 0.0) + dept_total
                )

                effectifs_rows.append(
                    {
                        "date_mois": month_start.isoformat(),
                        "site": site.code,
                        "departement": dept_name,
                        "effectif_total": dept_total,
                        "effectif_cdi": cdi,
                        "effectif_cdd": cdd,
                        "effectif_interim": interim,
                        "taux_feminisation": round(0.30 + 0.28 * rng.random(), 4),
                    }
                )

            working_days = len(_iter_working_days(month_start))
            absence_rate = 0.045
            if month_start.month in {11, 12, 1, 2}:
                absence_rate += 0.02
            elif month_start.month in {7, 8}:
                absence_rate -= 0.012

            total_abs_days = (
                workforce_site_month[(site.code, month_start)]
                * working_days
                * absence_rate
            )
            maladie = int(total_abs_days * (0.45 + rng.random() * 0.10))
            conges = int(total_abs_days * (0.28 + rng.random() * 0.08))
            rtt = int(total_abs_days * (0.12 + rng.random() * 0.05))
            autre = max(0, int(total_abs_days) - maladie - conges - rtt)
            denom = max(
                1.0, workforce_site_month[(site.code, month_start)] * working_days
            )
            taux_abs = round((maladie + conges + rtt + autre) / denom, 4)

            absences_rows.append(
                {
                    "date_mois": month_start.isoformat(),
                    "site": site.code,
                    "absences_maladie": maladie,
                    "absences_conges": conges,
                    "absences_rtt": rtt,
                    "absences_autre": autre,
                    "taux_absenteisme": taux_abs,
                }
            )

            site_workforce = workforce_site_month[(site.code, month_start)]
            for category, ratio in zip(categories, (0.78, 0.22), strict=True):
                workforce_category = site_workforce * ratio
                avg_salary = 2400.0 if category == "operateurs" else 4300.0
                salaire_brut = (
                    workforce_category * avg_salary * (0.96 + 0.08 * rng.random())
                )
                charges = salaire_brut * (0.40 + 0.06 * rng.random())
                primes = salaire_brut * (0.04 + 0.05 * max(0.0, season - 0.9))
                heures_sup = workforce_category * (1.1 + 1.7 * max(0.0, season - 1.0))
                heures_sup *= 0.85 + 0.35 * rng.random()
                cout_total = salaire_brut + charges + primes + heures_sup * 30.0

                payroll_rows.append(
                    {
                        "date_mois": month_start.isoformat(),
                        "site": site.code,
                        "categorie": category,
                        "salaire_brut_total": round(salaire_brut, 2),
                        "charges_patronales": round(charges, 2),
                        "primes": round(primes, 2),
                        "heures_sup": round(heures_sup, 2),
                        "cout_total": round(cout_total, 2),
                    }
                )

        for dept_name in departments:
            dept_workforce = workforce_dept_month[(dept_name, month_start)]
            season = _month_seasonality(month_start.month)
            entries = int(dept_workforce * (0.010 + 0.008 * rng.random()))
            exits = int(dept_workforce * (0.012 + 0.010 * max(0.0, season - 1.0)))
            exits = max(exits, int(entries * 0.6))
            turnover_rows.append(
                {
                    "date_mois": month_start.isoformat(),
                    "departement": dept_name,
                    "entrees": entries,
                    "sorties": exits,
                    "taux_turnover": round(exits / max(1.0, dept_workforce), 4),
                    "anciennete_moyenne": round(
                        6.0
                        + (0.8 if dept_name == "Support" else 0.0)
                        + rng.random() * 1.8,
                        2,
                    ),
                }
            )

    _inject_missing(effectifs_rows, field="taux_feminisation", rate=0.04, rng=rng)
    _inject_missing(effectifs_rows, field="effectif_interim", rate=0.03, rng=rng)
    _inject_missing(absences_rows, field="absences_autre", rate=0.06, rng=rng)
    _inject_missing(turnover_rows, field="anciennete_moyenne", rate=0.05, rng=rng)
    _inject_missing(payroll_rows, field="primes", rate=0.03, rng=rng)
    _inject_missing(payroll_rows, field="heures_sup", rate=0.02, rng=rng)

    _inject_outliers(
        effectifs_rows, field="effectif_interim", factor=4.2, count=3, rng=rng
    )
    _inject_outliers(
        absences_rows, field="absences_maladie", factor=2.8, count=3, rng=rng
    )
    _inject_outliers(payroll_rows, field="heures_sup", factor=3.6, count=3, rng=rng)

    _append_duplicates(effectifs_rows, ratio=0.03, rng=rng)
    _append_duplicates(absences_rows, ratio=0.04, rng=rng)
    _append_duplicates(turnover_rows, ratio=0.03, rng=rng)
    _append_duplicates(payroll_rows, ratio=0.03, rng=rng)

    return {
        "effectifs": effectifs_rows,
        "absences": absences_rows,
        "turnover": turnover_rows,
        "masse_salariale": payroll_rows,
    }


def _rows_to_csv_bytes(rows: list[dict[str, object]]) -> bytes:
    if not rows:
        return b""
    fields = list(rows[0].keys())
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=fields, delimiter=";")
    writer.writeheader()
    for row in rows:
        serialized = {k: ("" if v is None else v) for k, v in row.items()}
        writer.writerow(serialized)
    return buffer.getvalue().encode("utf-8-sig")


def _quality_config_from_dataset(dataset: ClientDataset) -> QualityConfig:
    raw = dataset.pipeline_config.get("data_quality", {})
    allowed = {
        key: val
        for key, val in raw.items()
        if key in QualityConfig.__dataclass_fields__
    }
    return QualityConfig(**allowed)


async def _log_ingestion_failure(
    session: AsyncSession,
    *,
    dataset_id: uuid.UUID,
    started_at: datetime,
    file_name: str,
    file_size: int,
    rows_received: int,
    error_message: str,
) -> None:
    session.add(
        IngestionLog(
            dataset_id=dataset_id,
            mode=IngestionMode.FILE_UPLOAD,
            rows_received=rows_received,
            rows_transformed=0,
            started_at=started_at,
            completed_at=datetime.now(UTC),
            status=RunStatus.FAILED,
            error_message=error_message[:500],
            triggered_by="seed:db-pipeline",
            file_name=file_name,
            file_size=file_size,
        )
    )
    await session.flush()


async def _ingest_dataset_rows(
    session: AsyncSession,
    *,
    dataset: ClientDataset,
    columns: list[DatasetColumn],
    rows: list[dict[str, object]],
    file_name: str,
    strict_mapping: bool = False,
    source_to_target: dict[str, str] | None = None,
) -> int:
    started_at = datetime.now(UTC)
    content = _rows_to_csv_bytes(rows)
    if not content:
        await _log_ingestion_failure(
            session,
            dataset_id=dataset.id,
            started_at=started_at,
            file_name=file_name,
            file_size=0,
            rows_received=0,
            error_message="Empty payload",
        )
        return 0

    file_size = len(content)

    try:
        parse_result = await asyncio.to_thread(
            parse_file,
            content,
            file_name,
            format_hint="csv",
        )
        if source_to_target:
            target_names = {col.name for col in columns}
            mappings: list[ColumnMapping] = []
            matched_targets: set[str] = set()
            unmapped_source: list[str] = []
            for source_col in parse_result.source_columns:
                target_col = source_to_target.get(source_col)
                if (
                    target_col
                    and target_col in target_names
                    and target_col not in matched_targets
                ):
                    mappings.append(
                        ColumnMapping(
                            source_column=source_col,
                            target_column=target_col,
                            confidence=1.0,
                            transform=None,
                        )
                    )
                    matched_targets.add(target_col)
                else:
                    unmapped_source.append(source_col)

            mapping_result = MappingResult(
                mappings=mappings,
                unmapped_source=unmapped_source,
                unmapped_target=sorted(target_names - matched_targets),
                warnings=[],
            )
        else:
            mapping_result = map_columns(
                source_columns=parse_result.source_columns,
                dataset_columns=columns,
                format_hint="csv",
            )
        if strict_mapping and (
            mapping_result.unmapped_source or mapping_result.unmapped_target
        ):
            missing_src = ", ".join(mapping_result.unmapped_source) or "-"
            missing_tgt = ", ".join(mapping_result.unmapped_target) or "-"
            msg = (
                f"Strict column mapping failed for {file_name}: "
                f"unmapped source [{missing_src}] / target [{missing_tgt}]"
            )
            raise RuntimeError(msg)  # noqa: TRY301
        quality_result = await asyncio.to_thread(
            run_quality_checks,
            parse_result.rows,
            columns,
            dataset.temporal_index,
            dataset.group_by or [],
            _quality_config_from_dataset(dataset),
        )
        insertion_result = await asyncio.to_thread(
            insert_raw_rows,
            dataset.schema_data,
            dataset.table_name,
            mapping_result.mappings,
            quality_result.cleaned_rows,
        )
    except Exception as exc:
        await _log_ingestion_failure(
            session,
            dataset_id=dataset.id,
            started_at=started_at,
            file_name=file_name,
            file_size=file_size,
            rows_received=0,
            error_message=str(exc),
        )
        raise

    log_entry = IngestionLog(
        dataset_id=dataset.id,
        mode=IngestionMode.FILE_UPLOAD,
        rows_received=parse_result.row_count,
        rows_transformed=insertion_result.rows_inserted,
        started_at=started_at,
        completed_at=datetime.now(UTC),
        status=RunStatus.SUCCESS,
        triggered_by="seed:db-pipeline",
        file_name=file_name,
        file_size=file_size,
    )
    session.add(log_entry)
    await session.flush()

    quality_report = QualityReport(
        dataset_id=dataset.id,
        ingestion_log_id=log_entry.id,
        rows_received=quality_result.rows_received,
        rows_after_dedup=quality_result.rows_after_dedup,
        rows_after_quality=quality_result.rows_after_quality,
        duplicates_found=quality_result.duplicates_found,
        missing_values_found=quality_result.missing_total,
        missing_values_imputed=quality_result.missing_imputed,
        outliers_found=quality_result.outliers_total,
        outliers_clamped=quality_result.outliers_clamped,
        column_details={
            name: asdict(report)
            for name, report in quality_result.column_reports.items()
        },
        strategy_config=quality_result.config_snapshot,
    )
    session.add(quality_report)
    await session.flush()
    return insertion_result.rows_inserted


async def _dataset_has_materialized_rows(
    session: AsyncSession,
    *,
    tenant: TenantFilter,
    dataset_id: uuid.UUID,
) -> bool:
    rows, total, _ = await get_dataset_data(
        dataset_id,
        tenant,
        session,
        limit=1,
        offset=0,
    )
    return bool(rows) or total > 0


async def _fetch_dataset_columns(
    session: AsyncSession,
    dataset_id: uuid.UUID,
) -> list[DatasetColumn]:
    result = await session.execute(
        select(DatasetColumn)
        .where(DatasetColumn.dataset_id == dataset_id)
        .order_by(DatasetColumn.ordinal_position.asc())
    )
    return list(result.scalars().all())


async def _ensure_dataset(
    session: AsyncSession,
    *,
    org: Organization,
    schema_name: str,
    definition: dict[str, object],
) -> tuple[ClientDataset, list[DatasetColumn], bool]:
    name = str(definition["name"])
    existing = await session.execute(
        select(ClientDataset).where(
            ClientDataset.organization_id == org.id,
            ClientDataset.name == name,
        )
    )
    dataset = existing.scalar_one_or_none()
    created = False

    if dataset is None:
        dataset = ClientDataset(
            id=uuid.uuid4(),
            organization_id=org.id,
            name=name,
            schema_data=schema_name,
            table_name=str(definition["table_name"]),
            temporal_index=str(definition["temporal_index"]),
            group_by=list(definition["group_by"]),
            pipeline_config=dict(definition["pipeline_config"]),
            status=DatasetStatus.ACTIVE,
            metadata_hash=None,
        )
        session.add(dataset)
        await session.flush()

        column_models: list[DatasetColumn] = []
        for idx, (col_name, dtype, role) in enumerate(definition["columns"]):
            col = DatasetColumn(
                id=uuid.uuid4(),
                dataset_id=dataset.id,
                name=col_name,
                dtype=dtype,
                role=role,
                nullable=(role not in {ColumnRole.TEMPORAL_INDEX, ColumnRole.GROUP_BY}),
                rules_override=None,
                ordinal_position=idx,
            )
            session.add(col)
            column_models.append(col)
        await session.flush()
        created = True
    else:
        column_models = await _fetch_dataset_columns(session, dataset.id)

    # Ensure underlying dynamic tables always exist.
    await create_dataset_tables(dataset, column_models)
    return dataset, column_models, created


async def _fetch_all_dataset_rows(
    session: AsyncSession,
    *,
    tenant: TenantFilter,
    dataset_id: uuid.UUID,
    page_size: int = 5_000,
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    offset = 0
    total = 0
    while True:
        batch, total, _ = await get_dataset_data(
            dataset_id,
            tenant,
            session,
            limit=page_size,
            offset=offset,
        )
        if not batch:
            break
        rows.extend(batch)
        offset += len(batch)
        if offset >= total:
            break
    return rows


def _round_decimal(value: float, places: int) -> Decimal:
    return Decimal(str(round(value, places)))


def _percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    idx = (len(sorted_vals) - 1) * p
    lo = math.floor(idx)
    hi = math.ceil(idx)
    if lo == hi:
        return sorted_vals[lo]
    ratio = idx - lo
    return sorted_vals[lo] * (1.0 - ratio) + sorted_vals[hi] * ratio


def _build_canonical_records_from_rows(
    effectifs_rows: list[dict[str, object]],
    absences_rows: list[dict[str, object]],
    payroll_rows: list[dict[str, object]],
) -> list[dict[str, object]]:
    effectifs: dict[tuple[str, date], dict[str, float]] = {}
    absences: dict[tuple[str, date], dict[str, float]] = {}
    payroll: dict[tuple[str, date], dict[str, float]] = {}

    for row in effectifs_rows:
        month = _as_date(row.get("date_mois"))
        site = str(row.get("site") or "").strip()
        if month is None or not site:
            continue
        key = (site, month.replace(day=1))
        agg = effectifs.setdefault(key, {"total": 0.0, "interim": 0.0})
        agg["total"] += max(0.0, _as_float(row.get("effectif_total")))
        agg["interim"] += max(0.0, _as_float(row.get("effectif_interim")))

    for row in absences_rows:
        month = _as_date(row.get("date_mois"))
        site = str(row.get("site") or "").strip()
        if month is None or not site:
            continue
        key = (site, month.replace(day=1))
        agg = absences.setdefault(key, {"abs_days": 0.0})
        agg["abs_days"] += max(0.0, _as_float(row.get("absences_maladie")))
        agg["abs_days"] += max(0.0, _as_float(row.get("absences_conges")))
        agg["abs_days"] += max(0.0, _as_float(row.get("absences_rtt")))
        agg["abs_days"] += max(0.0, _as_float(row.get("absences_autre")))

    for row in payroll_rows:
        month = _as_date(row.get("date_mois"))
        site = str(row.get("site") or "").strip()
        if month is None or not site:
            continue
        key = (site, month.replace(day=1))
        agg = payroll.setdefault(key, {"cout_total": 0.0, "heures_sup": 0.0})
        agg["cout_total"] += max(0.0, _as_float(row.get("cout_total")))
        agg["heures_sup"] += max(0.0, _as_float(row.get("heures_sup")))

    records: list[dict[str, object]] = []
    for (site, month_start), eff in sorted(effectifs.items()):
        work_days = _iter_working_days(month_start)
        if not work_days:
            continue
        effectif_total = eff["total"]
        if effectif_total <= 0:
            continue

        working_count = float(len(work_days))
        abs_days = absences.get((site, month_start), {}).get(
            "abs_days", effectif_total * working_count * 0.04
        )
        payroll_metrics = payroll.get((site, month_start), {})
        monthly_cost = payroll_metrics.get("cout_total", 0.0)
        monthly_hs = payroll_metrics.get("heures_sup", 0.0)

        for day in work_days:
            day_factor = 0.98 + (0.06 if day.weekday() in (0, 1) else 0.0)
            day_factor += -0.03 if day.weekday() == 5 else 0.0
            day_factor *= 0.94 + 0.10 * _month_seasonality(day.month)

            for shift, share in (("am", 0.52), ("pm", 0.48)):
                rng = random.Random(f"{site}|{day.isoformat()}|{shift}")  # noqa: S311

                cap_plan_h = (
                    effectif_total
                    * _WORK_HOURS_PER_FTE_DAY
                    * share
                    * day_factor
                    / working_count
                )
                abs_h = (
                    abs_days
                    * _WORK_HOURS_PER_FTE_DAY
                    * share
                    / working_count
                    * (0.84 + 0.30 * rng.random())
                )
                hs_h = monthly_hs * share / working_count * (0.80 + 0.40 * rng.random())
                interim_h = (
                    eff["interim"]
                    * _WORK_HOURS_PER_FTE_DAY
                    * share
                    / working_count
                    * 0.55
                    * (0.82 + 0.36 * rng.random())
                )
                friction = cap_plan_h * (0.018 + 0.03 * rng.random())
                realise_h = max(0.0, cap_plan_h - abs_h + hs_h + interim_h - friction)

                demand = _demand_factor(day) * (0.92 + 0.16 * rng.random())
                charge_units = max(1, int(round(realise_h * demand)))
                cout_interne = (
                    monthly_cost * share / working_count
                    if monthly_cost > 0
                    else realise_h * 27.0
                )

                if rng.random() < 0.012:
                    continue

                records.append(
                    {
                        "site_id": site,
                        "date": day,
                        "shift": shift,
                        "competence": (
                            "Exploitation" if rng.random() < 0.72 else "Support"
                        ),
                        "charge_units": _round_decimal(charge_units, 2),
                        "capacite_plan_h": _round_decimal(cap_plan_h, 2),
                        "realise_h": _round_decimal(realise_h, 2),
                        "abs_h": _round_decimal(max(0.0, abs_h), 2),
                        "hs_h": _round_decimal(max(0.0, hs_h), 2),
                        "interim_h": _round_decimal(max(0.0, interim_h), 2),
                        "cout_interne_est": _round_decimal(max(0.0, cout_interne), 2),
                    }
                )
    return records


async def _seed_cost_parameters_from_canonical(
    session: AsyncSession,
    *,
    org: Organization,
) -> int:
    existing = await session.execute(
        select(CostParameter.id).where(CostParameter.organization_id == org.id).limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        return 0

    result = await session.execute(
        select(CanonicalRecord).where(CanonicalRecord.organization_id == org.id)
    )
    records = list(result.scalars().all())
    if not records:
        return 0

    by_site: dict[str, list[CanonicalRecord]] = {}
    for rec in records:
        by_site.setdefault(rec.site_id, []).append(rec)

    effective_from = min(rec.date for rec in records)
    site_rates: list[float] = []
    created = 0

    for site_id, site_records in by_site.items():
        rates: list[float] = []
        hs_values: list[float] = []
        interim_values: list[float] = []
        for rec in site_records:
            realised = _as_float(rec.realise_h)
            cost = _as_float(rec.cout_interne_est)
            if realised > 0 and cost > 0:
                rates.append(cost / realised)
            hs_values.append(_as_float(rec.hs_h))
            interim_values.append(_as_float(rec.interim_h))

        base_rate = statistics.median(rates) if rates else 24.0
        site_rates.append(base_rate)

        c_int = _round_decimal(min(max(base_rate, 18.0), 42.0), 2)
        c_interim = _round_decimal(float(c_int) * 1.55, 2)
        c_backlog = _round_decimal(float(c_int) * 2.80, 2)
        cap_hs = max(8, int(round(_percentile(hs_values, 0.95) + 6)))
        cap_interim = max(10, int(round(_percentile(interim_values, 0.95) + 10)))

        session.add(
            CostParameter(
                id=uuid.uuid4(),
                organization_id=org.id,
                site_id=site_id,
                version=1,
                c_int=c_int,
                maj_hs=Decimal("0.2500"),
                c_interim=c_interim,
                premium_urgence=Decimal("0.1000"),
                c_backlog=c_backlog,
                cap_hs_shift=cap_hs,
                cap_interim_site=cap_interim,
                lead_time_jours=2,
                effective_from=effective_from,
                effective_until=None,
            )
        )
        created += 1

    org_rate = statistics.mean(site_rates) if site_rates else 24.0
    c_int_org = _round_decimal(min(max(org_rate, 18.0), 42.0), 2)
    session.add(
        CostParameter(
            id=uuid.uuid4(),
            organization_id=org.id,
            site_id=None,
            version=1,
            c_int=c_int_org,
            maj_hs=Decimal("0.2500"),
            c_interim=_round_decimal(float(c_int_org) * 1.55, 2),
            premium_urgence=Decimal("0.1000"),
            c_backlog=_round_decimal(float(c_int_org) * 2.80, 2),
            cap_hs_shift=30,
            cap_interim_site=50,
            lead_time_jours=2,
            effective_from=effective_from,
            effective_until=None,
        )
    )
    created += 1

    await session.flush()
    return created


# ── Step 1: Organization ─────────────────────────────────


_DEFAULT_SETTINGS = {
    "alertThresholds": {
        "understaffingRisk": 15,
        "absenceRate": 8,
        "consecutiveAbsences": 3,
        "forecastAccuracy": 90,
    },
    "shiftDefinitions": [
        {
            "code": "AM",
            "start": "06:00",
            "end": "14:00",
            "label": "Matin",
        },
        {
            "code": "PM",
            "start": "14:00",
            "end": "22:00",
            "label": "Apres-midi",
        },
    ],
    "workingDays": {
        "monday": True,
        "tuesday": True,
        "wednesday": True,
        "thursday": True,
        "friday": True,
        "saturday": False,
        "sunday": False,
    },
}


async def _step1_organization(
    session: AsyncSession,
    *,
    target_org_id: uuid.UUID | None = None,
) -> Organization | None:
    """Get or create the seed target organization.

    If *target_org_id* is given, load that org and ensure it has
    alertThresholds in settings. Otherwise fall back to creating a
    fresh "Praedixa Demo" org (idempotent by slug).
    """
    if target_org_id is not None:
        result = await session.execute(
            select(Organization).where(Organization.id == target_org_id)
        )
        org = result.scalar_one_or_none()
        if org is None:
            log.warning("step1_organization: target org not found")
            return None
        current = org.settings or {}
        if "alertThresholds" not in current:
            current.update(_DEFAULT_SETTINGS)
            org.settings = current
            await session.flush()
        log.info("step1_organization: using existing", org_id=str(org.id))
        return org

    result = await session.execute(
        select(Organization).where(
            Organization.slug.in_(
                [
                    "acme-logistics",
                    "demo_org",
                    "praedixa_demo",
                    "praedixa-demo",
                ]
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        current = existing.settings or {}
        if "alertThresholds" not in current:
            current.update(_DEFAULT_SETTINGS)
            existing.settings = current
            await session.flush()
        log.info("step1_organization: reusing existing", org_id=str(existing.id))
        return existing

    org = Organization(
        id=uuid.UUID("10000000-0000-0000-0000-000000000001"),
        name="Acme Logistics",
        slug="acme-logistics",
        legal_name="Praedixa Demo SAS",
        siret="98765432109876",
        sector=IndustrySector.LOGISTICS,
        size=OrganizationSize.LARGE,
        headcount=1200,
        status=OrganizationStatus.ACTIVE,
        plan=SubscriptionPlan.ENTERPRISE,
        contact_email="demo@praedixa.com",
        settings=_DEFAULT_SETTINGS,
    )
    session.add(org)
    await session.flush()
    log.info("step1_organization: created", org_id=str(org.id))
    return org


# ── Step 2: Sites ────────────────────────────────────────


async def _step2_sites(session: AsyncSession, org: Organization) -> list[Site]:
    """Create 6 sites from embedded blueprints."""
    existing_result = await session.execute(
        select(Site).where(Site.organization_id == org.id).order_by(Site.code.asc())
    )
    existing_sites = list(existing_result.scalars().all())
    if existing_sites:
        log.info("step2_sites: reusing existing", count=len(existing_sites))
        return existing_sites

    sites: list[Site] = []
    for blueprint in _DEMO_SITE_BLUEPRINTS:
        site = Site(
            id=uuid.uuid4(),
            organization_id=org.id,
            name=str(blueprint["name"]),
            code=str(blueprint["code"]),
            address={"city": str(blueprint["city"]), "country": "France"},
            headcount=int(blueprint["headcount"]),
        )
        session.add(site)
        sites.append(site)

    await session.flush()
    log.info("step2_sites: created", count=len(sites))
    return sites


# ── Step 3: Departments ──────────────────────────────────


async def _step3_departments(
    session: AsyncSession, org: Organization, sites: list[Site]
) -> list[Department]:
    """Create 2 departments per site: Exploitation + Support."""
    existing_result = await session.execute(
        select(Department)
        .where(Department.organization_id == org.id)
        .order_by(Department.code.asc())
    )
    existing_departments = list(existing_result.scalars().all())
    if existing_departments:
        log.info("step3_departments: reusing existing", count=len(existing_departments))
        return existing_departments

    departments: list[Department] = []
    for site in sites:
        for dept_name, headcount_pct in [("Exploitation", 0.7), ("Support", 0.3)]:
            dept = Department(
                id=uuid.uuid4(),
                organization_id=org.id,
                site_id=site.id,
                name=f"{dept_name} — {site.name}",
                code=f"{site.code}_{dept_name[:3].upper()}",
                headcount=int(site.headcount * headcount_pct),
            )
            session.add(dept)
            departments.append(dept)

    await session.flush()
    log.info("step3_departments: created", count=len(departments))
    return departments


# ── Step 4: Datasets + DB ingestion pipeline ─────────────


async def _step4_datasets(
    session: AsyncSession,
    org: Organization,
    sites: list[Site],
) -> int:
    """Create datasets/tables and ingest both core + external client datasets."""
    created = 0
    ingested_rows = 0
    schema_slug = _schema_safe_slug(org.slug)
    try:
        schema_name = await create_client_schemas(schema_slug)
    except InsufficientPrivilege:
        log.warning(
            "step4_datasets: skipped_no_ddl_privilege",
            org_id=str(org.id),
            org_slug=org.slug,
            schema_slug=schema_slug,
        )
        return -1
    tenant = TenantFilter(organization_id=str(org.id))
    source_rows_by_dataset = _build_dataset_source_rows(sites)

    for definition in DEMO_DATASETS:
        dataset, columns, was_created = await _ensure_dataset(
            session,
            org=org,
            schema_name=schema_name,
            definition=definition,
        )
        if was_created:
            created += 1

        if await _dataset_has_materialized_rows(
            session,
            tenant=tenant,
            dataset_id=dataset.id,
        ):
            continue

        dataset_name = str(definition["name"])
        rows = source_rows_by_dataset.get(dataset_name, [])
        ingested_rows += await _ingest_dataset_rows(
            session,
            dataset=dataset,
            columns=columns,
            rows=rows,
            file_name=f"{dataset_name}_seed.csv",
        )

    external_seeds = await _load_external_dataset_seeds(org.slug)
    for seed in external_seeds:
        dataset, columns, was_created = await _ensure_dataset(
            session,
            org=org,
            schema_name=schema_name,
            definition=seed.definition,
        )
        if was_created:
            created += 1

        if await _dataset_has_materialized_rows(
            session,
            tenant=tenant,
            dataset_id=dataset.id,
        ):
            continue

        ingested_rows += await _ingest_dataset_rows(
            session,
            dataset=dataset,
            columns=columns,
            rows=seed.rows,
            file_name=seed.file_name,
            strict_mapping=True,
            source_to_target=seed.definition.get("source_to_target"),
        )

    log.info(
        "step4_datasets: completed",
        created=created,
        rows_ingested=ingested_rows,
    )
    return created


# ── Step 5: Canonical + cost parameters from DB datasets ─


async def _step5_canonical(session: AsyncSession, org: Organization) -> None:
    """Build canonical records and cost parameters from DB-cleaned dataset rows."""
    tenant = TenantFilter(organization_id=str(org.id))
    dataset_result = await session.execute(
        select(ClientDataset).where(
            ClientDataset.organization_id == org.id,
            ClientDataset.name.in_(["effectifs", "absences", "masse_salariale"]),
        )
    )
    datasets = {ds.name: ds for ds in dataset_result.scalars().all()}

    missing = [
        name
        for name in ("effectifs", "absences", "masse_salariale")
        if name not in datasets
    ]
    if missing:
        msg = f"Missing datasets required for canonical build: {', '.join(missing)}"
        raise RuntimeError(msg)

    effectifs_rows = await _fetch_all_dataset_rows(
        session,
        tenant=tenant,
        dataset_id=datasets["effectifs"].id,
    )
    absences_rows = await _fetch_all_dataset_rows(
        session,
        tenant=tenant,
        dataset_id=datasets["absences"].id,
    )
    payroll_rows = await _fetch_all_dataset_rows(
        session,
        tenant=tenant,
        dataset_id=datasets["masse_salariale"].id,
    )

    canonical_payload = _build_canonical_records_from_rows(
        effectifs_rows,
        absences_rows,
        payroll_rows,
    )
    inserted, skipped = await bulk_import_canonical(session, tenant, canonical_payload)
    cost_params_created = await _seed_cost_parameters_from_canonical(session, org=org)

    log.info(
        "step5_canonical: built_from_db",
        source_effectifs=len(effectifs_rows),
        source_absences=len(absences_rows),
        source_payroll=len(payroll_rows),
        canonical_inserted=inserted,
        canonical_skipped=skipped,
        cost_params=cost_params_created,
    )


# ── Step 6: Mock Forecasts → Coverage Alerts ─────────────


async def _step6_forecasts(session: AsyncSession, org: Organization) -> int:
    """Generate mock coverage alerts from canonical data heuristics."""
    tenant = TenantFilter(organization_id=str(org.id))
    alerts_count = await generate_mock_forecasts(session, tenant, days_lookback=90)
    log.info("step6_forecasts: alerts generated", count=alerts_count)
    return alerts_count


# ── Step 7: Scenario Options ────────────────────────────


async def _step7_scenarios(session: AsyncSession, org: Organization) -> int:
    """Generate scenario options for each coverage alert."""
    tenant = TenantFilter(organization_id=str(org.id))

    result = await session.execute(tenant.apply(select(CoverageAlert), CoverageAlert))
    alerts = list(result.scalars().all())

    total_options = 0
    for alert in alerts:
        options = await generate_scenarios(session, tenant, alert.id)
        total_options += len(options)

    log.info(
        "step7_scenarios: generated",
        alerts=len(alerts),
        options=total_options,
    )
    return total_options


# ── Step 8: Operational Decisions ────────────────────────


async def _step8_decisions(session: AsyncSession, org: Organization) -> int:
    """Create operational decisions for ~70% of alerts."""
    tenant = TenantFilter(organization_id=str(org.id))
    rng = random.Random(42)  # noqa: S311

    result = await session.execute(tenant.apply(select(CoverageAlert), CoverageAlert))
    alerts = list(result.scalars().all())

    decisions_created = 0
    for alert in alerts:
        # ~70% of alerts get a decision
        if rng.random() > _DECISION_PROBABILITY:
            continue

        # Load scenario options for this alert
        opts_result = await session.execute(
            tenant.apply(
                select(ScenarioOption).where(
                    ScenarioOption.coverage_alert_id == alert.id,
                ),
                ScenarioOption,
            )
        )
        options = list(opts_result.scalars().all())
        if not options:
            continue

        # Find the recommended option
        recommended = next((o for o in options if o.is_recommended), None)
        if recommended is None:
            recommended = options[0]

        # 80% choose recommended, 20% override
        is_override = rng.random() > _OVERRIDE_PROBABILITY
        if is_override and len(options) > 1:
            non_recommended = [o for o in options if o.id != recommended.id]
            chosen = rng.choice(non_recommended)
        else:
            chosen = recommended
            is_override = False

        cout_attendu = chosen.cout_total_eur
        cout_observe = Decimal(
            str(round(float(cout_attendu) * (0.85 + rng.random() * 0.30), 2))
        )
        service_observe = Decimal(str(round(0.85 + rng.random() * 0.15, 4)))

        decision = OperationalDecision(
            organization_id=org.id,
            coverage_alert_id=alert.id,
            recommended_option_id=recommended.id,
            chosen_option_id=chosen.id,
            site_id=alert.site_id,
            decision_date=alert.alert_date,
            shift=alert.shift,
            horizon=alert.horizon,
            gap_h=alert.gap_h,
            is_override=is_override,
            override_reason=rng.choice(_OVERRIDE_REASONS) if is_override else None,
            cout_attendu_eur=cout_attendu,
            service_attendu_pct=chosen.service_attendu_pct,
            cout_observe_eur=cout_observe,
            service_observe_pct=service_observe,
            decided_by=_MANAGER_UUID,
        )
        session.add(decision)
        decisions_created += 1

    if decisions_created > 0:
        await session.flush()

    log.info("step8_decisions: created", count=decisions_created)
    return decisions_created


# ── Step 9: Proof Records ───────────────────────────────


async def _step9_proof(
    session: AsyncSession, org: Organization, sites: list[Site]
) -> int:
    """Generate proof records for each site-month combination with decisions."""
    tenant = TenantFilter(organization_id=str(org.id))

    # Collect distinct (site_id, month) from decisions
    result = await session.execute(
        tenant.apply(
            select(
                OperationalDecision.site_id,
                OperationalDecision.decision_date,
            ),
            OperationalDecision,
        )
    )
    rows = result.all()

    site_months: set[tuple[str, date]] = set()
    for site_id, decision_date in rows:
        month_start = decision_date.replace(day=1)
        site_months.add((site_id, month_start))

    records_created = 0
    for site_id, month in site_months:
        await generate_proof_record(session, tenant, site_id=site_id, month=month)
        records_created += 1

    log.info("step9_proof: created", count=records_created)
    return records_created


# ── Step 10a: Dashboard Alerts ───────────────────────────


async def _step10a_dashboard_alerts(session: AsyncSession, org: Organization) -> int:
    """Create dashboard alerts from coverage alerts and decisions."""
    tenant = TenantFilter(organization_id=str(org.id))
    now = datetime.now(UTC)

    # Get a few critical/high alerts for RISK type
    risk_result = await session.execute(
        tenant.apply(
            select(CoverageAlert).where(
                CoverageAlert.severity.in_(
                    [
                        CoverageAlertSeverity.CRITICAL,
                        CoverageAlertSeverity.HIGH,
                    ]
                )
            ),
            CoverageAlert,
        ).limit(4)
    )
    risk_alerts = list(risk_result.scalars().all())

    created = 0
    for alert in risk_alerts:
        sev = (
            AlertSeverity.CRITICAL
            if alert.severity == CoverageAlertSeverity.CRITICAL
            else AlertSeverity.WARNING
        )
        da = DashboardAlert(
            id=uuid.uuid4(),
            organization_id=org.id,
            type=AlertType.RISK,
            severity=sev,
            title=f"Risque de sous-effectif {alert.site_id}",
            message=(
                f"Couverture insuffisante prevue le {alert.alert_date.isoformat()} "
                f"({alert.shift.value.upper()}) — "
                f"probabilite {float(alert.p_rupture):.0%}"
            ),
            related_entity_type=RelatedEntityType.FORECAST,
            action_url=f"/arbitrage?alert={alert.id}",
            action_label="Voir les scenarios",
            expires_at=now + timedelta(days=7),
        )
        session.add(da)
        created += 1

    # Forecast alerts (J+14 horizon)
    forecast_result = await session.execute(
        tenant.apply(
            select(CoverageAlert).where(CoverageAlert.horizon == "j14"),
            CoverageAlert,
        ).limit(3)
    )
    forecast_alerts = list(forecast_result.scalars().all())

    for alert in forecast_alerts:
        da = DashboardAlert(
            id=uuid.uuid4(),
            organization_id=org.id,
            type=AlertType.FORECAST,
            severity=AlertSeverity.INFO,
            title="Prevision J+14 : couverture a risque",
            message=(
                f"Site {alert.site_id} — gap estime {float(alert.gap_h):.1f}h, "
                f"impact {float(alert.impact_eur or 0):.0f} EUR"
            ),
            related_entity_type=RelatedEntityType.FORECAST,
            action_url="/previsions",
            action_label="Consulter les previsions",
            expires_at=now + timedelta(days=14),
        )
        session.add(da)
        created += 1

    # Decision alerts (recent decisions)
    dec_result = await session.execute(
        tenant.apply(select(OperationalDecision), OperationalDecision).limit(3)
    )
    recent_decisions = list(dec_result.scalars().all())

    for decision in recent_decisions:
        da = DashboardAlert(
            id=uuid.uuid4(),
            organization_id=org.id,
            type=AlertType.DECISION,
            severity=AlertSeverity.INFO,
            title=f"Decision validee pour {decision.site_id}",
            message=(
                f"Decision du {decision.decision_date.isoformat()} — "
                f"cout observe {float(decision.cout_observe_eur or 0):.0f} EUR"
            ),
            related_entity_type=RelatedEntityType.DECISION,
            action_url="/decisions",
            action_label="Voir les decisions",
            expires_at=now + timedelta(days=30),
        )
        session.add(da)
        created += 1

    await session.flush()
    log.info("step10a_dashboard_alerts: created", count=created)
    return created


# ── Step 10b: ForecastRun + DailyForecasts ───────────────


async def _step10b_forecast_run(
    session: AsyncSession,
    org: Organization,
    departments: list[Department],
) -> int:
    """Create a ForecastRun with ~60 DailyForecast records."""
    now = datetime.now(UTC)
    rng = random.Random(123)  # noqa: S311

    run = ForecastRun(
        id=uuid.uuid4(),
        organization_id=org.id,
        model_type=ForecastModelType.ENSEMBLE,
        model_version="1.2.0",
        horizon_days=14,
        status=ForecastStatus.COMPLETED,
        started_at=now - timedelta(hours=2),
        completed_at=now - timedelta(hours=1, minutes=45),
        accuracy_score=0.91,
        config={
            "metrics": {
                "mae": 3.2,
                "rmse": 5.1,
                "mape": 0.08,
            },
            "training_range": {
                "start": (now - timedelta(days=90)).date().isoformat(),
                "end": now.date().isoformat(),
            },
        },
    )
    session.add(run)
    await session.flush()

    # Pick first 2 departments for forecasts
    dept_ids = [d.id for d in departments[:2]] if departments else [None]

    forecasts_created = 0
    today = now.date()

    for day_offset in range(30):
        forecast_date = today + timedelta(days=day_offset - 15)
        for dimension in [ForecastDimension.HUMAN, ForecastDimension.MERCHANDISE]:
            dept_id = rng.choice(dept_ids)

            if dimension == ForecastDimension.HUMAN:
                base_demand = 120.0 + rng.gauss(0, 15)
                base_capacity = 140.0 + rng.gauss(0, 10)
            else:
                base_demand = 850.0 + rng.gauss(0, 80)
                base_capacity = 900.0 + rng.gauss(0, 60)

            capacity_planned_current = round(base_capacity, 2)
            capacity_planned_predicted = round(
                max(0.0, base_capacity - abs(rng.gauss(8.0, 4.0))),
                2,
            )
            capacity_optimal_predicted = round(
                max(base_demand, capacity_planned_predicted),
                2,
            )

            gap = round(base_demand - capacity_planned_predicted, 2)
            risk_score = round(
                max(0, min(100, gap / max(capacity_planned_predicted, 1.0) * 100)),
                2,
            )
            conf_spread = abs(base_demand * 0.1)

            df = DailyForecast(
                id=uuid.uuid4(),
                organization_id=org.id,
                forecast_run_id=run.id,
                department_id=dept_id,
                forecast_date=forecast_date,
                dimension=dimension,
                predicted_demand=round(base_demand, 2),
                predicted_capacity=capacity_planned_predicted,
                capacity_planned_current=capacity_planned_current,
                capacity_planned_predicted=capacity_planned_predicted,
                capacity_optimal_predicted=capacity_optimal_predicted,
                gap=gap,
                risk_score=risk_score,
                confidence_lower=round(base_demand - conf_spread, 2),
                confidence_upper=round(base_demand + conf_spread, 2),
                details={
                    "breakdown": {
                        "absence_impact": round(rng.uniform(2, 8), 1),
                        "seasonal_factor": round(rng.uniform(0.9, 1.1), 2),
                    }
                },
            )
            session.add(df)
            forecasts_created += 1

    await session.flush()
    log.info(
        "step10b_forecast_run: created",
        run_id=str(run.id),
        forecasts=forecasts_created,
    )
    return forecasts_created


# ── Main pipeline ────────────────────────────────────────


async def seed_all(
    session: AsyncSession,
    *,
    target_org_id: uuid.UUID | None = None,
    strict_step4: bool = False,
) -> None:
    """Seed all demo data. Idempotent.

    If *target_org_id* is given, seed into that existing org.
    Otherwise create a fresh "praedixa-demo" org.
    """
    log.info("seed_full_demo: starting pipeline")

    # Step 1: Organization
    org = await _step1_organization(session, target_org_id=target_org_id)
    if org is None:
        return  # Already seeded or not found

    # Step 2: Sites
    sites = await _step2_sites(session, org)

    # Step 3: Departments
    departments = await _step3_departments(session, org, sites)

    # Step 4: Datasets + DB pipeline ingestion
    step4_rows = await _step4_datasets(session, org, sites)
    if step4_rows < 0:
        if strict_step4:
            msg = (
                "Unable to provision datasets for organization due to missing "
                "DDL privileges (CREATE SCHEMA)."
            )
            raise RuntimeError(msg)
        # Dev auto-seed mode: skip silently for existing orgs when DDL is unavailable.
        # If this call was creating a brand new org (target_org_id is None), fail fast
        # to avoid persisting a partially initialized tenant.
        if target_org_id is None:
            msg = (
                "Skipped organization provisioning due to missing DDL privileges "
                "(CREATE SCHEMA)."
            )
            raise RuntimeError(msg)
        log.warning(
            "seed_full_demo: skipped_after_step4",
            org_id=str(org.id),
            reason="missing ddl privilege",
        )
        return

    # If operational artifacts already exist, stop after data sync.
    existing_alerts = await session.execute(
        select(CoverageAlert.id).where(CoverageAlert.organization_id == org.id).limit(1)
    )
    if existing_alerts.scalar_one_or_none() is not None:
        log.info(
            "seed_full_demo: operational data already present, stopped after step4"
        )
        return

    # Step 5: Canonical records + cost parameters
    await _step5_canonical(session, org)

    # Step 6: Mock forecasts → coverage alerts
    await _step6_forecasts(session, org)

    # Step 7: Scenario options
    await _step7_scenarios(session, org)

    # Step 8: Operational decisions
    await _step8_decisions(session, org)

    # Step 9: Proof records
    await _step9_proof(session, org, sites)

    # Step 10a: Dashboard alerts
    await _step10a_dashboard_alerts(session, org)

    # Step 10b: ForecastRun + DailyForecasts
    await _step10b_forecast_run(session, org, departments)

    log.info("seed_full_demo: pipeline complete")


async def main() -> None:
    """Entry point: create session and run the full seed pipeline."""
    async with async_session_factory() as session:
        try:
            await seed_all(session)
            await session.commit()
            log.info("seed_full_demo: committed successfully")
        except Exception:
            await session.rollback()
            log.exception("seed_full_demo: failed, rolled back")
            raise

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
