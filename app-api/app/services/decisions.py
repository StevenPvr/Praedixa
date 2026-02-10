"""Decisions service — CRUD for capacity decisions.

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- Write operations verify FK references belong to the tenant (IDOR prevention).
- reviewed_by / implemented_by always come from JWT, never from request body.
- Status transitions are validated server-side.
- User text inputs are sanitized via sanitize_text().

Threat model:
- IDOR: TenantFilter on all queries + FK ownership verification on writes.
- Privilege escalation: require_role enforced at router level, user_id from JWT.
- Injection: sanitize_text on title/description/rationale/notes, parameterized queries.
- State tampering: Status transition validation prevents illegal state changes.
"""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PraedixaError
from app.core.security import TenantFilter
from app.core.validation import sanitize_text
from app.models.decision import Decision, DecisionPriority, DecisionStatus, DecisionType
from app.models.department import Department


class InvalidTransitionError(PraedixaError):
    """Raised when a decision status transition is not allowed."""

    def __init__(self, current_status: str, target_action: str) -> None:
        super().__init__(
            message=f"Cannot {target_action} a decision in status '{current_status}'",
            code="INVALID_TRANSITION",
            status_code=409,
        )


# Allowed status transitions for review actions
_REVIEW_TRANSITIONS: dict[str, dict[str, DecisionStatus]] = {
    "approve": {
        DecisionStatus.SUGGESTED.value: DecisionStatus.APPROVED,
        DecisionStatus.PENDING_REVIEW.value: DecisionStatus.APPROVED,
    },
    "reject": {
        DecisionStatus.SUGGESTED.value: DecisionStatus.REJECTED,
        DecisionStatus.PENDING_REVIEW.value: DecisionStatus.REJECTED,
    },
    "defer": {
        DecisionStatus.SUGGESTED.value: DecisionStatus.PENDING_REVIEW,
    },
}


async def list_decisions(
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    limit: int = 20,
    offset: int = 0,
    status_filter: DecisionStatus | str | None = None,
    type_filter: DecisionType | str | None = None,
) -> tuple[list[Decision], int]:
    """List decisions for the organization with pagination and filters.

    Returns (items, total_count).
    Ordered by creation date (newest first).

    status_filter and type_filter accept enum instances (from router)
    or string values (for backwards compatibility). Invalid strings
    are silently ignored (filter not applied).
    """
    base_query = tenant.apply(select(Decision), Decision)

    # Resolve filters to enum instances (validated at router level via FastAPI)
    resolved_status: DecisionStatus | None = None
    if isinstance(status_filter, DecisionStatus):
        resolved_status = status_filter
    elif isinstance(status_filter, str):
        valid = {s.value for s in DecisionStatus}
        if status_filter in valid:
            resolved_status = DecisionStatus(status_filter)

    resolved_type: DecisionType | None = None
    if isinstance(type_filter, DecisionType):
        resolved_type = type_filter
    elif isinstance(type_filter, str):
        valid_t = {t.value for t in DecisionType}
        if type_filter in valid_t:
            resolved_type = DecisionType(type_filter)

    if resolved_status is not None:
        base_query = base_query.where(Decision.status == resolved_status)

    if resolved_type is not None:
        base_query = base_query.where(Decision.type == resolved_type)

    # Count total matching rows
    count_query = tenant.apply(
        select(func.count(Decision.id)),
        Decision,
    )
    if resolved_status is not None:
        count_query = count_query.where(Decision.status == resolved_status)
    if resolved_type is not None:
        count_query = count_query.where(Decision.type == resolved_type)

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    # Fetch page
    query = base_query.order_by(Decision.created_at.desc()).offset(offset).limit(limit)
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_decision(
    decision_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
) -> Decision:
    """Fetch a single decision by ID with tenant isolation.

    Raises NotFoundError if the decision does not exist or belongs
    to another organization (IDOR prevention).
    """
    query = tenant.apply(
        select(Decision).where(Decision.id == decision_id),
        Decision,
    )
    result = await session.execute(query)
    decision: Decision | None = result.scalar_one_or_none()

    if decision is None:
        raise NotFoundError("Decision", str(decision_id))

    return decision


