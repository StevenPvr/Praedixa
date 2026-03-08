"""Conversation service — messaging between client organizations and admins.

Security notes:
- All client-facing queries use TenantFilter for organization isolation.
- Admin queries bypass tenant filter but log all access via audit trail.
- Content sanitization: HTML tags are stripped via regex, then truncated
  to 5000 chars. This is defense-in-depth — Pydantic schema validation
  already limits length, but the service enforces it independently.
- sender_user_id and sender_role come from JWT (never from client body).
- Conversation ownership is verified before allowing message creation
  to prevent IDOR attacks (posting messages to another org's conversation).
"""

import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.pagination import normalize_page_window
from app.core.security import TenantFilter
from app.models.conversation import (
    Conversation,
    ConversationInitiator,
    ConversationStatus,
    Message,
)
from app.models.organization import Organization

# HTML tag stripping regex — defense-in-depth alongside Pydantic validation.
# Not used for XSS prevention (that's output encoding's job) but to remove
# markup that has no business being in plain-text messages.
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_MAX_CONTENT_LENGTH = 5000


def _sanitize_content(content: str) -> str:
    """Strip HTML tags and enforce maximum length.

    This is a boundary sanitization step. The primary defense against
    XSS is output encoding in the frontend, not input stripping.
    """
    stripped = _HTML_TAG_RE.sub("", content)
    return stripped[:_MAX_CONTENT_LENGTH]


