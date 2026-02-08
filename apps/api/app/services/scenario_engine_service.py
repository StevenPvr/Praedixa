"""Scenario engine service — Pareto-optimal remediation option generator.

Core economic engine that generates and evaluates 6 scenario options for each
coverage alert:
1. HS (heures supplementaires) — overtime at internal rate
2. Interim — temporary workers at interim rate + urgency premium
3. Realloc intra-site — internal reallocation with friction cost
4. Realloc inter-site — cross-site reallocation with travel + friction
5. Service adjust — accept gap as backlog at backlog cost
6. Outsource — external outsourcing at premium rate

Then computes the Pareto frontier (non-dominated set) and recommends the
lowest-cost option with service >= 98%.

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- Scenario options are server-computed — contraintes_json is never from client.
- ScenarioOption.cost_parameter_id links to the CostParameter used for audit.
- No raw SQL — SQLAlchemy ORM queries only.
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import select

from app.core.exceptions import NotFoundError
from app.models.operational import (
    CoverageAlert,
    ScenarioOption,
    ScenarioOptionType,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter


# ── Constants for scenario calculations ─────────────────

_C_FRICTION_INTRA = Decimal("5.00")  # EUR/h for intra-site reallocation
_C_FRICTION_INTER = Decimal("8.00")  # EUR/h for inter-site reallocation
_C_TRAJET = Decimal("80.00")  # EUR/person/day for cross-site travel
_INTRA_PRODUCTIVITY = Decimal("0.85")  # 85% productivity ratio
_INTER_PRODUCTIVITY = Decimal("0.75")  # 75% productivity ratio
_OUTSOURCE_MULTIPLIER = Decimal("1.50")  # 1.5x interim rate


def compute_pareto_frontier(options: list[ScenarioOption]) -> list[ScenarioOption]:
    """Compute Pareto-optimal options (non-dominated set).

    Option A dominates B if:
    - cost_A <= cost_B AND service_A >= service_B
    - with at least one strict inequality

    O(n^2) is acceptable for 6 options max.
    """
    pareto: list[ScenarioOption] = []

    for candidate in options:
        dominated = False
        for other in options:
            if other is candidate:
                continue
            # other dominates candidate?
            cost_le = other.cout_total_eur <= candidate.cout_total_eur
            service_ge = other.service_attendu_pct >= candidate.service_attendu_pct
            cost_lt = other.cout_total_eur < candidate.cout_total_eur
            service_gt = other.service_attendu_pct > candidate.service_attendu_pct

            if cost_le and service_ge and (cost_lt or service_gt):
                dominated = True
                break

        if not dominated:
            pareto.append(candidate)

    return pareto


def select_recommendation(
    pareto_options: list[ScenarioOption],
) -> ScenarioOption | None:
    """Select recommended option from the Pareto frontier.

    Strategy: service >= 98% at minimum cost.
    If none at 98%, take highest service at minimum cost.
    """
    if not pareto_options:
        return None

    threshold = Decimal("0.9800")

    # Filter options with service >= 98%
    high_service = [
        opt for opt in pareto_options if opt.service_attendu_pct >= threshold
    ]

    if high_service:
        # Return lowest cost among high-service options
        return min(high_service, key=lambda o: o.cout_total_eur)

    # No option at 98%: take highest service, then lowest cost
    return min(
        pareto_options,
        key=lambda o: (-o.service_attendu_pct, o.cout_total_eur),
    )


async def generate_scenarios(
    session: AsyncSession,
    tenant: TenantFilter,
    alert_id: uuid.UUID,
) -> list[ScenarioOption]:
    """Generate 6 scenario options for a coverage alert.

    Tenant isolation: alert fetched with TenantFilter; cost parameter
    loaded with TenantFilter. All created options inherit org_id.

    Steps:
    1. Load the alert (validates tenant access).
    2. Load the effective cost parameter for the alert's site.
    3. Compute 6 scenario options.
    4. Compute Pareto frontier and mark optimal/recommended.
    5. Persist and return options.
    """
    from app.services.cost_parameter_service import get_effective_cost_parameter

    org_id = uuid.UUID(tenant.organization_id)

    # Load alert with tenant isolation
    alert_query = tenant.apply(
        select(CoverageAlert).where(CoverageAlert.id == alert_id),
        CoverageAlert,
    )
    result = await session.execute(alert_query)
    alert = result.scalar_one_or_none()

    if alert is None:
        raise NotFoundError("CoverageAlert", str(alert_id))

    gap = Decimal(str(alert.gap_h))

    # Load effective cost parameter
    cost_param = await get_effective_cost_parameter(
        session,
        tenant,
        site_id=alert.site_id,
        target_date=alert.alert_date,
    )

    # Build 6 scenario options
    options_data = _compute_all_options(gap, cost_param)

    # Create ScenarioOption ORM objects
    options: list[ScenarioOption] = []
    for data in options_data:
        opt = ScenarioOption(
            organization_id=org_id,
            coverage_alert_id=alert_id,
            cost_parameter_id=cost_param.id,
            option_type=data["option_type"],
            label=data["label"],
            cout_total_eur=data["cout_total_eur"],
            service_attendu_pct=data["service_attendu_pct"],
            heures_couvertes=data["heures_couvertes"],
            is_pareto_optimal=False,
            is_recommended=False,
            contraintes_json=data.get("contraintes_json", {}),
        )
        session.add(opt)
        options.append(opt)

    await session.flush()

    # Compute Pareto frontier
    pareto = compute_pareto_frontier(options)
    for opt in pareto:
        opt.is_pareto_optimal = True

    # Select recommendation
    recommended = select_recommendation(pareto)
    if recommended is not None:
        recommended.is_recommended = True

    await session.flush()

    return options


def _compute_all_options(
    gap: Decimal,
    cost_param: object,
) -> list[dict[str, object]]:
    """Compute the 6 scenario options given a gap and cost parameters."""
    # Extract cost parameters (handle both ORM objects and dicts)
    c_int = Decimal(str(getattr(cost_param, "c_int", 0)))
    maj_hs = Decimal(str(getattr(cost_param, "maj_hs", 0)))
    c_interim = Decimal(str(getattr(cost_param, "c_interim", 0)))
    premium_urgence = Decimal(str(getattr(cost_param, "premium_urgence", 0)))
    c_backlog = Decimal(str(getattr(cost_param, "c_backlog", 0)))
    cap_hs_shift = int(getattr(cost_param, "cap_hs_shift", 30))
    cap_interim_site = int(getattr(cost_param, "cap_interim_site", 50))

    options = []
    zero = Decimal("0.00")

    if gap <= zero:
        # No gap: all options have zero cost and 100% service
        for opt_type, label in [
            (ScenarioOptionType.HS, "Heures suppl\u00e9mentaires"),
            (ScenarioOptionType.INTERIM, "Int\u00e9rim"),
            (ScenarioOptionType.REALLOC_INTRA, "R\u00e9allocation intra-site"),
            (ScenarioOptionType.REALLOC_INTER, "R\u00e9allocation inter-site"),
            (ScenarioOptionType.SERVICE_ADJUST, "Ajustement de service"),
            (ScenarioOptionType.OUTSOURCE, "Sous-traitance"),
        ]:
            options.append(
                {
                    "option_type": opt_type,
                    "label": label,
                    "cout_total_eur": zero,
                    "service_attendu_pct": Decimal("1.0000"),
                    "heures_couvertes": zero,
                    "contraintes_json": {},
                }
            )
        return options

    # 1. HS: overtime
    hs_hours = min(gap, Decimal(str(cap_hs_shift)))
    hs_cost = hs_hours * c_int * (1 + maj_hs)
    hs_service = hs_hours / gap if gap > 0 else Decimal("1.0000")
    options.append(
        {
            "option_type": ScenarioOptionType.HS,
            "label": "Heures suppl\u00e9mentaires",
            "cout_total_eur": _round2(hs_cost),
            "service_attendu_pct": _round4(hs_service),
            "heures_couvertes": _round2(hs_hours),
            "contraintes_json": {
                "cap_hs_shift": cap_hs_shift,
                "capped": gap > hs_hours,
            },
        }
    )

    # 2. Interim
    interim_hours = min(gap, Decimal(str(cap_interim_site)))
    interim_cost = interim_hours * c_interim * (1 + premium_urgence)
    interim_service = interim_hours / gap if gap > 0 else Decimal("1.0000")
    options.append(
        {
            "option_type": ScenarioOptionType.INTERIM,
            "label": "Int\u00e9rim",
            "cout_total_eur": _round2(interim_cost),
            "service_attendu_pct": _round4(interim_service),
            "heures_couvertes": _round2(interim_hours),
            "contraintes_json": {
                "cap_interim_site": cap_interim_site,
                "capped": gap > interim_hours,
            },
        }
    )

    # 3. Realloc intra-site
    intra_covered = gap * _INTRA_PRODUCTIVITY
    intra_cost = gap * _C_FRICTION_INTRA
    intra_service = intra_covered / gap if gap > 0 else Decimal("1.0000")
    options.append(
        {
            "option_type": ScenarioOptionType.REALLOC_INTRA,
            "label": "R\u00e9allocation intra-site",
            "cout_total_eur": _round2(intra_cost),
            "service_attendu_pct": _round4(intra_service),
            "heures_couvertes": _round2(intra_covered),
            "contraintes_json": {"productivity_ratio": str(_INTRA_PRODUCTIVITY)},
        }
    )

    # 4. Realloc inter-site
    persons_needed = gap / Decimal("8")  # 8h per person per day
    inter_travel = persons_needed * _C_TRAJET
    inter_friction = gap * _C_FRICTION_INTER
    inter_cost = inter_travel + inter_friction
    inter_covered = gap * _INTER_PRODUCTIVITY
    inter_service = inter_covered / gap if gap > 0 else Decimal("1.0000")
    options.append(
        {
            "option_type": ScenarioOptionType.REALLOC_INTER,
            "label": "R\u00e9allocation inter-site",
            "cout_total_eur": _round2(inter_cost),
            "service_attendu_pct": _round4(inter_service),
            "heures_couvertes": _round2(inter_covered),
            "contraintes_json": {
                "productivity_ratio": str(_INTER_PRODUCTIVITY),
                "persons_needed": str(_round2(persons_needed)),
            },
        }
    )

    # 5. Service adjust (accept backlog)
    adjust_cost = gap * c_backlog
    options.append(
        {
            "option_type": ScenarioOptionType.SERVICE_ADJUST,
            "label": "Ajustement de service",
            "cout_total_eur": _round2(adjust_cost),
            "service_attendu_pct": Decimal("0.0000"),
            "heures_couvertes": zero,
            "contraintes_json": {"accepts_full_gap": True},
        }
    )

    # 6. Outsource
    outsource_cost = gap * c_interim * _OUTSOURCE_MULTIPLIER
    options.append(
        {
            "option_type": ScenarioOptionType.OUTSOURCE,
            "label": "Sous-traitance",
            "cout_total_eur": _round2(outsource_cost),
            "service_attendu_pct": Decimal("1.0000"),
            "heures_couvertes": _round2(gap),
            "contraintes_json": {"multiplier": str(_OUTSOURCE_MULTIPLIER)},
        }
    )

    return options


def _round2(v: Decimal) -> Decimal:
    """Round a Decimal to 2 decimal places."""
    return v.quantize(Decimal("0.01"))


def _round4(v: Decimal) -> Decimal:
    """Round a Decimal to 4 decimal places."""
    return v.quantize(Decimal("0.0001"))


async def get_scenarios_for_alert(
    session: AsyncSession,
    tenant: TenantFilter,
    alert_id: uuid.UUID,
) -> list[ScenarioOption]:
    """Get existing scenarios for an alert (read-only).

    Tenant isolation: query scoped by TenantFilter on ScenarioOption.
    Returns empty list if no scenarios exist.
    """
    query = tenant.apply(
        select(ScenarioOption).where(
            ScenarioOption.coverage_alert_id == alert_id,
        ),
        ScenarioOption,
    ).order_by(ScenarioOption.cout_total_eur.asc())

    result = await session.execute(query)
    return list(result.scalars().all())
