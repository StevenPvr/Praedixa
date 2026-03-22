"""Minimal persistent organization foundation bootstrap.

This module provisions only the persistent base needed for a tenant to exist in
Praedixa:
- organization settings
- sites
- departments
- foundation datasets and their initial ingestion

It must stay independent from the demo-only operational seed pipeline.
"""

from __future__ import annotations

import asyncio
import csv
import hashlib
import io
import random
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING, Any, cast

import structlog
from psycopg.errors import InsufficientPrivilege
from sqlalchemy import select

from app.core.ddl_validation import (
    DDLValidationError,
    validate_client_slug,
)
from app.core.security import TenantFilter
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
from app.models.organization import Organization
from app.models.site import Site
from app.services.column_mapper import map_columns
from app.services.datasets import get_dataset_data
from app.services.file_parser import parse_file
from app.services.quality import QualityConfig, run_quality_checks
from app.services.raw_inserter import insert_raw_rows
from app.services.schema_manager import create_client_schemas, create_dataset_tables

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


log = structlog.get_logger()

_COMPLETED_MONTHS = 12
_WEEKDAY_SUNDAY = 6

type DatasetRow = dict[str, object]
type ColumnSpec = tuple[str, ColumnDtype, ColumnRole]


@dataclass(frozen=True)
class SiteBlueprint:
    code: str
    name: str
    city: str
    headcount: int


@dataclass(frozen=True)
class FoundationDatasetDefinition:
    name: str
    table_name: str
    temporal_index: str
    group_by: tuple[str, ...]
    pipeline_config: dict[str, object]
    columns: tuple[ColumnSpec, ...]


@dataclass(frozen=True)
class OrganizationFoundation:
    """Artifacts created or reused by the organization foundation bootstrap."""

    organization: Organization
    sites: list[Site]
    departments: list[Department]
    datasets_created: int


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


def _json_object(value: object) -> dict[str, object]:
    if not isinstance(value, dict):
        return {}
    return cast("dict[str, object]", value)


def _quality_duplicate_columns(value: object) -> list[str] | None:
    if not isinstance(value, list):
        return None
    list_value = cast("list[object]", value)
    columns = [item for item in list_value if isinstance(item, str) and item]
    return columns or None


def _quality_float(value: object, default: float) -> float:
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        return float(value)
    return default


def _quality_int(value: object, default: int) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    return default


def _quality_str(value: object, default: str) -> str:
    return value if isinstance(value, str) and value else default


def _quality_column_overrides(value: object) -> dict[str, dict[str, Any]]:
    if not isinstance(value, dict):
        return {}
    normalized: dict[str, dict[str, Any]] = {}
    for key, raw_override in cast("dict[object, object]", value).items():
        if isinstance(key, str) and isinstance(raw_override, dict):
            normalized[key] = cast("dict[str, Any]", raw_override)
    return normalized

_FOUNDATION_SITE_BLUEPRINTS: list[SiteBlueprint] = [
    SiteBlueprint("S_LYON", "Lyon Logistics", "Lyon", 450),
    SiteBlueprint("S_ORLEANS", "Orleans Hub", "Orleans", 300),
    SiteBlueprint("S_LILLE", "Lille Distribution", "Lille", 250),
    SiteBlueprint("S_NANTES", "Nantes Centre", "Nantes", 200),
    SiteBlueprint("S_BORDEAUX", "Bordeaux Plateforme", "Bordeaux", 350),
    SiteBlueprint("S_MARSEILLE", "Marseille Port", "Marseille", 400),
]

