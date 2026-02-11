"""Admin billing router — plan management and history.

Security:
- All endpoints require super_admin role.
- Plan changes are logged in PlanChangeHistory AND admin audit log.
- changed_by always from JWT.
"""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session
from app.core.pagination import calculate_total_pages
from app.core.security import require_role
from app.models.admin import AdminAuditAction
from app.schemas.admin import (
    AdminBillingRead,
    AdminChangePlan,
    AdminPlanHistoryRead,
)
from app.schemas.base import PaginationMeta
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.admin_audit import log_admin_action
from app.services.admin_billing import (
    change_plan,
    get_billing_info,
    get_plan_history,
)

if TYPE_CHECKING:
    from app.models.organization import SubscriptionPlan

router = APIRouter(tags=["admin-billing"])


@router.get("/billing/organizations/{org_id}")
async def get_org_billing(
    request: Request,
    org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminBillingRead]:
    """Get billing info for an organization."""
    info = await get_billing_info(session, org_id)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.CHANGE_PLAN,
        request=request,
        target_org_id=str(org_id),
        metadata={"view": True},
    )

    return ApiResponse(
        success=True,
        data=AdminBillingRead(
            organization_id=cast("uuid.UUID", info["organization_id"]),
            plan=cast("SubscriptionPlan", info["plan"]),
            limits=cast("dict[str, Any]", info["limits"]),
            usage=cast("dict[str, Any]", info["usage"]),
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/billing/organizations/{org_id}/change-plan", status_code=201)
async def change_org_plan(
    request: Request,
    org_id: uuid.UUID,
    body: AdminChangePlan,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminPlanHistoryRead]:
    """Change an organization's subscription plan."""
    history = await change_plan(
        session,
        org_id=org_id,
        new_plan=body.new_plan,
        reason=body.reason,
        changed_by=current_user.user_id,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.CHANGE_PLAN,
        request=request,
        target_org_id=str(org_id),
        resource_type="PlanChangeHistory",
        resource_id=history.id,
        metadata={
            "old_plan": history.old_plan.value
            if hasattr(history.old_plan, "value")
            else str(history.old_plan),
            "new_plan": history.new_plan.value
            if hasattr(history.new_plan, "value")
            else str(history.new_plan),
        },
        severity="WARNING",
    )

    return ApiResponse(
        success=True,
        data=AdminPlanHistoryRead.model_validate(history),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/billing/organizations/{org_id}/history")
async def get_org_plan_history(
    request: Request,
    org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[AdminPlanHistoryRead]:
    """Get plan change history for an organization."""
    items, total = await get_plan_history(
        session, org_id, page=page, page_size=page_size
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.CHANGE_PLAN,
        request=request,
        target_org_id=str(org_id),
        metadata={"view": True},
    )

    total_pages = calculate_total_pages(total, page_size)
    data = [AdminPlanHistoryRead.model_validate(h) for h in items]

    return PaginatedResponse(
        success=True,
        data=data,
        pagination=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next_page=page < total_pages,
            has_previous_page=page > 1,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )
