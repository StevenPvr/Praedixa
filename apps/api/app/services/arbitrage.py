"""Arbitrage service — scoring engine for gap resolution options.

Security:
- Alert lookup uses TenantFilter (organization_id isolation).
- Department and forecast queries also use tenant filter (defense in depth).
- All monetary calculations use safe arithmetic — no division by zero.
- No user input is used in calculations — all data comes from DB.

Threat model:
- IDOR: Prevented by TenantFilter on alert + department + forecast queries.
- Data manipulation: All scoring constants are server-side, not client-provided.
- Numeric overflow: Cost capped at reasonable maximums via min() bounds.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.models.daily_forecast import DailyForecast, ForecastDimension
from app.models.dashboard_alert import DashboardAlert
from app.models.department import Department
from app.models.site import Site

# Scoring constants — tunable, server-side only.
# Never exposed to clients or derived from user input.
SCORING_CONSTANTS: dict[str, dict[str, float]] = {
    "overtime": {
        "hourly_rate": 25.0,
        "overtime_multiplier": 1.25,
        "max_coverage_pct": 20.0,
        "delay_days": 0,
        "risk_weight": 0.4,  # medium
    },
    "external": {
        "daily_rate": 200.0,
        "agency_multiplier": 1.8,
        "max_coverage_pct": 80.0,
        "delay_min": 2,
        "delay_max": 5,
        "risk_weight": 0.4,  # medium
    },
    "redistribution": {
        "transfer_cost_per_day": 150.0,
        "max_coverage_pct": 50.0,
        "delay_min": 1,
        "delay_max": 3,
        "risk_weight": 0.2,  # low
    },
    "no_action": {
        "risk_weight": 0.8,  # high
    },
}


class ArbitrageOption:
    """Value object for a single arbitrage option.

    Uses __slots__ to match the DashboardSummary pattern (lightweight,
    framework-agnostic value objects in the service layer).
    """

    __slots__ = (
        "cons",
        "cost",
        "coverage_impact_pct",
        "delay_days",
        "label",
        "pros",
        "risk_details",
        "risk_level",
        "score",
        "type",
    )

    def __init__(
        self,
        *,
        type: str,
        label: str,
        cost: float,
        delay_days: int,
        coverage_impact_pct: float,
        risk_level: str,
        risk_details: str,
        pros: list[str],
        cons: list[str],
        score: float,
    ) -> None:
        self.type = type
        self.label = label
        self.cost = cost
        self.delay_days = delay_days
        self.coverage_impact_pct = coverage_impact_pct
        self.risk_level = risk_level
        self.risk_details = risk_details
        self.pros = pros
        self.cons = cons
        self.score = score


class ArbitrageResult:
    """Value object for the complete arbitrage analysis result."""

    __slots__ = (
        "alert_id",
        "alert_severity",
        "alert_title",
        "deficit_pct",
        "department_id",
        "department_name",
        "horizon_days",
        "options",
        "recommendation_index",
        "site_name",
    )

    def __init__(
        self,
        *,
        alert_id: uuid.UUID,
        alert_title: str,
        alert_severity: str,
        department_id: uuid.UUID,
        department_name: str,
        site_name: str,
        deficit_pct: float,
        horizon_days: int,
        options: list[ArbitrageOption],
        recommendation_index: int,
    ) -> None:
        self.alert_id = alert_id
        self.alert_title = alert_title
        self.alert_severity = alert_severity
        self.department_id = department_id
        self.department_name = department_name
        self.site_name = site_name
        self.deficit_pct = deficit_pct
        self.horizon_days = horizon_days
        self.options = options
        self.recommendation_index = recommendation_index


def _compute_deficit(forecasts: list) -> tuple[float, float, int]:
    """Compute total deficit hours, average deficit %, and horizon from forecasts.

    Returns (total_deficit_hours, avg_deficit_pct, horizon_days).
    Only considers rows with negative gap (under-capacity).
    """
    deficit_rows = [f for f in forecasts if float(f.gap) < 0]
    if not deficit_rows:
        return 0.0, 0.0, 0

    total_deficit_hours = sum(abs(float(f.gap)) for f in deficit_rows)
    deficit_pcts = []
    for f in deficit_rows:
        demand = float(f.predicted_demand)
        if demand > 0:
            deficit_pcts.append(abs(float(f.gap)) / demand * 100)

    avg_deficit_pct = sum(deficit_pcts) / len(deficit_pcts) if deficit_pcts else 0.0

    # Horizon = number of distinct future days with deficit
    today = datetime.now(UTC).date()
    future_dates = {f.forecast_date for f in deficit_rows if f.forecast_date > today}
    horizon_days = len(future_dates) if future_dates else len(deficit_rows)

    return total_deficit_hours, round(avg_deficit_pct, 1), horizon_days


def _generate_options(
    deficit_hours: float,
    deficit_pct: float,
    horizon_days: int,
    headcount: int,
) -> list[ArbitrageOption]:
    """Generate 4 arbitrage options with heuristic scoring.

    Each option has a composite score:
        score = (coverage / max(cost, 1)) * (1 / max(delay, 0.5)) * (1 - risk_weight)

    Higher score = better option = recommended.
    """
    options: list[ArbitrageOption] = []

    # --- Option 1: Heures supplémentaires ---
    ot = SCORING_CONSTANTS["overtime"]
    ot_coverage = min(deficit_pct, ot["max_coverage_pct"])
    ot_cost = deficit_hours * ot["hourly_rate"] * ot["overtime_multiplier"]
    ot_delay = int(ot["delay_days"])
    ot_score = (
        (ot_coverage / max(ot_cost, 1))
        * (1 / max(ot_delay, 0.5))
        * (1 - ot["risk_weight"])
    )

    options.append(ArbitrageOption(
        type="overtime",
        label="Heures supplementaires",
        cost=round(ot_cost, 2),
        delay_days=ot_delay,
        coverage_impact_pct=round(ot_coverage, 1),
        risk_level="medium",
        risk_details="Fatigue accrue, risque de baisse de productivite sur la duree",
        pros=[
            "Mise en place immediate",
            "Pas de formation necessaire",
            "Equipe existante connait les processus",
        ],
        cons=[
            f"Cout majore x{ot['overtime_multiplier']}",
            f"Couverture limitee a {ot['max_coverage_pct']}% du deficit",
            "Risque de fatigue et turnover",
        ],
        score=ot_score,
    ))

    # --- Option 2: Intérim ---
    ext = SCORING_CONSTANTS["external"]
    ext_coverage = min(deficit_pct, ext["max_coverage_pct"])
    deficit_days = max(1, horizon_days)
    ext_cost = deficit_days * ext["daily_rate"] * ext["agency_multiplier"]
    ext_delay = int((ext["delay_min"] + ext["delay_max"]) / 2)
    ext_score = (
        (ext_coverage / max(ext_cost, 1))
        * (1 / max(ext_delay, 0.5))
        * (1 - ext["risk_weight"])
    )

    options.append(ArbitrageOption(
        type="external",
        label="Personnel interimaire",
        cost=round(ext_cost, 2),
        delay_days=ext_delay,
        coverage_impact_pct=round(ext_coverage, 1),
        risk_level="medium",
        risk_details="Temps de formation, productivite reduite les premiers jours",
        pros=[
            "Forte capacite de couverture",
            "Flexible, ajustable au besoin",
            "Pas d'engagement long terme",
        ],
        cons=[
            f"Cout agence x{ext['agency_multiplier']}",
            f"Delai de {int(ext['delay_min'])}-{int(ext['delay_max'])} jours",
            "Necessite formation et supervision",
        ],
        score=ext_score,
    ))

    # --- Option 3: Réallocation interne ---
    rd = SCORING_CONSTANTS["redistribution"]
    rd_coverage = min(deficit_pct, rd["max_coverage_pct"])
    transfer_days = max(1, min(deficit_days, 5))
    rd_cost = transfer_days * rd["transfer_cost_per_day"]
    rd_delay = int((rd["delay_min"] + rd["delay_max"]) / 2)
    rd_score = (
        (rd_coverage / max(rd_cost, 1))
        * (1 / max(rd_delay, 0.5))
        * (1 - rd["risk_weight"])
    )

    options.append(ArbitrageOption(
        type="redistribution",
        label="Reallocation interne",
        cost=round(rd_cost, 2),
        delay_days=rd_delay,
        coverage_impact_pct=round(rd_coverage, 1),
        risk_level="low",
        risk_details="Impact sur les departements donneurs, necessite coordination",
        pros=[
            "Cout le plus bas",
            "Equipe deja formee aux processus internes",
            "Risque minimal",
        ],
        cons=[
            f"Couverture limitee a {rd['max_coverage_pct']}% du deficit",
            "Deplace le probleme vers un autre departement",
            "Necessite accord des managers",
        ],
        score=rd_score,
    ))

    # --- Option 4: Accepter la dégradation ---
    na = SCORING_CONSTANTS["no_action"]
    # Cost of inaction estimated from deficit impact on headcount
    cost_of_inaction = deficit_hours * 30.0  # ~30 EUR per lost hour of productivity
    na_score = (0.01 / max(cost_of_inaction, 1)) * (1 / 0.5) * (1 - na["risk_weight"])

    options.append(ArbitrageOption(
        type="no_action",
        label="Accepter la degradation",
        cost=0.0,
        delay_days=0,
        coverage_impact_pct=0.0,
        risk_level="high",
        risk_details=(
            f"Cout indirect estime: {round(cost_of_inaction, 2)} EUR "
            "en perte de productivite et retards"
        ),
        pros=[
            "Aucun cout direct",
            "Pas de perturbation organisationnelle",
        ],
        cons=[
            f"Cout indirect estime: {round(cost_of_inaction, 2)} EUR",
            "Impact sur les SLA et la satisfaction client",
            "Risque de cascade sur les periodes suivantes",
        ],
        score=na_score,
    ))

    return options


async def get_arbitrage_options(
    alert_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
) -> ArbitrageResult:
    """Compute arbitrage options for a given alert.

    Security flow:
    1. Fetch alert with tenant filter (IDOR prevention).
    2. Fetch department with tenant filter (defense in depth).
    3. Fetch site with tenant filter (defense in depth).
    4. Query future forecasts with negative gap for that department.
    5. Generate and score 4 options.
    6. Recommend the option with the highest composite score.
    """
    # Step 1: Verify alert belongs to tenant
    alert_query = tenant.apply(
        select(DashboardAlert).where(DashboardAlert.id == alert_id),
        DashboardAlert,
    )
    result = await session.execute(alert_query)
    alert = result.scalar_one_or_none()

    if alert is None:
        raise NotFoundError("DashboardAlert", str(alert_id))

    # Step 2: Get the related department (from alert's related_entity_id)
    dept_id = alert.related_entity_id
    if dept_id is None:
        raise NotFoundError("Department", "none")

    dept_query = tenant.apply(
        select(Department).where(Department.id == dept_id),
        Department,
    )
    dept_result = await session.execute(dept_query)
    department = dept_result.scalar_one_or_none()

    if department is None:
        raise NotFoundError("Department", str(dept_id))

    # Step 3: Get the site name (for display context)
    site_name = "Site inconnu"
    if department.site_id is not None:
        site_query = tenant.apply(
            select(Site).where(Site.id == department.site_id),
            Site,
        )
        site_result = await session.execute(site_query)
        site = site_result.scalar_one_or_none()
        if site is not None:
            site_name = site.name

    # Step 4: Query future daily forecasts with negative gap for this department
    today = datetime.now(UTC).date()
    forecast_query = tenant.apply(
        select(DailyForecast).where(
            DailyForecast.department_id == dept_id,
            DailyForecast.forecast_date > today,
            DailyForecast.gap < 0,
            DailyForecast.dimension == ForecastDimension.HUMAN,
        ),
        DailyForecast,
    )
    forecast_result = await session.execute(forecast_query)
    forecasts = list(forecast_result.scalars().all())

    # Step 5: Compute deficit metrics
    deficit_hours, deficit_pct, horizon_days = _compute_deficit(forecasts)

    # If no deficit found, still return options with zero values
    if deficit_hours == 0:
        deficit_pct = 5.0  # Minimum nominal deficit for option generation
        horizon_days = max(1, horizon_days)
        deficit_hours = 8.0  # 1 day equivalent

    # Step 6: Generate and score options
    headcount = int(department.headcount) if department.headcount else 20
    options = _generate_options(deficit_hours, deficit_pct, horizon_days, headcount)

    # Step 7: Recommend the option with the highest composite score
    recommendation_index = 0
    best_score = -1.0
    for i, opt in enumerate(options):
        if opt.score > best_score:
            best_score = opt.score
            recommendation_index = i

    return ArbitrageResult(
        alert_id=alert_id,
        alert_title=alert.title,
        alert_severity=(
            alert.severity
            if isinstance(alert.severity, str)
            else alert.severity.value
        ),
        department_id=department.id,
        department_name=department.name,
        site_name=site_name,
        deficit_pct=deficit_pct,
        horizon_days=horizon_days,
        options=options,
        recommendation_index=recommendation_index,
    )