async def create_decision(
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    department_id: uuid.UUID,
    type: DecisionType,
    priority: DecisionPriority,
    title: str,
    description: str,
    rationale: str,
    target_period: dict[str, str],
    estimated_cost: float | None = None,
    cost_of_inaction: float | None = None,
    confidence_score: float,
    risk_indicators: dict[str, object] | None = None,
    user_id: str,
    forecast_run_id: uuid.UUID | None = None,
    status: DecisionStatus = DecisionStatus.SUGGESTED,
) -> Decision:
    """Create a new decision.

    Security:
    - Verifies department_id belongs to the tenant (IDOR prevention on FK).
    - Sanitizes all user-provided text fields.
    - Sets organization_id from tenant context, not from client.
    """
    # Verify department belongs to this tenant
    dept_query = tenant.apply(
        select(Department.id).where(Department.id == department_id),
        Department,
    )
    dept_result = await session.execute(dept_query)
    if dept_result.scalar_one_or_none() is None:
        raise NotFoundError("Department", str(department_id))

    # Idempotence: check for a recent duplicate decision with same
    # department + type created within the last 60 seconds.
    # Returns existing decision instead of creating a duplicate.
    recent_cutoff = datetime.now(UTC) - timedelta(seconds=60)
    dup_query = tenant.apply(
        select(Decision).where(
            Decision.department_id == department_id,
            Decision.type == type,
            Decision.created_at >= recent_cutoff,
        ),
        Decision,
    )
    dup_result = await session.execute(dup_query)
    existing: Decision | None = dup_result.scalar_one_or_none()
    if existing is not None:
        return existing

    decision = Decision(
        organization_id=uuid.UUID(tenant.organization_id),
        department_id=department_id,
        forecast_run_id=forecast_run_id,
        type=type,
        priority=priority,
        status=status,
        title=sanitize_text(title, max_length=500),
        description=sanitize_text(description, max_length=5000),
        rationale=sanitize_text(rationale, max_length=5000),
        target_period=target_period,
        estimated_cost=estimated_cost,
        cost_of_inaction=cost_of_inaction,
        confidence_score=confidence_score,
        risk_indicators=risk_indicators or {},
    )

    session.add(decision)
    await session.flush()
    return decision


async def review_decision(
    decision_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    reviewer_id: str,
    action: str,
    notes: str | None = None,
    deadline: date | None = None,
) -> Decision:
    """Review a decision (approve, reject, or defer).

    Security:
    - Verifies ownership via tenant filter (IDOR prevention).
    - Validates status transition (prevents invalid state changes).
    - reviewer_id comes from JWT, not client body.
    - Defense in depth: UPDATE includes organization_id in WHERE clause.
    """
    # Fetch with tenant filter
    decision = await get_decision(decision_id, tenant, session)

    # Validate status transition
    current_status = (
        decision.status if isinstance(decision.status, str) else decision.status.value
    )
    allowed = _REVIEW_TRANSITIONS.get(action)
    if allowed is None or current_status not in allowed:
        raise InvalidTransitionError(current_status, action)

    new_status = allowed[current_status]
    now = datetime.now(UTC)

    # Prepare update values
    values: dict[str, object] = {
        "status": new_status,
        "reviewed_by": uuid.UUID(reviewer_id),
        "reviewed_at": now,
    }

    if notes is not None:
        values["manager_notes"] = sanitize_text(notes, max_length=2000)

    if deadline is not None and action == "approve":
        values["implementation_deadline"] = deadline

    # Defense in depth: UPDATE with org_id in WHERE
    stmt = (
        update(Decision)
        .where(
            Decision.id == decision_id,
            Decision.organization_id == tenant.organization_id,
        )
        .values(**values)
    )
    await session.execute(stmt)
    await session.flush()

    # Refresh object with new values
    decision.status = new_status
    decision.reviewed_by = uuid.UUID(reviewer_id)
    decision.reviewed_at = now
    if notes is not None:
        decision.manager_notes = sanitize_text(notes, max_length=2000)
    if deadline is not None and action == "approve":
        decision.implementation_deadline = deadline

    return decision


async def record_outcome(
    decision_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    recorder_id: str,
    effective: bool,
    actual_cost: float | None = None,
    actual_impact: str,
    lessons_learned: str | None = None,
) -> Decision:
    """Record the outcome of an implemented decision.

    Security:
    - Only approved decisions can have outcomes recorded.
    - recorder_id (implemented_by) comes from JWT.
    - Text fields are sanitized.
    - Defense in depth: UPDATE with org_id in WHERE.
    """
    decision = await get_decision(decision_id, tenant, session)

    # Only approved decisions can have outcomes recorded
    current_status = (
        decision.status if isinstance(decision.status, str) else decision.status.value
    )
    if current_status != DecisionStatus.APPROVED.value:
        raise InvalidTransitionError(current_status, "record outcome")

    now = datetime.now(UTC)
    outcome = {
        "effective": effective,
        "actual_impact": sanitize_text(actual_impact, max_length=5000),
        "recorded_at": now.isoformat(),
    }
    if actual_cost is not None:
        outcome["actual_cost"] = actual_cost
    if lessons_learned is not None:
        outcome["lessons_learned"] = sanitize_text(lessons_learned, max_length=5000)

    # Defense in depth: UPDATE with org_id in WHERE
    stmt = (
        update(Decision)
        .where(
            Decision.id == decision_id,
            Decision.organization_id == tenant.organization_id,
        )
        .values(
            status=DecisionStatus.IMPLEMENTED,
            implemented_by=uuid.UUID(recorder_id),
            implemented_at=now,
            outcome=outcome,
        )
    )
    await session.execute(stmt)
    await session.flush()

    # Refresh object
    decision.status = DecisionStatus.IMPLEMENTED
    decision.implemented_by = uuid.UUID(recorder_id)
    decision.implemented_at = now
    decision.outcome = outcome

    return decision
