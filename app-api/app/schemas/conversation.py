"""Conversation and Message Pydantic schemas.

All schemas follow the camelCase convention via CamelModel.
Create/update schemas use extra="forbid" to prevent mass-assignment attacks.

Security notes:
- ConversationCreate and MessageCreate use extra="forbid" — clients cannot
  inject fields like organization_id, status, sender_user_id, etc.
- subject is limited to 255 chars, content to 5000 chars (boundary validation).
- ConversationStatusUpdate restricts valid target statuses to resolved/archived
  via a field_validator — clients cannot transition to "open" (reopen).
- organization_id, sender_user_id, sender_role are NEVER accepted from the
  client — they are injected server-side from the JWT context.
"""

import uuid
from datetime import datetime

from pydantic import ConfigDict, Field, field_validator

from app.models.conversation import ConversationInitiator, ConversationStatus
from app.schemas.base import CamelModel


class ConversationCreate(CamelModel):
    """Schema for creating a new conversation.

    The client provides only the subject. organization_id, initiated_by,
    and the first message content are handled by separate parameters or
    injected server-side.
    """

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(..., min_length=1, max_length=255)
    content: str | None = Field(default=None, max_length=5000)


class MessageCreate(CamelModel):
    """Schema for sending a message in a conversation.

    Only content is accepted. sender_user_id and sender_role are
    injected from the JWT token server-side.
    """

    model_config = ConfigDict(extra="forbid")

    content: str = Field(..., min_length=1, max_length=5000)


class ConversationStatusUpdate(CamelModel):
    """Schema for updating a conversation's status.

    Only resolved and archived are valid target statuses.
    Reopening (back to open) is not allowed.
    """

    model_config = ConfigDict(extra="forbid")

    status: ConversationStatus

    @field_validator("status")
    @classmethod
    def restrict_target_status(cls, v: ConversationStatus) -> ConversationStatus:
        """Only allow transition to resolved or archived.

        Reopening conversations is not supported to maintain audit integrity.
        """
        if v == ConversationStatus.OPEN:
            raise ValueError("Cannot set status back to open")
        return v


class ConversationRead(CamelModel):
    """Full conversation response schema."""

    id: uuid.UUID
    organization_id: uuid.UUID
    subject: str
    status: ConversationStatus
    initiated_by: ConversationInitiator
    last_message_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class MessageRead(CamelModel):
    """Full message response schema."""

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_user_id: uuid.UUID
    sender_role: str
    content: str
    is_read: bool
    created_at: datetime
    updated_at: datetime


class UnreadOrgEntry(CamelModel):
    """Per-org unread count entry."""

    org_id: str
    org_name: str
    count: int


class UnreadCountByOrg(CamelModel):
    """Unread message count with per-org breakdown (admin inbox)."""

    total: int
    by_org: list[UnreadOrgEntry]
