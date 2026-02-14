"""Admin conversations router — cross-org messaging management.

Security:
- All endpoints require super_admin role.
- No tenant filter — admin has cross-org access.
- All state-changing actions are audit-logged.
- Content is sanitized at the service layer.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session
from app.core.security import require_role
from app.models.admin import AdminAuditAction
from app.models.conversation import ConversationStatus
from app.schemas.conversation import (
    ConversationRead,
    ConversationStatusUpdate,
    MessageCreate,
    MessageRead,
    UnreadCountByOrg,
)
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
)
from app.services.admin_audit import log_admin_action
from app.services.conversation_service import (
    create_message,
    get_unread_count_by_org,
    list_conversations_admin,
    list_messages_admin,
    update_conversation_status,
)

router = APIRouter(tags=["admin-conversations"])


@router.get("/conversations")
async def admin_list_conversations(
    request: Request,
    status: ConversationStatus | None = Query(default=None),
    org_id: uuid.UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[ConversationRead]:
    """List all conversations across organizations.

    Security: super_admin only. Supports status and org_id filters.
    Audit-logged as VIEW_INBOX.
    """
    items, total = await list_conversations_admin(
        session,
        status_filter=status,
        org_id_filter=org_id,
        page=page,
        page_size=page_size,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_INBOX,
        request=request,
        metadata={"status_filter": status.value if status else None},
    )

    data = [ConversationRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/organizations/{target_org_id}/conversations")
async def admin_list_org_conversations(
    request: Request,
    target_org_id: uuid.UUID,
    status: ConversationStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[ConversationRead]:
    """List conversations for a specific organization.

    Security: super_admin only. Scoped to the target org.
    """
    items, total = await list_conversations_admin(
        session,
        status_filter=status,
        org_id_filter=target_org_id,
        page=page,
        page_size=page_size,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_INBOX,
        request=request,
        target_org_id=str(target_org_id),
        metadata={"view": "org_conversations"},
    )

    data = [ConversationRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/conversations/unread-count")
async def admin_unread_count(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[UnreadCountByOrg]:
    """Get unread message counts with per-org breakdown.

    Security: super_admin only. Returns total + breakdown by organization.
    """
    data = await get_unread_count_by_org(session)

    return ApiResponse(
        success=True,
        data=UnreadCountByOrg.model_validate(data),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/conversations/{conv_id}/messages")
async def admin_list_messages(
    request: Request,
    conv_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[MessageRead]:
    """List messages for a conversation (admin view).

    Security: super_admin only. No tenant filter — admin can view any
    conversation's messages.
    """
    items, total = await list_messages_admin(
        session,
        conv_id,
        page=page,
        page_size=page_size,
    )

    data = [MessageRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@router.post("/conversations/{conv_id}/messages")
async def admin_send_message(
    request: Request,
    conv_id: uuid.UUID,
    body: MessageCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[MessageRead]:
    """Send a message as admin in a conversation.

    Security:
    - super_admin only.
    - sender_user_id and sender_role from JWT (never from body).
    - Content sanitized at service layer.
    - Audit-logged as SEND_MESSAGE.
    """
    msg = await create_message(
        session,
        conv_id,
        sender_user_id=current_user.user_id,
        sender_role=current_user.role,
        content=body.content,
        tenant=None,  # Admin path — no tenant filter
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.SEND_MESSAGE,
        request=request,
        resource_type="Conversation",
        resource_id=conv_id,
    )

    return ApiResponse(
        success=True,
        data=MessageRead.model_validate(msg),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.patch("/conversations/{conv_id}")
async def admin_update_conversation_status(
    request: Request,
    conv_id: uuid.UUID,
    body: ConversationStatusUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ConversationRead]:
    """Update conversation status (resolve/archive).

    Security:
    - super_admin only.
    - Only resolved/archived are valid target statuses (schema enforced).
    - Audit-logged as RESOLVE_CONVERSATION.
    """
    conv = await update_conversation_status(
        session,
        conv_id,
        body.status,
        tenant=None,  # Admin path — no tenant filter
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.RESOLVE_CONVERSATION,
        request=request,
        resource_type="Conversation",
        resource_id=conv_id,
        metadata={"new_status": body.status.value},
    )

    return ApiResponse(
        success=True,
        data=ConversationRead.model_validate(conv),
        timestamp=datetime.now(UTC).isoformat(),
    )
