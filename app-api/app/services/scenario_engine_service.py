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
from typing import TYPE_CHECKING, Any, cast

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
_MIN_SERVICE_THRESHOLD = Decimal("0.9800")
_MIN_FEASIBILITY_THRESHOLD = Decimal("0.6000")
_RECOMMENDATION_POLICY_VERSION = "policy_service98_min_cost_v1"
_ScenarioBlueprint = dict[str, object]


def _horizon_to_days(horizon: object) -> int:
    value = str(getattr(horizon, "value", horizon)).lower()
    if value == "j3":
        return 3
    if value == "j7":
        return 7
    return 14


def _clamp01(value: Decimal) -> Decimal:
    if value < 0:
        return Decimal("0")
    if value > 1:
        return Decimal("1")
    return value


def build_scenario_option_blueprints(
    *,
    gap: Decimal,
    cost_param: object,
    horizon: object,
    min_service_threshold: Decimal = _MIN_SERVICE_THRESHOLD,
    min_feasibility_threshold: Decimal = _MIN_FEASIBILITY_THRESHOLD,
    policy_version: str = _RECOMMENDATION_POLICY_VERSION,
) -> list[dict[str, object]]:
    """Build scenario option payloads without persisting DB rows.

    This is used by Gold-backed live endpoints to provide deterministic
    scenario exploration directly from medallion data.
    """
    horizon_days = _horizon_to_days(horizon)
    return _compute_all_options(
        gap,
        cost_param,
        horizon_days=horizon_days,
        min_service_threshold=min_service_threshold,
        min_feasibility_threshold=min_feasibility_threshold,
        policy_version=policy_version,
    )


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

    Strategy: apply explicit policy-compliant Pareto options only, then
    choose the minimum expected cost (tie-breaker: minimum risk).
    If policy flags are missing or all options are non-compliant,
    fail closed and return None.
    """
    if not pareto_options:
        return None

    compliant: list[ScenarioOption] = []
    has_explicit_policy = False
    missing_policy_flags = False
    for opt in pareto_options:
        policy_flag = getattr(opt, "policy_compliance", None)
        if policy_flag is not None:
            has_explicit_policy = True
            if bool(policy_flag):
                compliant.append(opt)
        else:
            missing_policy_flags = True

    if compliant:
        return min(
            compliant,
            key=lambda o: (
                o.cout_total_eur,
                (
                    getattr(o, "risk_score", None)
                    if getattr(o, "risk_score", None) is not None
                    else Decimal("1.0000")
                ),
            ),
        )

    if missing_policy_flags or has_explicit_policy:
        return None

    return None


def resolve_recommendation_outcome(
    pareto_options: list[ScenarioOption],
) -> dict[str, str | None]:
    """Explain why recommendation selection succeeded or failed."""
    recommended = select_recommendation(pareto_options)
    if recommended is not None:
        return {
            "state": "recommended",
            "reason": "policy_compliant_option_selected",
            "label": recommended.label,
        }

    if any(
        getattr(option, "policy_compliance", None) is None
        for option in pareto_options
    ):
        return {
            "state": "unconfigured",
            "reason": "missing_policy_compliance_flags",
            "label": None,
        }

    return {
        "state": "no_feasible_solution",
        "reason": "no_policy_compliant_option",
        "label": None,
    }


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

    # Build scenario options under active policy thresholds.
    options_data = build_scenario_option_blueprints(
        gap=gap,
        cost_param=cost_param,
        horizon=alert.horizon,
        min_service_threshold=_MIN_SERVICE_THRESHOLD,
        min_feasibility_threshold=_MIN_FEASIBILITY_THRESHOLD,
        policy_version=_RECOMMENDATION_POLICY_VERSION,
    )

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
            feasibility_score=data["feasibility_score"],
            risk_score=data["risk_score"],
            policy_compliance=data["policy_compliance"],
            dominance_reason=data.get("dominance_reason"),
            recommendation_policy_version=data["recommendation_policy_version"],
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
        opt.dominance_reason = "pareto_optimal"

    # Select recommendation
    recommended = select_recommendation(pareto)
    if recommended is not None:
        recommended.is_recommended = True

    for opt in options:
        if not opt.is_pareto_optimal and not opt.dominance_reason:
            opt.dominance_reason = "dominated_by_pareto"

    await session.flush()

    return options


def _compute_all_options(
    gap: Decimal,
    cost_param: object,
    *,
    horizon_days: int = 7,
    min_service_threshold: Decimal = _MIN_SERVICE_THRESHOLD,
    min_feasibility_threshold: Decimal = _MIN_FEASIBILITY_THRESHOLD,
    policy_version: str = _RECOMMENDATION_POLICY_VERSION,
) -> list[dict[str, object]]:
    """Compute the 6 scenario options given a gap and cost parameters."""
    c_int = _require_decimal_cost_param(cost_param, "c_int")
    maj_hs = _require_decimal_cost_param(cost_param, "maj_hs")
    c_interim = _require_decimal_cost_param(cost_param, "c_interim")
    premium_urgence = _require_decimal_cost_param(cost_param, "premium_urgence")
    c_backlog = _require_decimal_cost_param(cost_param, "c_backlog")
    cap_hs_shift = _require_int_cost_param(cost_param, "cap_hs_shift")
    cap_interim_site = _require_int_cost_param(cost_param, "cap_interim_site")
    lead_time_jours = _require_int_cost_param(cost_param, "lead_time_jours")

    options: list[_ScenarioBlueprint] = []
    zero = Decimal("0.00")

    def _policy_compliance(service: Decimal, feasibility: Decimal) -> bool:
        return (
            service >= min_service_threshold
            and feasibility >= min_feasibility_threshold
        )

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
                    "feasibility_score": Decimal("1.0000"),
                    "risk_score": Decimal("0.0000"),
                    "policy_compliance": True,
                    "recommendation_policy_version": policy_version,
                    "contraintes_json": {"selection_state": "no_gap"},
                }
            )
        return _finalize_blueprint_options(options)

    # 1. HS: overtime
    hs_hours = min(gap, Decimal(str(cap_hs_shift)))
    hs_cost = hs_hours * c_int * (1 + maj_hs)
    hs_service = hs_hours / gap if gap > 0 else Decimal("1.0000")
    hs_feasibility = _clamp01(hs_hours / gap) if gap > 0 else Decimal("1.0000")
    hs_risk = _clamp01(Decimal("1.0000") - hs_feasibility)
    options.append(
        {
            "option_type": ScenarioOptionType.HS,
            "label": "Heures suppl\u00e9mentaires",
            "cout_total_eur": _round2(hs_cost),
            "service_attendu_pct": _round4(hs_service),
            "heures_couvertes": _round2(hs_hours),
            "feasibility_score": _round4(hs_feasibility),
            "risk_score": _round4(hs_risk),
            "policy_compliance": _policy_compliance(hs_service, hs_feasibility),
            "recommendation_policy_version": policy_version,
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
    lead_time_factor = (
        Decimal("1.0000")
        if lead_time_jours <= horizon_days
        else _clamp01(Decimal(str(horizon_days)) / Decimal(str(lead_time_jours)))
    )
    interim_feasibility = (
        _clamp01((interim_hours / gap) * lead_time_factor)
        if gap > 0
        else Decimal("1.0000")
    )
    interim_risk = _clamp01(Decimal("1.0000") - interim_feasibility)
    options.append(
        {
            "option_type": ScenarioOptionType.INTERIM,
            "label": "Int\u00e9rim",
            "cout_total_eur": _round2(interim_cost),
            "service_attendu_pct": _round4(interim_service),
            "heures_couvertes": _round2(interim_hours),
            "feasibility_score": _round4(interim_feasibility),
            "risk_score": _round4(interim_risk),
            "policy_compliance": _policy_compliance(
                interim_service, interim_feasibility
            ),
            "recommendation_policy_version": policy_version,
            "contraintes_json": {
                "cap_interim_site": cap_interim_site,
                "lead_time_jours": lead_time_jours,
                "horizon_days": horizon_days,
                "capped": gap > interim_hours,
            },
        }
    )

    # 3. Realloc intra-site
    intra_covered = gap * _INTRA_PRODUCTIVITY
    intra_cost = gap * _C_FRICTION_INTRA
    intra_service = intra_covered / gap if gap > 0 else Decimal("1.0000")
    intra_feasibility = Decimal("0.9000")
    intra_risk = Decimal("0.2500")
    options.append(
        {
            "option_type": ScenarioOptionType.REALLOC_INTRA,
            "label": "R\u00e9allocation intra-site",
            "cout_total_eur": _round2(intra_cost),
            "service_attendu_pct": _round4(intra_service),
            "heures_couvertes": _round2(intra_covered),
            "feasibility_score": intra_feasibility,
            "risk_score": intra_risk,
            "policy_compliance": _policy_compliance(intra_service, intra_feasibility),
            "recommendation_policy_version": policy_version,
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
    inter_feasibility = Decimal("0.7500")
    inter_risk = Decimal("0.4000")
    options.append(
        {
            "option_type": ScenarioOptionType.REALLOC_INTER,
            "label": "R\u00e9allocation inter-site",
            "cout_total_eur": _round2(inter_cost),
            "service_attendu_pct": _round4(inter_service),
            "heures_couvertes": _round2(inter_covered),
            "feasibility_score": inter_feasibility,
            "risk_score": inter_risk,
            "policy_compliance": _policy_compliance(inter_service, inter_feasibility),
            "recommendation_policy_version": policy_version,
            "contraintes_json": {
                "productivity_ratio": str(_INTER_PRODUCTIVITY),
                "persons_needed": str(_round2(persons_needed)),
            },
        }
    )

    # 5. Service adjust (accept backlog)
    adjust_cost = gap * c_backlog
    adjust_feasibility = Decimal("1.0000")
    adjust_service = Decimal("0.0000")
    options.append(
        {
            "option_type": ScenarioOptionType.SERVICE_ADJUST,
            "label": "Ajustement de service",
            "cout_total_eur": _round2(adjust_cost),
            "service_attendu_pct": adjust_service,
            "heures_couvertes": zero,
            "feasibility_score": adjust_feasibility,
            "risk_score": Decimal("1.0000"),
            "policy_compliance": _policy_compliance(adjust_service, adjust_feasibility),
            "recommendation_policy_version": policy_version,
            "contraintes_json": {"accepts_full_gap": True},
        }
    )

    # 6. Outsource
    outsource_cost = gap * c_interim * _OUTSOURCE_MULTIPLIER
    outsource_feasibility = Decimal("0.8000")
    outsource_service = Decimal("1.0000")
    options.append(
        {
            "option_type": ScenarioOptionType.OUTSOURCE,
            "label": "Sous-traitance",
            "cout_total_eur": _round2(outsource_cost),
            "service_attendu_pct": outsource_service,
            "heures_couvertes": _round2(gap),
            "feasibility_score": outsource_feasibility,
            "risk_score": Decimal("0.3500"),
            "policy_compliance": _policy_compliance(
                outsource_service, outsource_feasibility
            ),
            "recommendation_policy_version": policy_version,
            "contraintes_json": {"multiplier": str(_OUTSOURCE_MULTIPLIER)},
        }
    )

    return _finalize_blueprint_options(options)


def _round2(v: Decimal) -> Decimal:
    """Round a Decimal to 2 decimal places."""
    return v.quantize(Decimal("0.01"))


def _round4(v: Decimal) -> Decimal:
    """Round a Decimal to 4 decimal places."""
    return v.quantize(Decimal("0.0001"))


def _finalize_blueprint_options(
    options: list[_ScenarioBlueprint],
) -> list[_ScenarioBlueprint]:
    for option in options:
        option.setdefault("is_pareto_optimal", False)
        option.setdefault("is_recommended", False)
    return options


def _require_cost_param_value(cost_param: object, field_name: str) -> object:
    value = getattr(cost_param, field_name, None)
    if value is None and isinstance(cost_param, dict):
        value = cast("dict[str, Any]", cost_param).get(field_name)
    if value is None:
        raise ValueError(f"unconfigured cost parameter: {field_name}")
    return value


def _require_decimal_cost_param(cost_param: object, field_name: str) -> Decimal:
    return Decimal(str(_require_cost_param_value(cost_param, field_name)))


def _require_int_cost_param(cost_param: object, field_name: str) -> int:
    return int(str(_require_cost_param_value(cost_param, field_name)))


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