_FOUNDATION_DATASETS: list[FoundationDatasetDefinition] = [
    FoundationDatasetDefinition(
        name="effectifs",
        table_name="effectifs",
        temporal_index="date_mois",
        group_by=("site", "departement"),
        pipeline_config={
            "data_quality": {
                "missing_threshold_delete": 0.08,
                "outlier_method": "iqr",
            }
        },
        columns=(
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("site", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("departement", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("effectif_total", ColumnDtype.INTEGER, ColumnRole.TARGET),
            ("effectif_cdi", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("effectif_cdd", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("effectif_interim", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_feminisation", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ),
    ),
    FoundationDatasetDefinition(
        name="absences",
        table_name="absences",
        temporal_index="date_mois",
        group_by=("site",),
        pipeline_config={
            "data_quality": {
                "missing_threshold_delete": 0.10,
                "outlier_method": "iqr",
            }
        },
        columns=(
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("site", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("absences_maladie", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("absences_conges", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("absences_rtt", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("absences_autre", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_absenteisme", ColumnDtype.FLOAT, ColumnRole.TARGET),
        ),
    ),
    FoundationDatasetDefinition(
        name="turnover",
        table_name="turnover",
        temporal_index="date_mois",
        group_by=("departement",),
        pipeline_config={
            "data_quality": {
                "missing_threshold_delete": 0.07,
                "outlier_method": "zscore",
            }
        },
        columns=(
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("departement", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("entrees", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("sorties", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_turnover", ColumnDtype.FLOAT, ColumnRole.TARGET),
            ("anciennete_moyenne", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ),
    ),
    FoundationDatasetDefinition(
        name="masse_salariale",
        table_name="masse_salariale",
        temporal_index="date_mois",
        group_by=("site", "categorie"),
        pipeline_config={
            "data_quality": {
                "missing_threshold_delete": 0.06,
                "outlier_method": "iqr",
            }
        },
        columns=(
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("site", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("categorie", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("salaire_brut_total", ColumnDtype.FLOAT, ColumnRole.TARGET),
            ("charges_patronales", ColumnDtype.FLOAT, ColumnRole.FEATURE),
            ("primes", ColumnDtype.FLOAT, ColumnRole.FEATURE),
            ("heures_sup", ColumnDtype.FLOAT, ColumnRole.FEATURE),
            ("cout_total", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ),
    ),
]


def _month_shift(current: date, offset: int) -> date:
    month_idx = (current.year * 12 + (current.month - 1)) + offset
    return date(month_idx // 12, month_idx % 12 + 1, 1)


def _rolling_month_starts(reference: date, months: int) -> list[date]:
    current_month = reference.replace(day=1)
    first_month = _month_shift(current_month, -(months - 1))
    return [_month_shift(first_month, index) for index in range(months)]


def _iter_working_days(month_start: date) -> list[date]:
    next_month = _month_shift(month_start, 1)
    days: list[date] = []
    current = month_start
    while current < next_month:
        if current.weekday() < _WEEKDAY_SUNDAY:
            days.append(current)
        current += timedelta(days=1)
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


def _parse_float_string(value: str) -> float | None:
    cleaned = value.strip().replace(",", ".")
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _as_float(value: object | None, default: float = 0.0) -> float:
    parsed: float | None = None
    if isinstance(value, (Decimal, int, float)):
        parsed = float(value)
    elif isinstance(value, str):
        parsed = _parse_float_string(value)
    return default if parsed is None else parsed


def _schema_safe_slug(org_slug: str) -> str:
    """Return a DB-schema-safe slug from organization slug."""
    candidate = org_slug.replace("-", "_")
    try:
        return validate_client_slug(candidate)
    except DDLValidationError:
        sanitized = re.sub(r"[^a-z0-9_]+", "_", candidate.lower()).strip("_")
        digest = hashlib.sha256(org_slug.encode("utf-8")).hexdigest()[:8]
        prefix_budget = 35 - len("tenant__") - len(digest)
        prefix = sanitized[:prefix_budget].strip("_") or "org"
        fallback = f"tenant_{prefix}_{digest}"
        try:
            return validate_client_slug(fallback)
        except DDLValidationError:
            msg = (
                "Organization slug cannot be converted to a valid schema slug: "
                f"org_slug='{org_slug}', candidate='{candidate}', fallback='{fallback}'"
            )
        raise RuntimeError(msg) from None


def _inject_missing(
    rows: list[DatasetRow],
    *,
    field: str,
    rate: float,
    rng: random.Random,
) -> None:
    for row in rows:
        if rng.random() < rate:
            row[field] = None


def _inject_outliers(
    rows: list[DatasetRow],
    *,
    field: str,
    factor: float,
    count: int,
    rng: random.Random,
) -> None:
    if not rows:
        return
    indexes = rng.sample(range(len(rows)), k=min(count, len(rows)))
    for index in indexes:
        row = rows[index]
        value = _as_float(row.get(field))
        row[field] = round(value * factor, 2)


def _append_duplicates(
    rows: list[DatasetRow],
    *,
    ratio: float,
    rng: random.Random,
) -> None:
    if not rows:
        return
    duplicate_count = max(1, int(len(rows) * ratio))
    indexes = rng.sample(range(len(rows)), k=min(duplicate_count, len(rows)))
    rows.extend(dict(rows[index]) for index in indexes)


def _site_code(site: Site) -> str:
    if not site.code:
        msg = f"Site {site.id} is missing a code required for foundation datasets"
        raise RuntimeError(msg)
    return site.code


def _build_effectif_rows_for_site_month(
    *,
    site: Site,
    month_start: date,
    season: float,
    workforce_dept_month: dict[tuple[str, date], float],
    rng: random.Random,
) -> tuple[str, float, list[DatasetRow]]:
    site_code = _site_code(site)
    site_noise = 0.93 + 0.14 * rng.random()
    total_site = max(60, int(site.headcount * season * site_noise))
    effectifs_rows: list[DatasetRow] = []
    site_workforce_total = 0.0

    for dept_name, ratio in zip(("Exploitation", "Support"), (0.72, 0.28), strict=True):
        dept_total = max(15, int(total_site * ratio))
        interim_share = 0.05 + max(0.0, season - 1.0) * 0.16 + rng.random() * 0.03
        cdd_share = 0.10 + rng.random() * 0.05
        interim = int(dept_total * interim_share)
        cdd = int(dept_total * cdd_share)
        cdi = max(0, dept_total - interim - cdd)

        site_workforce_total += dept_total
        workforce_dept_month[(dept_name, month_start)] = (
            workforce_dept_month.get((dept_name, month_start), 0.0) + dept_total
        )
        effectifs_rows.append(
            {
                "date_mois": month_start.isoformat(),
                "site": site_code,
                "departement": dept_name,
                "effectif_total": dept_total,
                "effectif_cdi": cdi,
                "effectif_cdd": cdd,
                "effectif_interim": interim,
                "taux_feminisation": round(0.30 + 0.28 * rng.random(), 4),
            }
        )

    return site_code, site_workforce_total, effectifs_rows


def _build_absence_row(
    *,
    site_code: str,
    month_start: date,
    site_workforce_total: float,
    rng: random.Random,
) -> DatasetRow:
    working_days = len(_iter_working_days(month_start))
    absence_rate = 0.045
    if month_start.month in {11, 12, 1, 2}:
        absence_rate += 0.02
    elif month_start.month in {7, 8}:
        absence_rate -= 0.012

    total_abs_days = site_workforce_total * working_days * absence_rate
    maladie = int(total_abs_days * (0.45 + rng.random() * 0.10))
    conges = int(total_abs_days * (0.28 + rng.random() * 0.08))
    rtt = int(total_abs_days * (0.12 + rng.random() * 0.05))
    autre = max(0, int(total_abs_days) - maladie - conges - rtt)
    denominator = max(1.0, site_workforce_total * working_days)
    taux_abs = round((maladie + conges + rtt + autre) / denominator, 4)

    return {
        "date_mois": month_start.isoformat(),
        "site": site_code,
        "absences_maladie": maladie,
        "absences_conges": conges,
        "absences_rtt": rtt,
        "absences_autre": autre,
        "taux_absenteisme": taux_abs,
    }


def _build_payroll_rows_for_site_month(
    *,
    site_code: str,
    month_start: date,
    season: float,
    site_workforce_total: float,
    rng: random.Random,
) -> list[DatasetRow]:
    payroll_rows: list[DatasetRow] = []
    for category, ratio in zip(
        ("operateurs", "encadrement"),
        (0.78, 0.22),
        strict=True,
    ):
        workforce_category = site_workforce_total * ratio
        avg_salary = 2400.0 if category == "operateurs" else 4300.0
        salaire_brut = workforce_category * avg_salary * (0.96 + 0.08 * rng.random())
        charges = salaire_brut * (0.40 + 0.06 * rng.random())
        primes = salaire_brut * (0.04 + 0.05 * max(0.0, season - 0.9))
        heures_sup = workforce_category * (1.1 + 1.7 * max(0.0, season - 1.0))
        heures_sup *= 0.85 + 0.35 * rng.random()
        cout_total = salaire_brut + charges + primes + heures_sup * 30.0

        payroll_rows.append(
            {
                "date_mois": month_start.isoformat(),
                "site": site_code,
                "categorie": category,
                "salaire_brut_total": round(salaire_brut, 2),
                "charges_patronales": round(charges, 2),
                "primes": round(primes, 2),
                "heures_sup": round(heures_sup, 2),
                "cout_total": round(cout_total, 2),
            }
        )
    return payroll_rows


def _build_turnover_rows_for_month(
    *,
    month_start: date,
    workforce_dept_month: dict[tuple[str, date], float],
    rng: random.Random,
) -> list[DatasetRow]:
    turnover_rows: list[DatasetRow] = []
    season = _month_seasonality(month_start.month)
    for dept_name in ("Exploitation", "Support"):
        dept_workforce = workforce_dept_month[(dept_name, month_start)]
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
                    6.0 + (0.8 if dept_name == "Support" else 0.0) + rng.random() * 1.8,
                    2,
                ),
            }
        )
    return turnover_rows


def _apply_foundation_dataset_variance(
    *,
    effectifs_rows: list[DatasetRow],
    absences_rows: list[DatasetRow],
    turnover_rows: list[DatasetRow],
    payroll_rows: list[DatasetRow],
    rng: random.Random,
) -> None:
    _inject_missing(effectifs_rows, field="taux_feminisation", rate=0.04, rng=rng)
    _inject_missing(effectifs_rows, field="effectif_interim", rate=0.03, rng=rng)
    _inject_missing(absences_rows, field="absences_autre", rate=0.06, rng=rng)
    _inject_missing(turnover_rows, field="anciennete_moyenne", rate=0.05, rng=rng)
    _inject_missing(payroll_rows, field="primes", rate=0.03, rng=rng)
    _inject_missing(payroll_rows, field="heures_sup", rate=0.02, rng=rng)

    _inject_outliers(
        effectifs_rows,
        field="effectif_interim",
        factor=4.2,
        count=3,
        rng=rng,
    )
    _inject_outliers(
        absences_rows,
        field="absences_maladie",
        factor=2.8,
        count=3,
        rng=rng,
    )
    _inject_outliers(
        payroll_rows,
        field="heures_sup",
        factor=3.6,
        count=3,
        rng=rng,
    )

    _append_duplicates(effectifs_rows, ratio=0.03, rng=rng)
    _append_duplicates(absences_rows, ratio=0.04, rng=rng)
    _append_duplicates(turnover_rows, ratio=0.03, rng=rng)
    _append_duplicates(payroll_rows, ratio=0.03, rng=rng)


def _build_dataset_source_rows(sites: list[Site]) -> dict[str, list[DatasetRow]]:
    rng = random.Random(42)  # noqa: S311
    months = _rolling_month_starts(datetime.now(UTC).date(), _COMPLETED_MONTHS)

    effectifs_rows: list[DatasetRow] = []
    absences_rows: list[DatasetRow] = []
    turnover_rows: list[DatasetRow] = []
    payroll_rows: list[DatasetRow] = []

    workforce_dept_month: dict[tuple[str, date], float] = {}

    for month_start in months:
        season = _month_seasonality(month_start.month)
        for site in sites:
            site_code, site_workforce_total, site_effectifs = (
                _build_effectif_rows_for_site_month(
                    site=site,
                    month_start=month_start,
                    season=season,
                    workforce_dept_month=workforce_dept_month,
                    rng=rng,
                )
            )
            effectifs_rows.extend(site_effectifs)
            absences_rows.append(
                _build_absence_row(
                    site_code=site_code,
                    month_start=month_start,
                    site_workforce_total=site_workforce_total,
                    rng=rng,
                )
            )
            payroll_rows.extend(
                _build_payroll_rows_for_site_month(
                    site_code=site_code,
                    month_start=month_start,
                    season=season,
                    site_workforce_total=site_workforce_total,
                    rng=rng,
                )
            )

        turnover_rows.extend(
            _build_turnover_rows_for_month(
                month_start=month_start,
                workforce_dept_month=workforce_dept_month,
                rng=rng,
            )
        )

    _apply_foundation_dataset_variance(
        effectifs_rows=effectifs_rows,
        absences_rows=absences_rows,
        turnover_rows=turnover_rows,
        payroll_rows=payroll_rows,
        rng=rng,
    )

    return {
        "effectifs": effectifs_rows,
        "absences": absences_rows,
        "turnover": turnover_rows,
        "masse_salariale": payroll_rows,
    }


def _rows_to_csv_bytes(rows: list[DatasetRow]) -> bytes:
    if not rows:
        return b""
    fields = list(rows[0].keys())
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=fields, delimiter=";")
    writer.writeheader()
    for row in rows:
        serialized = {
            key: ("" if value is None else value) for key, value in row.items()
        }
        writer.writerow(serialized)
    return buffer.getvalue().encode("utf-8-sig")


def _quality_config_from_dataset(dataset: ClientDataset) -> QualityConfig:
    pipeline_config = _json_object(getattr(dataset, "pipeline_config", {}))
    raw = _json_object(pipeline_config.get("data_quality", {}))
    defaults = QualityConfig()
    return QualityConfig(
        duplicate_columns=_quality_duplicate_columns(raw.get("duplicate_columns")),
        missing_threshold_delete=_quality_float(
            raw.get("missing_threshold_delete"),
            defaults.missing_threshold_delete,
        ),
        outlier_method=_quality_str(
            raw.get("outlier_method"),
            defaults.outlier_method,
        ),
        outlier_iqr_factor=_quality_float(
            raw.get("outlier_iqr_factor"),
            defaults.outlier_iqr_factor,
        ),
        outlier_zscore_threshold=_quality_float(
            raw.get("outlier_zscore_threshold"),
            defaults.outlier_zscore_threshold,
        ),
        imputation_window_days=_quality_int(
            raw.get("imputation_window_days"),
            defaults.imputation_window_days,
        ),
        column_overrides=_quality_column_overrides(raw.get("column_overrides")),
    )


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
            triggered_by="foundation:db-pipeline",
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
    rows: list[DatasetRow],
    file_name: str,
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
        mapping_result = map_columns(
            source_columns=parse_result.source_columns,
            dataset_columns=columns,
            format_hint="csv",
        )
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
        triggered_by="foundation:db-pipeline",
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
    organization: Organization,
    schema_name: str,
    definition: FoundationDatasetDefinition,
) -> tuple[ClientDataset, list[DatasetColumn], bool]:
    name = definition.name
    existing = await session.execute(
        select(ClientDataset).where(
            ClientDataset.organization_id == organization.id,
            ClientDataset.name == name,
        )
    )
    dataset = existing.scalar_one_or_none()
    created = False

    if dataset is None:
        dataset = ClientDataset(
            id=uuid.uuid4(),
            organization_id=organization.id,
            name=name,
            schema_data=schema_name,
            table_name=definition.table_name,
            temporal_index=definition.temporal_index,
            group_by=list(definition.group_by),
            pipeline_config=dict(definition.pipeline_config),
            status=DatasetStatus.ACTIVE,
            metadata_hash=None,
        )
        session.add(dataset)
        await session.flush()

        column_models: list[DatasetColumn] = []
        for index, (col_name, dtype, role) in enumerate(definition.columns):
            column = DatasetColumn(
                id=uuid.uuid4(),
                dataset_id=dataset.id,
                name=col_name,
                dtype=dtype,
                role=role,
                nullable=(role not in {ColumnRole.TEMPORAL_INDEX, ColumnRole.GROUP_BY}),
                rules_override=None,
                ordinal_position=index,
            )
            session.add(column)
            column_models.append(column)
        await session.flush()
        created = True
    else:
        column_models = await _fetch_dataset_columns(session, dataset.id)

    await create_dataset_tables(dataset, column_models)
    return dataset, column_models, created


async def _require_foundation_organization(
    session: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> Organization:
    """Load the provisioned organization and ensure foundation defaults exist."""
    result = await session.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    organization = result.scalar_one_or_none()
    if organization is None:
        msg = f"Organization {organization_id} is missing for foundation bootstrap"
        raise RuntimeError(msg)

    current = dict(_json_object(getattr(organization, "settings", {})))
    if "alertThresholds" not in current:
        current.update(_DEFAULT_SETTINGS)
        organization.settings = current
        await session.flush()
    log.info(
        "organization_foundation: using existing organization",
        org_id=str(organization.id),
    )
    return organization


async def _ensure_foundation_sites(
    session: AsyncSession,
    organization: Organization,
) -> list[Site]:
    existing_result = await session.execute(
        select(Site)
        .where(Site.organization_id == organization.id)
        .order_by(Site.code.asc())
    )
    existing_sites = list(existing_result.scalars().all())
    if existing_sites:
        log.info(
            "organization_foundation: reusing sites",
            org_id=str(organization.id),
            count=len(existing_sites),
        )
        return existing_sites

    sites: list[Site] = []
    for blueprint in _FOUNDATION_SITE_BLUEPRINTS:
        site = Site(
            id=uuid.uuid4(),
            organization_id=organization.id,
            name=blueprint.name,
            code=blueprint.code,
            address={"city": blueprint.city, "country": "France"},
            headcount=blueprint.headcount,
        )
        session.add(site)
        sites.append(site)

    await session.flush()
    log.info(
        "organization_foundation: created sites",
        org_id=str(organization.id),
        count=len(sites),
    )
    return sites


async def _ensure_foundation_departments(
    session: AsyncSession,
    organization: Organization,
    sites: list[Site],
) -> list[Department]:
    existing_result = await session.execute(
        select(Department)
        .where(Department.organization_id == organization.id)
        .order_by(Department.code.asc())
    )
    existing_departments = list(existing_result.scalars().all())
    if existing_departments:
        log.info(
            "organization_foundation: reusing departments",
            org_id=str(organization.id),
            count=len(existing_departments),
        )
        return existing_departments

    departments: list[Department] = []
    for site in sites:
        site_code = _site_code(site)
        for dept_name, headcount_pct in [("Exploitation", 0.7), ("Support", 0.3)]:
            department = Department(
                id=uuid.uuid4(),
                organization_id=organization.id,
                site_id=site.id,
                name=f"{dept_name} — {site.name}",
                code=f"{site_code}_{dept_name[:3].upper()}",
                headcount=int(site.headcount * headcount_pct),
            )
            session.add(department)
            departments.append(department)

    await session.flush()
    log.info(
        "organization_foundation: created departments",
        org_id=str(organization.id),
        count=len(departments),
    )
    return departments


async def _ensure_foundation_datasets(
    session: AsyncSession,
    organization: Organization,
    sites: list[Site],
) -> int:
    """Create dataset schemas/tables and ingest foundation datasets."""
    created = 0
    ingested_rows = 0
    schema_slug = _schema_safe_slug(organization.slug)
    try:
        schema_name = await create_client_schemas(schema_slug)
    except InsufficientPrivilege:
        log.warning(
            (
                "organization_foundation: skipped dataset provisioning "
                "without DDL privilege"
            ),
            org_id=str(organization.id),
            org_slug=organization.slug,
            schema_slug=schema_slug,
        )
        return -1

    tenant = TenantFilter(organization_id=str(organization.id))
    source_rows_by_dataset = _build_dataset_source_rows(sites)

    for definition in _FOUNDATION_DATASETS:
        dataset, columns, was_created = await _ensure_dataset(
            session,
            organization=organization,
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

        dataset_name = definition.name
        rows = source_rows_by_dataset.get(dataset_name, [])
        ingested_rows += await _ingest_dataset_rows(
            session,
            dataset=dataset,
            columns=columns,
            rows=rows,
            file_name=f"{dataset_name}_foundation.csv",
        )

    log.info(
        "organization_foundation: completed dataset provisioning",
        org_id=str(organization.id),
        datasets_created=created,
        rows_ingested=ingested_rows,
    )
    return created


async def provision_organization_foundation(
    session: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> OrganizationFoundation:
    """Provision the persistent tenant foundation for one existing organization."""
    organization = await _require_foundation_organization(
        session,
        organization_id=organization_id,
    )

    sites = await _ensure_foundation_sites(session, organization)
    departments = await _ensure_foundation_departments(session, organization, sites)
    datasets_created = await _ensure_foundation_datasets(session, organization, sites)

    if datasets_created < 0:
        msg = (
            "Unable to provision datasets for organization due to missing "
            "DDL privileges (CREATE SCHEMA)."
        )
        raise RuntimeError(msg)

    foundation = OrganizationFoundation(
        organization=organization,
        sites=sites,
        departments=departments,
        datasets_created=datasets_created,
    )
    log.info(
        "organization_foundation: foundation ready",
        org_id=str(organization.id),
        sites=len(sites),
        departments=len(departments),
        datasets_created=datasets_created,
    )
    return foundation


__all__ = [
    "OrganizationFoundation",
    "provision_organization_foundation",
]
