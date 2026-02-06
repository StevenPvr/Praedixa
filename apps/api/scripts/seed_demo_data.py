"""Seed script — populate the database with realistic demo data.

Usage:
    cd apps/api
    python -m scripts.seed_demo_data

Idempotent: Skips if organization with slug "acme-logistics" already exists.
Uses async SQLAlchemy sessions for consistency with the application code.

Security note:
- This script is for development/demo only. It MUST NOT be deployed
  or accessible in production environments.
- The demo user does NOT have a real password — auth is handled by Supabase.
"""

import asyncio
import random
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.daily_forecast import DailyForecast, ForecastDimension
from app.models.dashboard_alert import (
    AlertSeverity,
    AlertType,
    DashboardAlert,
    RelatedEntityType,
)
from app.models.decision import Decision, DecisionPriority, DecisionStatus, DecisionType
from app.models.department import Department
from app.models.forecast_run import ForecastModelType, ForecastRun, ForecastStatus
from app.models.organization import (
    IndustrySector,
    Organization,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.models.site import Site
from app.models.user import User, UserRole, UserStatus

# Fixed UUIDs for reproducibility and cross-reference
ORG_ID = uuid.UUID("10000000-0000-0000-0000-000000000001")
SITE_PARIS_ID = uuid.UUID("20000000-0000-0000-0000-000000000001")
SITE_LYON_ID = uuid.UUID("20000000-0000-0000-0000-000000000002")
ADMIN_USER_ID = uuid.UUID("30000000-0000-0000-0000-000000000001")
FORECAST_RUN_ID = uuid.UUID("40000000-0000-0000-0000-000000000001")

# Department IDs — Paris
DEPT_EXPEDITION_PARIS_ID = uuid.UUID("50000000-0000-0000-0000-000000000001")
DEPT_RECEPTION_PARIS_ID = uuid.UUID("50000000-0000-0000-0000-000000000002")
DEPT_TRI_PARIS_ID = uuid.UUID("50000000-0000-0000-0000-000000000003")

# Department IDs — Lyon
DEPT_EXPEDITION_LYON_ID = uuid.UUID("50000000-0000-0000-0000-000000000004")
DEPT_RECEPTION_LYON_ID = uuid.UUID("50000000-0000-0000-0000-000000000005")
DEPT_TRI_LYON_ID = uuid.UUID("50000000-0000-0000-0000-000000000006")

# Decision IDs
DECISION_IDS = [
    uuid.UUID(f"60000000-0000-0000-0000-00000000000{i}") for i in range(1, 9)
]

SLUG = "acme-logistics"


def _build_organization() -> Organization:
    return Organization(
        id=ORG_ID,
        name="Acme Logistics",
        slug=SLUG,
        legal_name="Acme Logistics SAS",
        siret="12345678901234",
        sector=IndustrySector.LOGISTICS,
        size=OrganizationSize.MEDIUM,
        headcount=240,
        status=OrganizationStatus.TRIAL,
        plan=SubscriptionPlan.STARTER,
        timezone="Europe/Paris",
        locale="fr-FR",
        currency="EUR",
        contact_email="contact@acme-logistics.com",
        settings={
            "workingDays": {
                "monday": True,
                "tuesday": True,
                "wednesday": True,
                "thursday": True,
                "friday": True,
                "saturday": False,
                "sunday": False,
            }
        },
    )


def _build_sites() -> list[Site]:
    return [
        Site(
            id=SITE_PARIS_ID,
            organization_id=ORG_ID,
            name="Paris Nord",
            code="PAR-N",
            address={
                "street": "12 Rue du Fret",
                "city": "Roissy-en-France",
                "postalCode": "95700",
                "country": "FR",
                "region": "Ile-de-France",
            },
            timezone="Europe/Paris",
            headcount=150,
            capacity_units="palettes/jour",
        ),
        Site(
            id=SITE_LYON_ID,
            organization_id=ORG_ID,
            name="Lyon Sud",
            code="LYO-S",
            address={
                "street": "45 Avenue de la Logistique",
                "city": "Vénissieux",
                "postalCode": "69200",
                "country": "FR",
                "region": "Auvergne-Rhône-Alpes",
            },
            timezone="Europe/Paris",
            headcount=90,
            capacity_units="palettes/jour",
        ),
    ]


def _build_departments() -> list[Department]:
    departments = []

    for site_id, prefix_id, site_headcount in [
        (SITE_PARIS_ID, DEPT_EXPEDITION_PARIS_ID, 150),
        (SITE_LYON_ID, DEPT_EXPEDITION_LYON_ID, 90),
    ]:
        # Compute base UUID offset for the site's departments
        depts_config = [
            {
                "id": prefix_id,
                "name": "Expédition",
                "code": "EXP",
                "cost_center": "CC-EXP",
                "headcount_ratio": 0.45,
                "min_staffing": 85.0,
                "critical_roles": 3,
            },
            {
                "id": uuid.UUID(
                    str(prefix_id)[:26]
                    + format(int(str(prefix_id)[26:], 16) + 1, "010x")
                ),
                "name": "Réception",
                "code": "REC",
                "cost_center": "CC-REC",
                "headcount_ratio": 0.35,
                "min_staffing": 80.0,
                "critical_roles": 2,
            },
            {
                "id": uuid.UUID(
                    str(prefix_id)[:26]
                    + format(int(str(prefix_id)[26:], 16) + 2, "010x")
                ),
                "name": "Tri",
                "code": "TRI",
                "cost_center": "CC-TRI",
                "headcount_ratio": 0.20,
                "min_staffing": 75.0,
                "critical_roles": 1,
            },
        ]

        departments.extend(
            Department(
                id=dept["id"],
                organization_id=ORG_ID,
                site_id=site_id,
                name=dept["name"],
                code=dept["code"],
                cost_center=dept["cost_center"],
                headcount=int(site_headcount * dept["headcount_ratio"]),
                min_staffing_level=dept["min_staffing"],
                critical_roles_count=dept["critical_roles"],
            )
            for dept in depts_config
        )

    return departments


def _build_admin_user() -> User:
    return User(
        id=ADMIN_USER_ID,
        organization_id=ORG_ID,
        supabase_user_id="supabase-demo-admin-001",
        email="admin@acme-logistics.com",
        email_verified=True,
        role=UserRole.ORG_ADMIN,
        status=UserStatus.ACTIVE,
        locale="fr-FR",
        timezone="Europe/Paris",
    )


def _build_forecast_run() -> ForecastRun:
    now = datetime.now(UTC)
    return ForecastRun(
        id=FORECAST_RUN_ID,
        organization_id=ORG_ID,
        model_type=ForecastModelType.ENSEMBLE,
        model_version="1.2.0",
        horizon_days=14,
        status=ForecastStatus.COMPLETED,
        started_at=now - timedelta(hours=2),
        completed_at=now - timedelta(hours=1),
        accuracy_score=0.92,
        config={
            "training_start": (now - timedelta(days=180)).date().isoformat(),
            "training_end": (now - timedelta(days=1)).date().isoformat(),
            "features": [
                "historical_demand",
                "seasonality",
                "weather",
                "holidays",
            ],
        },
    )


def _build_daily_forecasts(
    departments: list[Department],
) -> list[DailyForecast]:
    """Generate 90 daily forecasts: 45 days historical + 45 days future.

    For each day, generate one record per dimension (human, merchandise)
    for a subset of departments.
    """
    rng = random.Random(42)  # noqa: S311 — deterministic seed for demo data
    forecasts: list[DailyForecast] = []
    today = datetime.now(UTC).date()

    for day_offset in range(-45, 45):
        forecast_date = today + timedelta(days=day_offset)

        for dimension in ForecastDimension:
            # Pick a department deterministically
            dept = departments[day_offset % len(departments)]

            # Realistic demand/capacity with some variance
            base_demand = rng.uniform(80, 150)
            base_capacity = rng.uniform(70, 160)
            gap = round(base_capacity - base_demand, 2)

            # Risk score: higher when gap is negative (under-capacity)
            if gap < 0:
                risk_score = min(1.0, abs(gap) / base_demand)
            else:
                risk_score = max(0.0, 0.1 - gap / base_demand * 0.1)

            confidence_margin = base_demand * 0.10
            demand = round(base_demand, 2)
            capacity = round(base_capacity, 2)

            forecasts.append(
                DailyForecast(
                    organization_id=ORG_ID,
                    forecast_run_id=FORECAST_RUN_ID,
                    department_id=dept.id,
                    forecast_date=forecast_date,
                    dimension=dimension,
                    predicted_demand=demand,
                    predicted_capacity=capacity,
                    gap=gap,
                    risk_score=round(risk_score, 2),
                    confidence_lower=round(demand - confidence_margin, 2),
                    confidence_upper=round(demand + confidence_margin, 2),
                    details={
                        "breakdown": {
                            "base": round(demand * 0.7, 2),
                            "seasonal": round(demand * 0.2, 2),
                            "trend": round(demand * 0.1, 2),
                        }
                    },
                )
            )

    return forecasts


def _build_alerts(departments: list[Department]) -> list[DashboardAlert]:
    """Create 3 active alerts with different severities."""
    now = datetime.now(UTC)

    # Find specific departments for alert context
    expedition_paris = next(
        d for d in departments if d.name == "Expédition" and d.site_id == SITE_PARIS_ID
    )
    tri_lyon = next(
        d for d in departments if d.name == "Tri" and d.site_id == SITE_LYON_ID
    )

    return [
        DashboardAlert(
            organization_id=ORG_ID,
            type=AlertType.RISK,
            severity=AlertSeverity.WARNING,
            title="Sous-effectif prévu Expédition Paris Nord",
            message=(
                "Le département Expédition du site Paris Nord risque "
                "un sous-effectif de 15% dans les 7 prochains jours. "
                "3 absences prévues non remplacées."
            ),
            related_entity_type=RelatedEntityType.DEPARTMENT,
            related_entity_id=expedition_paris.id,
            action_url="/arbitrage",
            action_label="Voir les décisions",
            expires_at=now + timedelta(days=7),
        ),
        DashboardAlert(
            organization_id=ORG_ID,
            type=AlertType.FORECAST,
            severity=AlertSeverity.INFO,
            title="Nouveau forecast disponible",
            message=(
                "Un nouveau forecast ensemble a été calculé avec "
                "une précision de 92%. Les prévisions couvrent "
                "les 14 prochains jours."
            ),
            related_entity_type=RelatedEntityType.FORECAST,
            related_entity_id=FORECAST_RUN_ID,
            action_url="/previsions",
            action_label="Consulter les prévisions",
            expires_at=now + timedelta(days=14),
        ),
        DashboardAlert(
            organization_id=ORG_ID,
            type=AlertType.RISK,
            severity=AlertSeverity.CRITICAL,
            title="Risque rupture capacité Lyon Sud",
            message=(
                "Le site Lyon Sud présente un risque élevé de rupture "
                "de capacité sur le département Tri. Le taux de couverture "
                "prévu passe sous 60% dans les 3 prochains jours."
            ),
            related_entity_type=RelatedEntityType.DEPARTMENT,
            related_entity_id=tri_lyon.id,
            action_url="/arbitrage",
            action_label="Actions urgentes",
            expires_at=now + timedelta(days=3),
        ),
    ]


def _build_decisions(departments: list[Department]) -> list[Decision]:
    """Create 8 decisions across different statuses and types.

    Distribution:
    - 2 x suggested (new AI recommendations)
    - 2 x pending_review (awaiting manager validation)
    - 2 x approved (validated by manager)
    - 2 x implemented (with outcome JSONB)

    Security note: This is demo data only. Reviewer/implementer IDs
    reference the admin user for consistency.
    """
    now = datetime.now(UTC)
    today = now.date()

    expedition_paris = next(
        d for d in departments if d.code == "EXP" and d.site_id == SITE_PARIS_ID
    )
    reception_paris = next(
        d for d in departments if d.code == "REC" and d.site_id == SITE_PARIS_ID
    )
    tri_lyon = next(
        d for d in departments if d.code == "TRI" and d.site_id == SITE_LYON_ID
    )
    expedition_lyon = next(
        d for d in departments if d.code == "EXP" and d.site_id == SITE_LYON_ID
    )

    return [
        # --- 2 x SUGGESTED ---
        Decision(
            id=DECISION_IDS[0],
            organization_id=ORG_ID,
            forecast_run_id=FORECAST_RUN_ID,
            department_id=expedition_paris.id,
            target_period={
                "startDate": (today + timedelta(days=3)).isoformat(),
                "endDate": (today + timedelta(days=10)).isoformat(),
            },
            type=DecisionType.OVERTIME,
            priority=DecisionPriority.HIGH,
            status=DecisionStatus.SUGGESTED,
            title="Heures sup Expedition Paris - pic prevu S+1",
            description=(
                "Le forecast prevoit un deficit de 15% sur Expedition Paris "
                "la semaine prochaine. 3 absences confirmees non remplacees."
            ),
            rationale=(
                "Le taux de couverture prevu passe sous 85%. "
                "Les heures supplementaires permettent une couverture immediate "
                "sans delai de formation."
            ),
            risk_indicators={
                "risk_level": "medium",
                "fatigue_index": 0.6,
                "overtime_ratio_current": 0.12,
            },
            estimated_cost=1875.00,
            cost_of_inaction=4500.00,
            confidence_score=85.0,
        ),
        Decision(
            id=DECISION_IDS[1],
            organization_id=ORG_ID,
            forecast_run_id=FORECAST_RUN_ID,
            department_id=tri_lyon.id,
            target_period={
                "startDate": (today + timedelta(days=1)).isoformat(),
                "endDate": (today + timedelta(days=5)).isoformat(),
            },
            type=DecisionType.EXTERNAL,
            priority=DecisionPriority.CRITICAL,
            status=DecisionStatus.SUGGESTED,
            title="Interim Tri Lyon - rupture capacite imminente",
            description=(
                "Risque de rupture de capacite sur le departement Tri a Lyon Sud. "
                "Le taux de couverture prevu passe sous 60%."
            ),
            rationale=(
                "La reallocation interne ne couvre que 50% du deficit. "
                "L'interim est necessaire pour les 80% restants."
            ),
            risk_indicators={
                "risk_level": "high",
                "coverage_forecast": 0.58,
                "sla_risk": True,
            },
            estimated_cost=3600.00,
            cost_of_inaction=12000.00,
            confidence_score=92.0,
        ),
        # --- 2 x PENDING_REVIEW ---
        Decision(
            id=DECISION_IDS[2],
            organization_id=ORG_ID,
            forecast_run_id=FORECAST_RUN_ID,
            department_id=reception_paris.id,
            target_period={
                "startDate": (today + timedelta(days=5)).isoformat(),
                "endDate": (today + timedelta(days=12)).isoformat(),
            },
            type=DecisionType.REDISTRIBUTION,
            priority=DecisionPriority.MEDIUM,
            status=DecisionStatus.PENDING_REVIEW,
            title="Reallocation Reception Paris depuis Tri",
            description=(
                "Transferer 2 operateurs du Tri vers Reception Paris "
                "pendant la periode de pic prevu."
            ),
            rationale=(
                "Le departement Tri a une marge de 20% sur la periode, "
                "permettant un transfert sans impact significatif."
            ),
            risk_indicators={
                "risk_level": "low",
                "source_dept_impact": 0.15,
            },
            estimated_cost=450.00,
            cost_of_inaction=2000.00,
            confidence_score=78.0,
        ),
        Decision(
            id=DECISION_IDS[3],
            organization_id=ORG_ID,
            forecast_run_id=FORECAST_RUN_ID,
            department_id=expedition_lyon.id,
            target_period={
                "startDate": (today + timedelta(days=7)).isoformat(),
                "endDate": (today + timedelta(days=14)).isoformat(),
            },
            type=DecisionType.OVERTIME,
            priority=DecisionPriority.MEDIUM,
            status=DecisionStatus.PENDING_REVIEW,
            title="Heures sup Expedition Lyon - feries",
            description=(
                "Besoin de couverture supplementaire pour la periode "
                "des jours feries avec pic de demande prevu."
            ),
            rationale=(
                "Historiquement, les periodes feriees generent +25% de volume. "
                "Les heures supplementaires couvrent le surplus."
            ),
            risk_indicators={
                "risk_level": "medium",
                "seasonal_factor": 1.25,
            },
            estimated_cost=1200.00,
            cost_of_inaction=3000.00,
            confidence_score=72.0,
        ),
        # --- 2 x APPROVED ---
        Decision(
            id=DECISION_IDS[4],
            organization_id=ORG_ID,
            forecast_run_id=FORECAST_RUN_ID,
            department_id=expedition_paris.id,
            target_period={
                "startDate": (today - timedelta(days=3)).isoformat(),
                "endDate": (today + timedelta(days=4)).isoformat(),
            },
            type=DecisionType.EXTERNAL,
            priority=DecisionPriority.HIGH,
            status=DecisionStatus.APPROVED,
            title="Interim 2 postes Expedition Paris",
            description=(
                "Recrutement de 2 interimaires pour couvrir les absences "
                "maladie imprevues sur la ligne d'expedition."
            ),
            rationale=(
                "2 absences maladie simultanees, pas de ressource interne "
                "disponible. L'interim est la seule option viable."
            ),
            risk_indicators={
                "risk_level": "medium",
                "training_needed": True,
            },
            estimated_cost=2880.00,
            cost_of_inaction=5500.00,
            confidence_score=88.0,
            reviewed_by=ADMIN_USER_ID,
            reviewed_at=now - timedelta(days=1),
            manager_notes="Approuve. Contacter l'agence Adecco en priorite.",
            implementation_deadline=today + timedelta(days=2),
        ),
        Decision(
            id=DECISION_IDS[5],
            organization_id=ORG_ID,
            forecast_run_id=FORECAST_RUN_ID,
            department_id=tri_lyon.id,
            target_period={
                "startDate": (today - timedelta(days=1)).isoformat(),
                "endDate": (today + timedelta(days=6)).isoformat(),
            },
            type=DecisionType.REDISTRIBUTION,
            priority=DecisionPriority.MEDIUM,
            status=DecisionStatus.APPROVED,
            title="Transfert temporaire Reception vers Tri Lyon",
            description=(
                "Transferer 1 operateur polyvalent de Reception vers Tri "
                "pour la semaine en cours."
            ),
            rationale=(
                "L'operateur a deja une formation Tri. "
                "Reception a une marge suffisante cette semaine."
            ),
            risk_indicators={
                "risk_level": "low",
                "polyvalence_score": 0.9,
            },
            estimated_cost=300.00,
            cost_of_inaction=1800.00,
            confidence_score=90.0,
            reviewed_by=ADMIN_USER_ID,
            reviewed_at=now - timedelta(hours=12),
            manager_notes="OK pour le transfert, prevenir les 2 equipes.",
            implementation_deadline=today + timedelta(days=1),
        ),
        # --- 2 x IMPLEMENTED (with outcome) ---
        Decision(
            id=DECISION_IDS[6],
            organization_id=ORG_ID,
            forecast_run_id=FORECAST_RUN_ID,
            department_id=expedition_paris.id,
            target_period={
                "startDate": (today - timedelta(days=14)).isoformat(),
                "endDate": (today - timedelta(days=7)).isoformat(),
            },
            type=DecisionType.OVERTIME,
            priority=DecisionPriority.HIGH,
            status=DecisionStatus.IMPLEMENTED,
            title="Heures sup Expedition Paris - semaine 4",
            description=(
                "Mise en place d'heures supplementaires pour couvrir "
                "le pic de volume de la semaine 4."
            ),
            rationale=(
                "Deficit prevu de 18%, les heures sup ont couvert "
                "20% du gap avec un cout maitrise."
            ),
            risk_indicators={
                "risk_level": "medium",
                "actual_coverage": 0.20,
            },
            estimated_cost=2100.00,
            cost_of_inaction=5000.00,
            confidence_score=82.0,
            reviewed_by=ADMIN_USER_ID,
            reviewed_at=now - timedelta(days=15),
            manager_notes="Valide pour la semaine 4.",
            implementation_deadline=today - timedelta(days=14),
            implemented_by=ADMIN_USER_ID,
            implemented_at=now - timedelta(days=7),
            outcome={
                "effective": True,
                "actual_cost": 1950.00,
                "actual_impact": (
                    "Le pic a ete absorbe sans degradation de service. "
                    "Taux de couverture maintenu a 95%."
                ),
                "lessons_learned": (
                    "Planifier les heures sup 48h a l'avance minimum. "
                    "Privilegier les volontaires pour eviter la fatigue."
                ),
                "recorded_at": (now - timedelta(days=6)).isoformat(),
            },
        ),
        Decision(
            id=DECISION_IDS[7],
            organization_id=ORG_ID,
            forecast_run_id=FORECAST_RUN_ID,
            department_id=reception_paris.id,
            target_period={
                "startDate": (today - timedelta(days=21)).isoformat(),
                "endDate": (today - timedelta(days=14)).isoformat(),
            },
            type=DecisionType.NO_ACTION,
            priority=DecisionPriority.LOW,
            status=DecisionStatus.IMPLEMENTED,
            title="Degradation acceptee Reception Paris - S2",
            description=(
                "Decision de ne pas intervenir sur le deficit mineur "
                "de Reception Paris en semaine 2."
            ),
            rationale=(
                "Deficit prevu de 5% seulement, dans les marges acceptables. "
                "Le cout d'intervention depasse le cout d'inaction."
            ),
            risk_indicators={
                "risk_level": "low",
                "deficit_pct": 5.0,
            },
            estimated_cost=0.0,
            cost_of_inaction=400.00,
            confidence_score=95.0,
            reviewed_by=ADMIN_USER_ID,
            reviewed_at=now - timedelta(days=22),
            manager_notes="OK, deficit marginal.",
            implemented_by=ADMIN_USER_ID,
            implemented_at=now - timedelta(days=14),
            outcome={
                "effective": True,
                "actual_cost": 0.0,
                "actual_impact": (
                    "Impact minimal comme prevu. Aucun SLA impacte. "
                    "Delai moyen de traitement augmente de 3% seulement."
                ),
                "lessons_learned": (
                    "Les deficits sous 8% peuvent etre absorbes "
                    "sans intervention sur ce departement."
                ),
                "recorded_at": (now - timedelta(days=13)).isoformat(),
            },
        ),
    ]



async def seed() -> None:
    """Main seed function — idempotent."""
    async with async_session_factory() as session:
        # Check idempotency: skip if org already exists
        existing = await session.execute(
            select(Organization.id).where(Organization.slug == SLUG)
        )
        if existing.scalar_one_or_none() is not None:
            print(f"Organization '{SLUG}' already exists — skipping seed.")  # noqa: T201
            return

        # Build all entities
        org = _build_organization()
        sites = _build_sites()
        departments = _build_departments()
        admin_user = _build_admin_user()
        forecast_run = _build_forecast_run()
        daily_forecasts = _build_daily_forecasts(departments)
        alerts = _build_alerts(departments)
        decisions = _build_decisions(departments)

        # Insert in dependency order
        session.add(org)
        await session.flush()

        session.add_all(sites)
        await session.flush()

        session.add_all(departments)
        await session.flush()

        session.add(admin_user)
        session.add(forecast_run)
        await session.flush()

        session.add_all(daily_forecasts)
        session.add_all(alerts)
        await session.flush()

        session.add_all(decisions)

        await session.commit()
        print(  # noqa: T201
            f"Seed complete: 1 org, {len(sites)} sites, "
            f"{len(departments)} departments, 1 user, "
            f"1 forecast run, {len(daily_forecasts)} daily forecasts, "
            f"{len(alerts)} alerts, {len(decisions)} decisions."
        )


if __name__ == "__main__":
    asyncio.run(seed())
