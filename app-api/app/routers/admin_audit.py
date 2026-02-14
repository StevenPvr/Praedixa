"""Admin audit log router — append-only audit trail for super_admin actions."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session
from app.core.security import require_role
from app.schemas.admin import AdminAuditLogRead
from app.schemas.responses import PaginatedResponse, make_paginated_response
from app.services.admin_audit import get_audit_log

router = APIRouter(tags=["admin-audit"])


@router.get("/audit-log")
async def list_audit_log(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    admin_user_id: uuid.UUID | None = Query(default=None),
    target_org_id: uuid.UUID | None = Query(default=None),
    action: str | None = Query(default=None, max_length=50),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
    _current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[AdminAuditLogRead]:
    """List admin audit log entries with optional filters."""
    items, total = await get_audit_log(
        session,
        page=page,
        page_size=page_size,
        admin_user_id=str(admin_user_id) if admin_user_id else None,
        target_org_id=str(target_org_id) if target_org_id else None,
        action=action,
        date_from=date_from,
        date_to=date_to,
    )
    data = [AdminAuditLogRead.model_validate(entry) for entry in items]
    return make_paginated_response(data, total, page, page_size)
