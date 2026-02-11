"""Conversations router — client-side messaging endpoints.

Security:
- All endpoints require authentication via get_current_user.
- TenantFilter ensures organization isolation on all queries.
- Role restriction: super_admin, org_admin, hr_manager, manager can access messaging.
- Content is sanitized at the service layer (HTML stripping, length limit).
- organization_id, sender_user_id, sender_role are injected from JWT.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session, get_tenant_filter
from app.core.pagination import calculate_total_pages
from app.core.security import TenantFilter, require_role
from app.models.conversation import ConversationInitiator, ConversationStatus
from app.schemas.base import PaginationMeta
from app.schemas.conversation import (
    ConversationCreate,
    ConversationRead,
    MessageCreate,
    MessageRead,
)
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.conversation_service import (
    create_conversation,
    create_message,
    get_unread_count,
    list_conversations,
    list_messages,
)

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


@router.get("")
async def list_user_conversations(
    status: ConversationStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(
        require_role("super_admin", "org_admin", "hr_manager", "manager")
    ),
) -> PaginatedResponse[ConversationRead]:
    """List conversations for the authenticated user's organization.

    Security: Scoped by TenantFilter (organization_id from JWT).
    """
    items, total = await list_conversations(
        session,
        tenant,
        status_filter=status,
        page=page,
        page_size=page_size,
    )

    total_pages = calculate_total_pages(total, page_size)

    return PaginatedResponse(
        success=True,
        data=[ConversationRead.model_validate(item) for item in items],
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


@router.post("")
async def create_new_conversation(
    body: ConversationCreate,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(
        require_role("super_admin", "org_admin", "hr_manager", "manager")
    ),
) -> ApiResponse[ConversationRead]:
    """Create a new conversation with an initial message.

    Security:
    - organization_id injected from JWT (never from client body).
    - initiated_by is always CLIENT for this endpoint.
    - sender_user_id and sender_role from JWT.
    """
    conv = await create_conversation(
        session,
        org_id=current_user.organization_id,
        subject=body.subject,
        initiated_by=ConversationInitiator.CLIENT,
        sender_user_id=current_user.user_id,
        sender_role=current_user.role,
        first_message_content=body.content,
    )

    return ApiResponse(
        success=True,
        data=ConversationRead.model_validate(conv),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/unread-count")
async def conversation_unread_count(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(
        require_role("super_admin", "org_admin", "hr_manager", "manager")
    ),
) -> ApiResponse[dict[str, int]]:
    """Get unread message count for the inbox badge.

    Security: Scoped by TenantFilter (organization_id from JWT).
    """
    count = await get_unread_count(session, tenant=tenant)

    return ApiResponse(
        success=True,
        data={"unreadCount": count},
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{conv_id}/messages")
async def list_conversation_messages(
    conv_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(
        require_role("super_admin", "org_admin", "hr_manager", "manager")
    ),
) -> PaginatedResponse[MessageRead]:
    """List messages for a conversation.

    Security: Verifies conversation belongs to the tenant before
    returning messages (IDOR prevention).
    """
    import uuid

    conv_uuid = uuid.UUID(conv_id)
    items, total = await list_messages(
        session,
        conv_uuid,
        tenant,
        page=page,
        page_size=page_size,
    )

    total_pages = calculate_total_pages(total, page_size)

    return PaginatedResponse(
        success=True,
        data=[MessageRead.model_validate(item) for item in items],
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


@router.post("/{conv_id}/messages")
async def send_message(
    conv_id: str,
    body: MessageCreate,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(
        require_role("super_admin", "org_admin", "hr_manager", "manager")
    ),
) -> ApiResponse[MessageRead]:
    """Send a message in a conversation.

    Security:
    - Verifies conversation belongs to the tenant (IDOR prevention).
    - sender_user_id and sender_role from JWT (never from body).
    - Content sanitized at service layer.
    """
    import uuid

    conv_uuid = uuid.UUID(conv_id)
    msg = await create_message(
        session,
        conv_uuid,
        sender_user_id=current_user.user_id,
        sender_role=current_user.role,
        content=body.content,
        tenant=tenant,
    )

    return ApiResponse(
        success=True,
        data=MessageRead.model_validate(msg),
        timestamp=datetime.now(UTC).isoformat(),
    )
