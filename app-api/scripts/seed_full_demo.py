"""Full demo seed - complete tenant seeded from DB pipelines.

Usage:
    cd apps/api
    uv run python -m scripts.seed_full_demo

This script is idempotent: it creates missing entities/datasets and only
skips steps that would duplicate already-materialized downstream artifacts.

Pipeline (10 steps):
 1-4. Foundation organization settings/sites/departments/datasets
      via app.services.organization_foundation
 5. Canonical + cost parameters computed from DB-cleaned core datasets
 6. Mock forecasts -> coverage alerts
 7. Scenario options (per alert)
 8. Operational decisions (~70% of alerts)
 9. Proof records (per site-month)
10. Dashboard alerts + ForecastRun + DailyForecasts
"""
# ruff: noqa: PLR2004, PLR0911, PLR0915, RUF046

from __future__ import annotations

import asyncio
import math
import random
import statistics
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING

import structlog
from sqlalchemy import select

from app.core.database import async_session_factory, engine
from app.core.security import TenantFilter
from app.models.daily_forecast import DailyForecast, ForecastDimension
from app.models.dashboard_alert import (
    AlertSeverity,
    AlertType,
    DashboardAlert,
    RelatedEntityType,
)
from app.models.data_catalog import ClientDataset
from app.models.forecast_run import ForecastModelType, ForecastRun, ForecastStatus
from app.models.operational import (
    CanonicalRecord,
    CostParameter,
    CoverageAlert,
    CoverageAlertSeverity,
    OperationalDecision,
    ScenarioOption,
)
from app.services.canonical_data_service import bulk_import_canonical
from app.services.datasets import get_dataset_data
from app.services.mock_forecast_service import generate_mock_forecasts
from app.services.organization_foundation import provision_organization_foundation
from app.services.proof_service import generate_proof_record
from app.services.scenario_engine_service import generate_scenarios

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.models.department import Department
    from app.models.organization import Organization
    from app.models.site import Site

log = structlog.get_logger()

_MANAGER_UUID = uuid.UUID("00000000-0000-4000-a000-000000000001")
_OVERRIDE_REASONS = [
    "Contrainte syndicale",
    "Budget réduit",
    "Préférence site",
]

_DECISION_PROBABILITY = 0.70
_OVERRIDE_PROBABILITY = 0.80
_WORK_HOURS_PER_FTE_DAY = 7.2


def _month_shift(current: date, offset: int) -> date:
    month_idx = (current.year * 12 + (current.month - 1)) + offset
    return date(month_idx // 12, month_idx % 12 + 1, 1)


def _iter_working_days(month_start: date) -> list[date]:
    next_month = _month_shift(month_start, 1)
    days: list[date] = []
    current = month_start
    while current < next_month:
        if current.weekday() < 6:
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


def _demand_factor(current_day: date) -> float:
    base = 1.0
    season = _month_seasonality(current_day.month)
    base *= 0.88 + (season - 0.80) * 0.50
    if current_day.weekday() in (0, 1):
        base *= 1.04
    if current_day.weekday() == 5:
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
                day_value, month_value, year_value = (
                    int(parts[0]),
                    int(parts[1]),
                    int(parts[2]),
                )
                if year_value <= 31:
                    day_value, month_value, year_value = (
                        year_value,
                        day_value,
                        month_value,
                    )
                return date(year_value, month_value, day_value)
            except ValueError:
                return None
    return None


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
    include_operational_demo_data: bool = True,
) -> None:
    """Seed the full demo pipeline.

    Step 1-4 always come from `app.services.organization_foundation` so the
    persistent tenant bootstrap stays identical between real provisioning and
    demo seeding.
    """
    log.info("seed_full_demo: starting pipeline")

    foundation = await provision_organization_foundation(
        session,
        organization_id=target_org_id,
        strict_step4=strict_step4,
    )
    if foundation is None:
        return

    org = foundation.organization
    sites = foundation.sites
    departments = foundation.departments

    if not include_operational_demo_data:
        log.info(
            "seed_full_demo: foundation-only provisioning complete",
            org_id=str(org.id),
            datasets_created=foundation.datasets_created,
        )
        return

    existing_alerts = await session.execute(
        select(CoverageAlert.id).where(CoverageAlert.organization_id == org.id).limit(1)
    )
    if existing_alerts.scalar_one_or_none() is not None:
        log.info(
            "seed_full_demo: operational data already present, stopped after foundation"
        )
        return

    await _step5_canonical(session, org)
    await _step6_forecasts(session, org)
    await _step7_scenarios(session, org)
    await _step8_decisions(session, org)
    await _step9_proof(session, org, sites)
    await _step10a_dashboard_alerts(session, org)
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
