"""Decisions router — CRUD for capacity decisions.

Security:
- All endpoints require authentication (get_current_user).
- TenantFilter ensures organization isolation on all queries.
- Write endpoints (POST, PATCH) require org_admin or manager role.
- reviewed_by and implemented_by are ALWAYS taken from JWT,
  never from the request body (prevents privilege escalation).
- Path params are UUID-validated by FastAPI/Pydantic.
- Pagination params are bounded (page_size max 100).
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter, require_role
from app.models.decision import DecisionStatus, DecisionType
from app.schemas.decision import (
    CreateDecisionRequest,
    DecisionRead,
    DecisionSummary,
    RecordDecisionOutcomeRequest,
    ReviewDecisionRequest,
)
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
)
from app.services.decisions import (
    create_decision,
    get_decision,
    list_decisions,
    record_outcome,
    review_decision,
)

router = APIRouter(prefix="/api/v1/decisions", tags=["decisions"])


@router.get("")
async def list_all_decisions(
    status: DecisionStatus | None = Query(default=None),
    type: DecisionType | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[DecisionSummary]:
    """List decisions with optional filtering and pagination."""
    offset = (page - 1) * page_size

    items, total = await list_decisions(
        tenant=tenant,
        session=session,
        limit=page_size,
        offset=offset,
        status_filter=status,
        type_filter=type,
    )

    data = [DecisionSummary.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/{decision_id}")
async def get_single_decision(
    decision_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[DecisionRead]:
    """Get a single decision by ID."""
    decision = await get_decision(
        decision_id=decision_id,
        tenant=tenant,
        session=session,
    )

    return ApiResponse(
        success=True,
        data=DecisionRead.model_validate(decision),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("", status_code=201)
async def create_new_decision(
    body: CreateDecisionRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[DecisionRead]:
    """Create a new decision. Requires org_admin or manager role."""
    decision = await create_decision(
        tenant=tenant,
        session=session,
        department_id=body.department_id,
        type=body.type,
        priority=body.priority,
        title=body.title,
        description=body.description,
        rationale=body.rationale,
        target_period=body.target_period,
        estimated_cost=body.estimated_cost,
        cost_of_inaction=body.cost_of_inaction,
        confidence_score=body.confidence_score,
        risk_indicators=body.risk_indicators,
        user_id=current_user.user_id,
    )

    return ApiResponse(
        success=True,
        data=DecisionRead.model_validate(decision),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.patch("/{decision_id}/review")
async def review_existing_decision(
    decision_id: uuid.UUID,
    body: ReviewDecisionRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[DecisionRead]:
    """Review a decision (approve/reject/defer). Requires org_admin or manager role.

    The reviewer_id is always taken from the JWT — the client cannot
    impersonate another user.
    """
    decision = await review_decision(
        decision_id=decision_id,
        tenant=tenant,
        session=session,
        reviewer_id=current_user.user_id,
        action=body.action,
        notes=body.notes,
        deadline=body.implementation_deadline,
    )

    return ApiResponse(
        success=True,
        data=DecisionRead.model_validate(decision),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/{decision_id}/outcome", status_code=201)
async def record_decision_outcome(
    decision_id: uuid.UUID,
    body: RecordDecisionOutcomeRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[DecisionRead]:
    """Record the outcome of an implemented decision.

    Requires org_admin or manager role.
    The implemented_by field is always taken from the JWT.
    """
    decision = await record_outcome(
        decision_id=decision_id,
        tenant=tenant,
        session=session,
        recorder_id=current_user.user_id,
        effective=body.effective,
        actual_cost=body.actual_cost,
        actual_impact=body.actual_impact,
        lessons_learned=body.lessons_learned,
    )

    return ApiResponse(
        success=True,
        data=DecisionRead.model_validate(decision),
        timestamp=datetime.now(UTC).isoformat(),
    )
