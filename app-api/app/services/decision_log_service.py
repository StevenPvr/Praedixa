"""Decision log service — CRUD for operational decisions with outcome tracking.

Records manager decisions on coverage alerts, tracking which scenario option
was chosen (or if the recommendation was overridden). Supports backfilling
observed costs and service levels for proof-of-value calculations.

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- decided_by comes from JWT context, never from client body.
- Override decisions require override_reason (enforced here).
- Observed outcome fields are write-once-per-update (no silent overwrites).
- No raw SQL — SQLAlchemy ORM queries only.
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import func, select

from app.core.exceptions import NotFoundError, PraedixaError
from app.core.pagination import normalize_page_window
from app.core.validation import sanitize_text
from app.models.operational import (
    CoverageAlert,
    Horizon,
    OperationalDecision,
    ScenarioOption,
    ShiftType,
)

if TYPE_CHECKING:
    from datetime import date

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter


class OverrideReasonRequiredError(PraedixaError):
    """Raised when an override decision is missing a reason."""

    def __init__(self) -> None:
        super().__init__(
            message="Override decisions require an override_reason",
            code="OVERRIDE_REASON_REQUIRED",
            status_code=422,
        )


class ObservedOutcomeImmutableError(PraedixaError):
    """Raised when attempting to overwrite an already observed outcome."""

    def __init__(self, field_name: str) -> None:
        super().__init__(
            message=f"Observed outcome field '{field_name}' is write-once",
            code="OBSERVED_OUTCOME_IMMUTABLE",
            status_code=409,
        )


async def list_operational_decisions(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    site_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    is_override: bool | None = None,
    horizon: Horizon | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[OperationalDecision], int]:
    """List operational decisions with filters and pagination.

    Tenant isolation: mandatory WHERE on organization_id via TenantFilter.
    Returns (items, total_count). Ordered by decision_date DESC.
    """
    base = tenant.apply(select(OperationalDecision), OperationalDecision)
    count_q = tenant.apply(
        select(func.count(OperationalDecision.id)), OperationalDecision
    )

    if site_id is not None:
        base = base.where(OperationalDecision.site_id == site_id)
        count_q = count_q.where(OperationalDecision.site_id == site_id)

    if date_from is not None:
        base = base.where(OperationalDecision.decision_date >= date_from)
        count_q = count_q.where(OperationalDecision.decision_date >= date_from)

    if date_to is not None:
        base = base.where(OperationalDecision.decision_date <= date_to)
        count_q = count_q.where(OperationalDecision.decision_date <= date_to)

    if is_override is not None:
        base = base.where(OperationalDecision.is_override == is_override)
        count_q = count_q.where(OperationalDecision.is_override == is_override)

    if horizon is not None:
        base = base.where(OperationalDecision.horizon == horizon)
        count_q = count_q.where(OperationalDecision.horizon == horizon)

    total = (await session.execute(count_q)).scalar_one() or 0

    _, page_size, offset = normalize_page_window(page, page_size)
    query = (
        base.order_by(OperationalDecision.decision_date.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_operational_decision(
    session: AsyncSession,
    tenant: TenantFilter,
    decision_id: uuid.UUID,
) -> OperationalDecision:
    """Get a single operational decision by ID.

    Tenant isolation: TenantFilter on query. Raises NotFoundError if missing
    or belongs to another organization (IDOR prevention).
    """
    query = tenant.apply(
        select(OperationalDecision).where(OperationalDecision.id == decision_id),
        OperationalDecision,
    )
    result = await session.execute(query)
    decision: OperationalDecision | None = result.scalar_one_or_none()

    if decision is None:
        raise NotFoundError("OperationalDecision", str(decision_id))

    return decision


async def create_operational_decision(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    coverage_alert_id: uuid.UUID,
    chosen_option_id: uuid.UUID | None,
    site_id: str,
    decision_date: date,
    shift: ShiftType,
    horizon: Horizon,
    gap_h: Decimal,
    decided_by: uuid.UUID,
    is_override: bool = False,
    override_reason: str | None = None,
    override_category: str | None = None,
    exogenous_event_tag: str | None = None,
    comment: str | None = None,
) -> OperationalDecision:
    """Create an operational decision.

    Tenant isolation: organization_id from TenantFilter, never from client.
    decided_by comes from JWT context.

    Auto-populates:
    - recommended_option_id from the alert's recommended scenario
    - cout_attendu_eur and service_attendu_pct from the chosen option
    """
    org_id = uuid.UUID(tenant.organization_id)

    # Validate override reason
    if is_override and not override_reason:
        raise OverrideReasonRequiredError

    # Verify alert belongs to tenant
    alert_q = tenant.apply(
        select(CoverageAlert).where(CoverageAlert.id == coverage_alert_id),
        CoverageAlert,
    )
    alert_result = await session.execute(alert_q)
    alert = alert_result.scalar_one_or_none()
    if alert is None:
        raise NotFoundError("CoverageAlert", str(coverage_alert_id))

    # Find recommended option for this alert
    rec_q = tenant.apply(
        select(ScenarioOption).where(
            ScenarioOption.coverage_alert_id == coverage_alert_id,
            ScenarioOption.is_recommended.is_(True),
        ),
        ScenarioOption,
    )
    rec_result = await session.execute(rec_q)
    recommended = rec_result.scalar_one_or_none()
    recommended_option_id = recommended.id if recommended else None

    # Load chosen option for cost/service
    cout_attendu: Decimal | None = None
    service_attendu: Decimal | None = None
    recommendation_policy_version: str | None = None
    if chosen_option_id is not None:
        opt_q = tenant.apply(
            select(ScenarioOption).where(ScenarioOption.id == chosen_option_id),
            ScenarioOption,
        )
        opt_result = await session.execute(opt_q)
        chosen = opt_result.scalar_one_or_none()
        if chosen is not None:
            cout_attendu = chosen.cout_total_eur
            service_attendu = chosen.service_attendu_pct
            recommendation_policy_version = getattr(
                chosen,
                "recommendation_policy_version",
                None,
            )
    if recommendation_policy_version is None and recommended is not None:
        recommendation_policy_version = getattr(
            recommended,
            "recommendation_policy_version",
            None,
        )

    decision = OperationalDecision(
        organization_id=org_id,
        coverage_alert_id=coverage_alert_id,
        recommended_option_id=recommended_option_id,
        chosen_option_id=chosen_option_id,
        site_id=site_id,
        decision_date=decision_date,
        shift=shift,
        horizon=horizon,
        gap_h=gap_h,
        decided_by=decided_by,
        is_override=is_override,
        override_reason=(
            sanitize_text(override_reason, max_length=500) if override_reason else None
        ),
        override_category=(
            sanitize_text(override_category, max_length=50)
            if override_category
            else None
        ),
        exogenous_event_tag=(
            sanitize_text(exogenous_event_tag, max_length=100)
            if exogenous_event_tag
            else None
        ),
        recommendation_policy_version=recommendation_policy_version,
        cout_attendu_eur=cout_attendu,
        service_attendu_pct=service_attendu,
        comment=sanitize_text(comment, max_length=1000) if comment else None,
    )
    session.add(decision)
    await session.flush()
    return decision


async def update_operational_decision(
    session: AsyncSession,
    tenant: TenantFilter,
    decision_id: uuid.UUID,
    *,
    cout_observe_eur: Decimal | None = None,
    service_observe_pct: Decimal | None = None,
    exogenous_event_tag: str | None = None,
    comment: str | None = None,
) -> OperationalDecision:
    """Update observed outcomes on a decision.

    Tenant isolation: fetched with TenantFilter (IDOR prevention).
    Only observed cost/service and comment are updatable.
    """
    decision = await get_operational_decision(session, tenant, decision_id)

    if cout_observe_eur is not None:
        if decision.cout_observe_eur is not None:
            if decision.cout_observe_eur != cout_observe_eur:
                raise ObservedOutcomeImmutableError("cout_observe_eur")
        else:
            decision.cout_observe_eur = cout_observe_eur

    if service_observe_pct is not None:
        if decision.service_observe_pct is not None:
            if decision.service_observe_pct != service_observe_pct:
                raise ObservedOutcomeImmutableError("service_observe_pct")
        else:
            decision.service_observe_pct = service_observe_pct

    if exogenous_event_tag is not None:
        decision.exogenous_event_tag = sanitize_text(
            exogenous_event_tag, max_length=100
        )

    if comment is not None:
        decision.comment = sanitize_text(comment, max_length=1000)

    await session.flush()
    return decision


async def get_override_statistics(
    session: AsyncSession,
    tenant: TenantFilter,
) -> dict[str, object]:
    """Return override statistics for the organization.

    Tenant isolation: all queries scoped by TenantFilter.

    Returns:
    - total: total decisions
    - override_count: number of override decisions
    - override_pct: override percentage
    - top_reasons: top 5 override reasons by frequency
    - avg_cost_delta: average (cout_observe - cout_attendu) for overrides
    """
    # Total decisions
    total_q = tenant.apply(
        select(func.count(OperationalDecision.id)), OperationalDecision
    )
    total = (await session.execute(total_q)).scalar_one() or 0

    if total == 0:
        return {
            "total": 0,
            "override_count": 0,
            "override_pct": Decimal("0"),
            "top_reasons": [],
            "avg_cost_delta": None,
        }

    # Override count
    override_q = tenant.apply(
        select(func.count(OperationalDecision.id)).where(
            OperationalDecision.is_override.is_(True)
        ),
        OperationalDecision,
    )
    override_count = (await session.execute(override_q)).scalar_one() or 0
    override_pct = Decimal(str(round(override_count / total * 100, 2)))

    # Top reasons
    reasons_q = (
        tenant.apply(
            select(
                OperationalDecision.override_reason,
                func.count(OperationalDecision.id).label("cnt"),
            ),
            OperationalDecision,
        )
        .where(
            OperationalDecision.is_override.is_(True),
            OperationalDecision.override_reason.isnot(None),
        )
        .group_by(OperationalDecision.override_reason)
        .order_by(func.count(OperationalDecision.id).desc())
        .limit(5)
    )
    reasons_result = await session.execute(reasons_q)
    top_reasons = [{"reason": row[0], "count": row[1]} for row in reasons_result.all()]

    # Average cost delta for overrides with observed costs
    delta_q = tenant.apply(
        select(
            func.avg(
                OperationalDecision.cout_observe_eur
                - OperationalDecision.cout_attendu_eur
            )
        ).where(
            OperationalDecision.is_override.is_(True),
            OperationalDecision.cout_observe_eur.isnot(None),
            OperationalDecision.cout_attendu_eur.isnot(None),
        ),
        OperationalDecision,
    )
    avg_delta_raw = (await session.execute(delta_q)).scalar_one()
    avg_cost_delta = (
        Decimal(str(round(float(avg_delta_raw), 2))) if avg_delta_raw else None
    )

    return {
        "total": total,
        "override_count": override_count,
        "override_pct": override_pct,
        "top_reasons": top_reasons,
        "avg_cost_delta": avg_cost_delta,
    }
