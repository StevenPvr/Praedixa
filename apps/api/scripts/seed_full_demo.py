"""Full demo seed — creates a complete Praedixa demo tenant with all data layers.

Usage:
    cd apps/api
    uv run python -m scripts.seed_full_demo

This script is idempotent: it checks if org "praedixa-demo" already exists
and skips all seeding if so. To re-seed, delete the organization first.

Pipeline (10 steps):
 1. Organization "Praedixa Demo"
 2. 6 Sites (from data/canonical/sites.csv)
 3. 12 Departments (2 per site)
 4. 4 Datasets + columns + ingestion logs
 5. Canonical records + cost parameters (from CSV)
 6. Mock forecasts → coverage alerts
 7. Scenario options (per alert)
 8. Operational decisions (~70% of alerts)
 9. Proof records (per site-month)
10. Dashboard alerts + ForecastRun + DailyForecasts
"""

from __future__ import annotations

import asyncio
import csv
import random
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
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
from app.models.data_catalog import (
    ClientDataset,
    ColumnDtype,
    ColumnRole,
    DatasetColumn,
    DatasetStatus,
    IngestionLog,
    IngestionMode,
    RunStatus,
)
from app.models.department import Department
from app.models.forecast_run import ForecastModelType, ForecastRun, ForecastStatus
from app.models.operational import (
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
from app.services.mock_forecast_service import generate_mock_forecasts
from app.services.proof_service import generate_proof_record
from app.services.scenario_engine_service import generate_scenarios

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger()

# ── Paths ────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = ROOT / "data" / "canonical"

# ── Fixed UUIDs for reproducibility ──────────────────────
_MANAGER_UUID = uuid.UUID("00000000-0000-4000-a000-000000000001")

# ── Demo dataset definitions (reused from seed_demo_data) ─
DEMO_DATASETS = [
    {
        "name": "effectifs",
        "table_name": "effectifs",
        "temporal_index": "date_mois",
        "group_by": ["site", "departement"],
        "pipeline_config": {"data_quality": {"dedup_enabled": True}},
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
        "ingestion_rows": 2400,
    },
    {
        "name": "absences",
        "table_name": "absences",
        "temporal_index": "date_mois",
        "group_by": ["site"],
        "pipeline_config": {
            "data_quality": {"dedup_enabled": True, "outlier_method": "iqr"}
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
        "ingestion_rows": 1800,
    },
    {
        "name": "turnover",
        "table_name": "turnover",
        "temporal_index": "date_mois",
        "group_by": ["departement"],
        "pipeline_config": {"data_quality": {"dedup_enabled": True}},
        "columns": [
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("departement", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("entrees", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("sorties", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_turnover", ColumnDtype.FLOAT, ColumnRole.TARGET),
            ("anciennete_moyenne", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ],
        "ingestion_rows": 960,
    },
    {
        "name": "masse_salariale",
        "table_name": "masse_salariale",
        "temporal_index": "date_mois",
        "group_by": ["site", "categorie"],
        "pipeline_config": {},
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
        "ingestion_rows": 3200,
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


# ── Step 1: Organization ─────────────────────────────────


_DEFAULT_SETTINGS = {
    "alertThresholds": {
        "critical": 0.7,
        "high": 0.5,
        "medium": 0.3,
    },
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
        # Ensure settings contain alertThresholds
        current = org.settings or {}
        if "alertThresholds" not in current:
            current.update(_DEFAULT_SETTINGS)
            org.settings = current
            await session.flush()
        log.info("step1_organization: using existing", org_id=str(org.id))
        return org

    # Default: create "praedixa-demo"
    result = await session.execute(
        select(Organization).where(Organization.slug == "praedixa-demo")
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        log.info("step1_organization: already exists, skipping all seeding")
        return None

    org = Organization(
        id=uuid.uuid4(),
        name="Praedixa Demo",
        slug="praedixa-demo",
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
    """Load 6 sites from data/canonical/sites.csv."""
    csv_path = DATA_DIR / "sites.csv"
    sites: list[Site] = []

    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            site = Site(
                id=uuid.uuid4(),
                organization_id=org.id,
                name=row["name"],
                code=row["site_id"],
                address={
                    "city": row["city"],
                    "country": "France",
                },
                headcount=int(row["capacite_base_h"]),
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


# ── Step 4: Datasets + Columns + Ingestion Logs ──────────


async def _step4_datasets(session: AsyncSession, org: Organization) -> int:
    """Create 4 datasets with columns and ingestion logs."""
    created = 0
    org_slug = org.slug.replace("-", "_")
    now = datetime.now(UTC)

    for definition in DEMO_DATASETS:
        name = definition["name"]

        # Idempotency check
        existing = await session.execute(
            select(ClientDataset).where(
                ClientDataset.organization_id == org.id,
                ClientDataset.name == name,
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue

        dataset = ClientDataset(
            id=uuid.uuid4(),
            organization_id=org.id,
            name=name,
            schema_data=f"{org_slug}_data",
            table_name=definition["table_name"],
            temporal_index=definition["temporal_index"],
            group_by=definition["group_by"],
            pipeline_config=definition["pipeline_config"],
            status=DatasetStatus.ACTIVE,
            metadata_hash=None,
        )
        session.add(dataset)
        await session.flush()

        # Create columns
        for i, (col_name, dtype, role) in enumerate(definition["columns"]):
            col = DatasetColumn(
                id=uuid.uuid4(),
                dataset_id=dataset.id,
                name=col_name,
                dtype=dtype,
                role=role,
                nullable=(role not in {ColumnRole.TEMPORAL_INDEX, ColumnRole.GROUP_BY}),
                rules_override=None,
                ordinal_position=i,
            )
            session.add(col)

        # Ingestion logs (3: success, failed, success)
        rows = definition["ingestion_rows"]

        log1 = IngestionLog(
            id=uuid.uuid4(),
            dataset_id=dataset.id,
            mode=IngestionMode.FILE_UPLOAD,
            rows_received=rows,
            rows_transformed=rows - 12,
            started_at=now - timedelta(days=30),
            completed_at=now - timedelta(days=30) + timedelta(seconds=45),
            status=RunStatus.SUCCESS,
            triggered_by="seed",
            file_name=f"{name}_initial.xlsx",
            file_size=rows * 120,
        )
        session.add(log1)

        log2 = IngestionLog(
            id=uuid.uuid4(),
            dataset_id=dataset.id,
            mode=IngestionMode.FILE_UPLOAD,
            rows_received=0,
            rows_transformed=0,
            started_at=now - timedelta(days=15),
            completed_at=now - timedelta(days=15) + timedelta(seconds=2),
            status=RunStatus.FAILED,
            error_message="Encoding error: invalid UTF-8 at byte 1024",
            triggered_by="seed",
            file_name=f"{name}_update_bad.csv",
            file_size=5000,
        )
        session.add(log2)

        extra_rows = rows // 4
        log3 = IngestionLog(
            id=uuid.uuid4(),
            dataset_id=dataset.id,
            mode=IngestionMode.FILE_UPLOAD,
            rows_received=extra_rows,
            rows_transformed=extra_rows,
            started_at=now - timedelta(days=3),
            completed_at=now - timedelta(days=3) + timedelta(seconds=18),
            status=RunStatus.SUCCESS,
            triggered_by="seed",
            file_name=f"{name}_update.csv",
            file_size=extra_rows * 80,
        )
        session.add(log3)

        await session.flush()
        created += 1

    log.info("step4_datasets: created", count=created)
    return created


# ── Step 5: Canonical Records + Cost Parameters ─────────


async def _step5_canonical(session: AsyncSession, org: Organization) -> None:
    """Seed canonical records and cost parameters from CSV files."""
    from scripts.seed_canonical_data import (
        _seed_canonical_records,
        _seed_cost_parameters,
    )

    records_count = await _seed_canonical_records(session, org.id)
    costs_count = await _seed_cost_parameters(session, org.id)
    log.info(
        "step5_canonical: seeded",
        records=records_count,
        cost_params=costs_count,
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

            gap = round(base_demand - base_capacity, 2)
            risk_score = round(max(0, min(100, gap / base_capacity * 100)), 2)
            conf_spread = abs(base_demand * 0.1)

            df = DailyForecast(
                id=uuid.uuid4(),
                organization_id=org.id,
                forecast_run_id=run.id,
                department_id=dept_id,
                forecast_date=forecast_date,
                dimension=dimension,
                predicted_demand=round(base_demand, 2),
                predicted_capacity=round(base_capacity, 2),
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

    # Idempotency: skip if this org already has coverage alerts
    existing_alerts = await session.execute(
        select(CoverageAlert.id).where(CoverageAlert.organization_id == org.id).limit(1)
    )
    if existing_alerts.scalar_one_or_none() is not None:
        log.info("seed_full_demo: org already has data, skipping")
        return

    # Step 2: Sites
    sites = await _step2_sites(session, org)

    # Step 3: Departments
    departments = await _step3_departments(session, org, sites)

    # Step 4: Datasets + columns + ingestion logs
    await _step4_datasets(session, org)

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