async def list_conversations(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    status_filter: ConversationStatus | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Conversation], int]:
    """List conversations for a tenant with optional status filter.

    Returns (items, total_count). Ordered by last_message_at DESC
    (most recent activity first), with NULL last_message_at sorted last.
    """
    base = tenant.apply(select(Conversation), Conversation)
    count_q = tenant.apply(select(func.count(Conversation.id)), Conversation)

    if status_filter is not None:
        base = base.where(Conversation.status == status_filter)
        count_q = count_q.where(Conversation.status == status_filter)

    total = (await session.execute(count_q)).scalar_one() or 0

    _, page_size, offset = normalize_page_window(page, page_size)
    query = (
        base.order_by(Conversation.last_message_at.desc().nullslast())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def list_conversations_admin(
    session: AsyncSession,
    *,
    status_filter: ConversationStatus | None = None,
    org_id_filter: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Conversation], int]:
    """List all conversations (cross-org) for admin inbox.

    Supports optional status and org_id filters.
    Ordered by last_message_at DESC (most recent first).
    """
    base = select(Conversation)
    count_q = select(func.count(Conversation.id))

    if status_filter is not None:
        base = base.where(Conversation.status == status_filter)
        count_q = count_q.where(Conversation.status == status_filter)

    if org_id_filter is not None:
        base = base.where(Conversation.organization_id == org_id_filter)
        count_q = count_q.where(Conversation.organization_id == org_id_filter)

    total = (await session.execute(count_q)).scalar_one() or 0

    _, page_size, offset = normalize_page_window(page, page_size)
    query = (
        base.order_by(Conversation.last_message_at.desc().nullslast())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_conversation(
    session: AsyncSession,
    conv_id: uuid.UUID,
    tenant: TenantFilter,
) -> Conversation:
    """Get a single conversation by ID with tenant isolation.

    Raises NotFoundError if not found or belongs to another tenant.
    This prevents IDOR — an attacker guessing IDs gets 404, not 403.
    """
    query = tenant.apply(
        select(Conversation).where(Conversation.id == conv_id),
        Conversation,
    )
    result = await session.execute(query)
    conv: Conversation | None = result.scalar_one_or_none()

    if conv is None:
        raise NotFoundError("Conversation", str(conv_id))

    return conv


async def get_conversation_admin(
    session: AsyncSession,
    conv_id: uuid.UUID,
) -> Conversation:
    """Get a single conversation by ID (admin, no tenant filter).

    Raises NotFoundError if the conversation does not exist.
    """
    query = select(Conversation).where(Conversation.id == conv_id)
    result = await session.execute(query)
    conv: Conversation | None = result.scalar_one_or_none()

    if conv is None:
        raise NotFoundError("Conversation", str(conv_id))

    return conv


async def create_conversation(
    session: AsyncSession,
    *,
    org_id: str,
    subject: str,
    initiated_by: ConversationInitiator,
    sender_user_id: str,
    sender_role: str,
    first_message_content: str | None = None,
) -> Conversation:
    """Create a conversation, optionally with a first message.

    When first_message_content is provided, the conversation and its
    initial message are created in a single flush for consistency.
    When omitted, the conversation is created without a message — the
    user can send the first message via the messages endpoint.

    Security: org_id, sender_user_id, sender_role come from JWT context.
    """
    now = datetime.now(UTC)

    conv = Conversation(
        organization_id=uuid.UUID(org_id),
        subject=subject[:255],  # Defense-in-depth: schema already validates
        status=ConversationStatus.OPEN,
        initiated_by=initiated_by,
        last_message_at=now if first_message_content else None,
    )
    session.add(conv)
    await session.flush()  # Assigns conv.id via INSERT RETURNING

    if first_message_content:
        sanitized_content = _sanitize_content(first_message_content)
        msg = Message(
            conversation_id=conv.id,
            sender_user_id=uuid.UUID(sender_user_id),
            sender_role=sender_role,
            content=sanitized_content,
            is_read=False,
        )
        session.add(msg)
        await session.flush()

    return conv


async def list_messages(
    session: AsyncSession,
    conv_id: uuid.UUID,
    tenant: TenantFilter,
    *,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Message], int]:
    """List messages for a conversation with tenant isolation.

    Verifies the conversation belongs to the tenant before returning
    messages. Ordered by created_at ASC (chronological).
    """
    # Verify conversation ownership first (IDOR prevention)
    await get_conversation(session, conv_id, tenant)

    count_q = select(func.count(Message.id)).where(Message.conversation_id == conv_id)
    total = (await session.execute(count_q)).scalar_one() or 0

    _, page_size, offset = normalize_page_window(page, page_size)
    query = (
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def list_messages_admin(
    session: AsyncSession,
    conv_id: uuid.UUID,
    *,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Message], int]:
    """List messages for a conversation (admin, no tenant filter).

    Verifies the conversation exists before returning messages.
    """
    await get_conversation_admin(session, conv_id)

    count_q = select(func.count(Message.id)).where(Message.conversation_id == conv_id)
    total = (await session.execute(count_q)).scalar_one() or 0

    _, page_size, offset = normalize_page_window(page, page_size)
    query = (
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def create_message(
    session: AsyncSession,
    conv_id: uuid.UUID,
    *,
    sender_user_id: str,
    sender_role: str,
    content: str,
    tenant: TenantFilter | None = None,
) -> Message:
    """Add a message to a conversation.

    When tenant is provided, verifies conversation ownership (client path).
    When tenant is None, verifies conversation exists (admin path).

    Also updates conversation.last_message_at for inbox sorting.
    """
    if tenant is not None:
        await get_conversation(session, conv_id, tenant)
    else:
        await get_conversation_admin(session, conv_id)

    sanitized_content = _sanitize_content(content)
    now = datetime.now(UTC)

    msg = Message(
        conversation_id=conv_id,
        sender_user_id=uuid.UUID(sender_user_id),
        sender_role=sender_role,
        content=sanitized_content,
        is_read=False,
    )
    session.add(msg)

    # Update conversation.last_message_at atomically
    stmt = (
        update(Conversation)
        .where(Conversation.id == conv_id)
        .values(last_message_at=now)
    )
    await session.execute(stmt)
    await session.flush()

    return msg


async def update_conversation_status(
    session: AsyncSession,
    conv_id: uuid.UUID,
    new_status: ConversationStatus,
    *,
    tenant: TenantFilter | None = None,
) -> Conversation:
    """Update a conversation's status.

    When tenant is provided, verifies ownership (client path).
    When tenant is None, admin path (no tenant filter).
    """
    if tenant is not None:
        conv = await get_conversation(session, conv_id, tenant)
    else:
        conv = await get_conversation_admin(session, conv_id)

    stmt = (
        update(Conversation).where(Conversation.id == conv_id).values(status=new_status)
    )
    await session.execute(stmt)
    await session.flush()

    # Refresh local object
    conv.status = new_status
    return conv


async def get_unread_count(
    session: AsyncSession,
    *,
    tenant: TenantFilter | None = None,
) -> int:
    """Count unread messages for inbox badge.

    When tenant is provided, counts only messages in tenant's conversations.
    When tenant is None, counts all unread messages (admin inbox).
    """
    if tenant is not None:
        # Count unread messages in conversations belonging to this tenant
        query = (
            select(func.count(Message.id))
            .select_from(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Message.is_read.is_(False),
                Conversation.organization_id == tenant.organization_id,
            )
        )
    else:
        # Admin: count all unread messages
        query = select(func.count(Message.id)).where(
            Message.is_read.is_(False),
        )

    result = await session.execute(query)
    return result.scalar_one() or 0


async def get_unread_count_by_org(
    session: AsyncSession,
) -> dict[str, object]:
    """Get unread message counts grouped by organization (admin only).

    Returns { total: int, byOrg: [{ orgId, orgName, count }] }.
    Used for the admin inbox sidebar card.
    """
    # Total unread
    total_q = select(func.count(Message.id)).where(Message.is_read.is_(False))
    total_result = await session.execute(total_q)
    total = total_result.scalar_one() or 0

    # Per-org breakdown
    by_org_q = (
        select(
            Conversation.organization_id,
            Organization.name.label("org_name"),
            func.count(Message.id).label("cnt"),
        )
        .select_from(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .join(Organization, Conversation.organization_id == Organization.id)
        .where(Message.is_read.is_(False))
        .group_by(Conversation.organization_id, Organization.name)
        .order_by(func.count(Message.id).desc())
    )
    by_org_result = await session.execute(by_org_q)
    rows = by_org_result.all()

    by_org = [
        {
            "org_id": str(row.organization_id),
            "org_name": row.org_name,
            "count": row.cnt,
        }
        for row in rows
    ]

    return {"total": total, "by_org": by_org}
