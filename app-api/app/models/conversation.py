"""Conversation and Message models — client-admin messaging system.

Security notes:
- Conversation uses TenantMixin for organization_id scoping. All queries
  MUST go through TenantFilter to prevent cross-tenant data access.
- Message.sender_user_id is a plain UUID (no FK) because senders can be
  either client users or super_admin users from different auth contexts.
  The sender_role field records the role at send time for audit purposes.
- Message.content is sanitized at the service layer (HTML tag stripping,
  length limit) before persistence. The Text column has no DB-level limit
  to avoid silent truncation — validation happens in Pydantic schemas.
- Conversation.last_message_at is updated atomically with each new message
  to support efficient inbox sorting without N+1 queries.
- is_read defaults to False — only flipped by explicit read actions.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, sa_enum


class ConversationStatus(str, enum.Enum):
    """Conversation lifecycle states."""

    OPEN = "open"
    RESOLVED = "resolved"
    ARCHIVED = "archived"


class ConversationInitiator(str, enum.Enum):
    """Who initiated the conversation."""

    CLIENT = "client"
    ADMIN = "admin"


class Conversation(TenantMixin, Base):
    """A conversation thread between a client organization and the admin team.

    Tenant-scoped via TenantMixin (organization_id + timestamps).
    last_message_at is denormalized for efficient inbox sorting.
    """

    __tablename__ = "conversations"
    __table_args__ = (
        Index(
            "ix_conversations_org_status",
            "organization_id",
            "status",
        ),
        Index(
            "ix_conversations_last_message_at",
            "last_message_at",
            postgresql_ops={"last_message_at": "DESC NULLS LAST"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ConversationStatus] = mapped_column(
        sa_enum(ConversationStatus),
        nullable=False,
        default=ConversationStatus.OPEN,
    )
    initiated_by: Mapped[ConversationInitiator] = mapped_column(
        sa_enum(ConversationInitiator),
        nullable=False,
    )
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Conversation id={self.id} "
            f"status={self.status.value} org={self.organization_id}>"
        )


class Message(TimestampMixin, Base):
    """A single message within a conversation.

    NOT tenant-scoped directly — scoped through conversation_id FK.
    sender_user_id has no FK because senders span multiple user tables
    (client users vs admin users).
    """

    __tablename__ = "messages"
    __table_args__ = (
        Index(
            "ix_messages_conversation_created",
            "conversation_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    sender_role: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return f"<Message id={self.id} conv={self.conversation_id}>"
