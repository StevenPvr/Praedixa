"""Admin users router — user management per organization.

Security:
- All endpoints require super_admin role.
- super_admin role assignment blocked at Pydantic schema AND service layer.
- admin_user_id always from JWT, never from request body.
- Every endpoint logs an admin audit action.
"""

import math
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session
from app.core.security import require_role
from app.models.admin import AdminAuditAction
from app.schemas.admin import AdminChangeRole, AdminInviteUser, AdminUserRead
from app.schemas.base import PaginationMeta
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.admin_audit import log_admin_action
from app.services.admin_users import (
    change_user_role,
    deactivate_user,
    invite_user,
    list_org_users,
    reactivate_user,
)

router = APIRouter(tags=["admin-users"])


@router.get("/organizations/{org_id}/users")
async def list_users(
    request: Request,
    org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[AdminUserRead]:
    """List users for a specific organization."""
    items, total = await list_org_users(
        session, org_id, page=page, page_size=page_size
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_USERS,
        request=request,
        target_org_id=str(org_id),
    )

    total_pages = max(1, math.ceil(total / page_size))
    data = [AdminUserRead.model_validate(user) for user in items]

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


@router.post("/organizations/{org_id}/users/invite", status_code=201)
async def invite_org_user(
    request: Request,
    org_id: uuid.UUID,
    body: AdminInviteUser,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminUserRead]:
    """Invite a new user to an organization."""
    user = await invite_user(
        session,
        org_id=org_id,
        email=body.email,
        role=body.role,
        invited_by=current_user.user_id,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.INVITE_USER,
        request=request,
        target_org_id=str(org_id),
        resource_type="User",
        resource_id=user.id,
        metadata={"email": body.email, "role": body.role.value},
    )

    return ApiResponse(
        success=True,
        data=AdminUserRead.model_validate(user),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.patch("/organizations/{org_id}/users/{user_id}/role")
async def change_role(
    request: Request,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AdminChangeRole,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminUserRead]:
    """Change a user's role."""
    user = await change_user_role(
        session,
        org_id=org_id,
        user_id=user_id,
        new_role=body.role,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.CHANGE_ROLE,
        request=request,
        target_org_id=str(org_id),
        resource_type="User",
        resource_id=user_id,
        metadata={"new_role": body.role.value},
    )

    return ApiResponse(
        success=True,
        data=AdminUserRead.model_validate(user),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/organizations/{org_id}/users/{user_id}/deactivate")
async def deactivate_org_user(
    request: Request,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminUserRead]:
    """Deactivate a user."""
    user = await deactivate_user(session, org_id=org_id, user_id=user_id)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.DEACTIVATE_USER,
        request=request,
        target_org_id=str(org_id),
        resource_type="User",
        resource_id=user_id,
        severity="WARNING",
    )

    return ApiResponse(
        success=True,
        data=AdminUserRead.model_validate(user),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/organizations/{org_id}/users/{user_id}/reactivate")
async def reactivate_org_user(
    request: Request,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminUserRead]:
    """Reactivate a user."""
    user = await reactivate_user(session, org_id=org_id, user_id=user_id)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.REACTIVATE_USER,
        request=request,
        target_org_id=str(org_id),
        resource_type="User",
        resource_id=user_id,
    )

    return ApiResponse(
        success=True,
        data=AdminUserRead.model_validate(user),
        timestamp=datetime.now(UTC).isoformat(),
    )
