"""Create contact_requests table for landing contact ingestion.

Revision ID: 023
Revises: 022
Create Date: 2026-02-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "023"
down_revision: str | None = "022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contact_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "locale",
            sa.String(length=8),
            nullable=False,
            server_default=sa.text("'fr'"),
        ),
        sa.Column("request_type", sa.String(length=40), nullable=False),
        sa.Column("company_name", sa.String(length=100), nullable=False),
        sa.Column("first_name", sa.String(length=80), nullable=False),
        sa.Column("last_name", sa.String(length=80), nullable=False),
        sa.Column(
            "role",
            sa.String(length=80),
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "email",
            sa.String(length=254),
            nullable=False,
        ),
        sa.Column(
            "phone",
            sa.String(length=30),
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column("subject", sa.String(length=120), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("source_ip_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'new'"),
        ),
        sa.Column(
            "consent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
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
        sa.CheckConstraint(
            "locale IN ('fr','en')",
            name="ck_contact_requests_locale",
        ),
        sa.CheckConstraint(
            "request_type IN ("
            "'founding_pilot','product_demo','partnership','press_other'"
            ")",
            name="ck_contact_requests_type",
        ),
        sa.CheckConstraint(
            "status IN ('new','in_progress','closed')",
            name="ck_contact_requests_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contact_requests_created_at",
        "contact_requests",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_contact_requests_email",
        "contact_requests",
        ["email"],
        unique=False,
    )
    op.create_index(
        "ix_contact_requests_request_type",
        "contact_requests",
        ["request_type"],
        unique=False,
    )
    op.create_index(
        "ix_contact_requests_status",
        "contact_requests",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_contact_requests_status", table_name="contact_requests")
    op.drop_index(
        "ix_contact_requests_request_type",
        table_name="contact_requests",
    )
    op.drop_index("ix_contact_requests_email", table_name="contact_requests")
    op.drop_index(
        "ix_contact_requests_created_at",
        table_name="contact_requests",
    )
    op.drop_table("contact_requests")
