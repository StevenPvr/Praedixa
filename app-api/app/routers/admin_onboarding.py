"""Admin onboarding router — multi-step organization setup wizard.

Security:
- All endpoints require super_admin role.
- Step path parameter is validated (1-5 range) at the service layer.
- initiated_by always from JWT.
- Every endpoint logs an admin audit action.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session
from app.core.security import require_role
from app.models.admin import AdminAuditAction
from app.schemas.admin import (
    AdminOnboardingCreate,
    AdminOnboardingRead,
    AdminOnboardingStepUpdate,
)
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
)
from app.services.admin_audit import log_admin_action
from app.services.admin_onboarding import (
    complete_step,
    create_onboarding,
    get_onboarding,
    list_onboardings,
)

router = APIRouter(tags=["admin-onboarding"])


@router.post("/onboarding", status_code=201)
async def create_onboarding_endpoint(
    request: Request,
    body: AdminOnboardingCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminOnboardingRead]:
    """Initiate a new onboarding (creates org + state)."""
    onboarding = await create_onboarding(
        session,
        org_name=body.org_name,
        org_slug=body.org_slug,
        contact_email=body.contact_email,
        sector=body.sector,
        plan=body.plan,
        initiated_by=current_user.user_id,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.ONBOARDING_STEP,
        request=request,
        target_org_id=str(onboarding.organization_id),
        resource_type="OnboardingState",
        resource_id=onboarding.id,
        metadata={"step": 1, "action": "created"},
    )

    return ApiResponse(
        success=True,
        data=AdminOnboardingRead.model_validate(onboarding),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/onboarding")
async def list_onboardings_endpoint(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None, max_length=20),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[AdminOnboardingRead]:
    """List all onboarding processes."""
    items, total = await list_onboardings(
        session, page=page, page_size=page_size, status_filter=status
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.ONBOARDING_STEP,
        request=request,
        metadata={"view": True},
    )

    data = [AdminOnboardingRead.model_validate(o) for o in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/onboarding/{onboarding_id}")
async def get_onboarding_endpoint(
    request: Request,
    onboarding_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminOnboardingRead]:
    """Get onboarding state by ID."""
    onboarding = await get_onboarding(session, onboarding_id)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.ONBOARDING_STEP,
        request=request,
        target_org_id=str(onboarding.organization_id),
        resource_type="OnboardingState",
        resource_id=onboarding_id,
    )

    return ApiResponse(
        success=True,
        data=AdminOnboardingRead.model_validate(onboarding),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.patch("/onboarding/{onboarding_id}/step/{step}")
async def complete_step_endpoint(
    request: Request,
    onboarding_id: uuid.UUID,
    step: int,
    body: AdminOnboardingStepUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminOnboardingRead]:
    """Complete an onboarding step."""
    onboarding = await complete_step(session, onboarding_id, step, body.data)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.ONBOARDING_STEP,
        request=request,
        target_org_id=str(onboarding.organization_id),
        resource_type="OnboardingState",
        resource_id=onboarding_id,
        metadata={"step": step},
    )

    return ApiResponse(
        success=True,
        data=AdminOnboardingRead.model_validate(onboarding),
        timestamp=datetime.now(UTC).isoformat(),
    )
