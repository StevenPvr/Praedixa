"""Persist RGPD erasure workflow and append-only audit trail.

Revision ID: 021
Revises: 020
Create Date: 2026-02-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import UUID

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

NOW_SQL = "now()"
CREATED_AT_DESC = "created_at DESC"

# revision identifiers, used by Alembic.
revision: str = "021"
down_revision: str | None = "020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create enum if missing
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE rgpderasurestatus AS ENUM ("
        "'pending_approval','approved','executing','completed','failed'"
        "); EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )

    rgpderasurestatus = PG_ENUM(name="rgpderasurestatus", create_type=False)

    op.create_table(
        "rgpd_erasure_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), nullable=False),
        sa.Column("org_slug", sa.String(length=100), nullable=False),
        sa.Column("initiated_by", sa.String(length=64), nullable=False),
        sa.Column("approved_by", sa.String(length=64), nullable=True),
        sa.Column("status", rgpderasurestatus, nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(NOW_SQL),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(NOW_SQL),
        ),
    )

    op.create_index(
        "ix_rgpd_erasure_requests_org_created",
        "rgpd_erasure_requests",
        ["organization_id", sa.text(CREATED_AT_DESC)],
    )

    op.create_index(
        "uq_rgpd_erasure_active_per_org",
        "rgpd_erasure_requests",
        ["organization_id"],
        unique=True,
        postgresql_where=sa.text(
            "status IN ('pending_approval','approved','executing')"
        ),
    )

    op.create_table(
        "rgpd_erasure_audit_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "erasure_request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("rgpd_erasure_requests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(NOW_SQL),
        ),
    )

    op.create_index(
        "uq_rgpd_erasure_audit_seq",
        "rgpd_erasure_audit_events",
        ["erasure_request_id", "sequence_no"],
        unique=True,
    )
    op.create_index(
        "ix_rgpd_erasure_audit_request_created",
        "rgpd_erasure_audit_events",
        ["erasure_request_id", sa.text(CREATED_AT_DESC)],
    )

    # Append-only audit table trigger
    op.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_rgpd_erasure_audit_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION  -- noqa: E501
                'rgpd_erasure_audit_events is append-only:'
                ' UPDATE and DELETE are prohibited';
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE TRIGGER enforce_rgpd_erasure_audit_append_only
        BEFORE UPDATE OR DELETE ON rgpd_erasure_audit_events
        FOR EACH ROW EXECUTE FUNCTION prevent_rgpd_erasure_audit_modification();
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS enforce_rgpd_erasure_audit_append_only "
        "ON rgpd_erasure_audit_events;"
    )
    op.execute("DROP FUNCTION IF EXISTS prevent_rgpd_erasure_audit_modification();")

    op.drop_index(
        "ix_rgpd_erasure_audit_request_created",
        table_name="rgpd_erasure_audit_events",
    )
    op.drop_index("uq_rgpd_erasure_audit_seq", table_name="rgpd_erasure_audit_events")
    op.drop_table("rgpd_erasure_audit_events")

    op.drop_index(
        "uq_rgpd_erasure_active_per_org",
        table_name="rgpd_erasure_requests",
    )
    op.drop_index(
        "ix_rgpd_erasure_requests_org_created",
        table_name="rgpd_erasure_requests",
    )
    op.drop_table("rgpd_erasure_requests")

    sa.Enum(name="rgpderasurestatus").drop(op.get_bind(), checkfirst=True)
