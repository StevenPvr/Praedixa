"""Conversations and messages tables for client-admin messaging.

Revision ID: 016
Revises: 015
Create Date: 2026-02-09

Creates:
- conversation_status enum (open, resolved, archived)
- conversation_initiator enum (client, admin)
- conversations table (tenant-scoped messaging threads)
- messages table (individual messages within conversations)
- Adds new adminauditaction enum values for messaging audit trail

Security notes:
- conversations.organization_id has FK + index for tenant isolation.
- messages.conversation_id has FK CASCADE + index for cleanup.
- messages.sender_user_id has no FK (spans multiple user tables).
- Composite indexes for efficient inbox queries.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "017"
down_revision: str | None = "016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── 1. Create new enums via raw SQL ──────────────────
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE conversationstatus AS ENUM ("
        "'open','resolved','archived'"
        "); EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE conversationinitiator AS ENUM ("
        "'client','admin'"
        "); EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )

    # Add new values to the existing adminauditaction enum.
    # ALTER TYPE ... ADD VALUE is not transactional in PG < 12, but is
    # safe in PG 12+. We use IF NOT EXISTS to make it idempotent.
    for value in (
        "send_message",
        "resolve_conversation",
        "view_inbox",
        "view_site_detail",
        "erasure_initiate",
        "erasure_approve",
        "erasure_execute",
    ):
        op.execute(f"ALTER TYPE adminauditaction ADD VALUE IF NOT EXISTS '{value}';")

    # PG_ENUM with create_type=False — enums already created above.
    conversationstatus = PG_ENUM(name="conversationstatus", create_type=False)
    conversationinitiator = PG_ENUM(name="conversationinitiator", create_type=False)

    # ── 2. Create conversations table ────────────────────
    op.create_table(
        "conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column(
            "status",
            conversationstatus,
            nullable=False,
            server_default="open",
        ),
        sa.Column("initiated_by", conversationinitiator, nullable=False),
        sa.Column(
            "last_message_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Composite index for inbox queries filtered by status
    op.create_index(
        "ix_conversations_org_status",
        "conversations",
        ["organization_id", "status"],
    )
    # Index for sorting by last_message_at
    op.create_index(
        "ix_conversations_last_message_at",
        "conversations",
        [sa.text("last_message_at DESC NULLS LAST")],
    )

    # ── 3. Create messages table ─────────────────────────
    op.create_table(
        "messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "conversation_id",
            UUID(as_uuid=True),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "sender_user_id",
            UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("sender_role", sa.String(50), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column(
            "is_read",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Composite index for listing messages in a conversation chronologically
    op.create_index(
        "ix_messages_conversation_created",
        "messages",
        ["conversation_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_messages_conversation_created", table_name="messages")
    op.drop_table("messages")
    op.drop_index("ix_conversations_last_message_at", table_name="conversations")
    op.drop_index("ix_conversations_org_status", table_name="conversations")
    op.drop_table("conversations")
    op.execute("DROP TYPE IF EXISTS conversationinitiator;")
    op.execute("DROP TYPE IF EXISTS conversationstatus;")
    # Note: removing enum values from adminauditaction is not possible in PG.
    # The added values are harmless when the migration is downgraded.
