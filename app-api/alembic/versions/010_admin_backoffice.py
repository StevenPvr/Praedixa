"""Admin back-office tables: audit log, plan changes, onboarding.

Revision ID: 010
Revises: 009
Create Date: 2026-02-07

Creates:
- admin_audit_log: Immutable audit trail for super_admin actions.
  Protected by an append-only trigger that prevents UPDATE/DELETE.
- plan_change_history: Billing plan change audit trail.
- onboarding_states: Per-org onboarding progress tracker.

Security notes:
- The append-only trigger on admin_audit_log is a defense-in-depth measure.
  Even with direct DB access, audit records cannot be modified or deleted.
- New enums (adminauditaction, onboardingstatus) use lowercase values
  matching the sa_enum() convention in models.
- subscriptionplan enum is reused from the existing schema (not recreated).
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

NOW_SQL = "now()"
ON_DELETE_CASCADE = "CASCADE"
ON_DELETE_SET_NULL = "SET NULL"
USERS_ID_REF = "users.id"
ORGANIZATIONS_ID_REF = "organizations.id"
CREATED_AT_DESC = "created_at DESC"

# revision identifiers, used by Alembic.
revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Create new enums via raw SQL ──────────────────
    # Raw DDL avoids SQLAlchemy's implicit CREATE TYPE inside create_table.
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE adminauditaction AS ENUM ("
        "'view_org','update_org','create_org','suspend_org',"
        "'reactivate_org','churn_org','view_users','invite_user',"
        "'change_role','deactivate_user','reactivate_user',"
        "'view_datasets','view_data','change_plan',"
        "'view_monitoring','view_mirror','onboarding_step'"
        "); EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE onboardingstatus AS ENUM ("
        "'in_progress','completed','abandoned'"
        "); EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )

    # PG_ENUM with create_type=False — enums already created above.
    adminauditaction = PG_ENUM(name="adminauditaction", create_type=False)
    onboardingstatus = PG_ENUM(name="onboardingstatus", create_type=False)

    # ── 2. Create tables ─────────────────────────────────

    op.create_table(
        "admin_audit_log",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "admin_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey(USERS_ID_REF, ondelete=ON_DELETE_CASCADE),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "target_org_id",
            UUID(as_uuid=True),
            sa.ForeignKey(ORGANIZATIONS_ID_REF, ondelete=ON_DELETE_SET_NULL),
            nullable=True,
        ),
        sa.Column(
            "action",
            adminauditaction,
            nullable=False,
        ),
        sa.Column("resource_type", sa.String(100), nullable=True),
        sa.Column("resource_id", UUID(as_uuid=True), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=False),
        sa.Column("user_agent", sa.String(200), nullable=True),
        sa.Column("request_id", sa.String(64), nullable=False),
        sa.Column("metadata_json", JSONB(), nullable=False, server_default="{}"),
        sa.Column("severity", sa.String(10), nullable=False, server_default="INFO"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
    )

    op.create_table(
        "plan_change_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            UUID(as_uuid=True),
            sa.ForeignKey(ORGANIZATIONS_ID_REF, ondelete=ON_DELETE_CASCADE),
            nullable=False,
        ),
        sa.Column(
            "changed_by",
            UUID(as_uuid=True),
            sa.ForeignKey(USERS_ID_REF, ondelete=ON_DELETE_CASCADE),
            nullable=False,
        ),
        sa.Column(
            "old_plan",
            PG_ENUM(name="subscriptionplan", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "new_plan",
            PG_ENUM(name="subscriptionplan", create_type=False),
            nullable=False,
        ),
        sa.Column("reason", sa.String(1000), nullable=True),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
    )

    op.create_table(
        "onboarding_states",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            UUID(as_uuid=True),
            sa.ForeignKey(ORGANIZATIONS_ID_REF, ondelete=ON_DELETE_CASCADE),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "initiated_by",
            UUID(as_uuid=True),
            sa.ForeignKey(USERS_ID_REF, ondelete=ON_DELETE_CASCADE),
            nullable=False,
        ),
        sa.Column(
            "status",
            onboardingstatus,
            nullable=False,
        ),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("steps_completed", JSONB(), nullable=False, server_default="[]"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
    )

    # ── 3. Create composite indexes ──────────────────────

    op.create_index(
        "ix_admin_audit_log_admin_created",
        "admin_audit_log",
        ["admin_user_id", sa.text(CREATED_AT_DESC)],
    )
    op.create_index(
        "ix_admin_audit_log_org_created",
        "admin_audit_log",
        ["target_org_id", sa.text(CREATED_AT_DESC)],
    )
    op.create_index(
        "ix_admin_audit_log_action_created",
        "admin_audit_log",
        ["action", sa.text(CREATED_AT_DESC)],
    )
    op.create_index(
        "ix_plan_change_history_org_created",
        "plan_change_history",
        ["organization_id", "created_at"],
    )

    # ── 4. Create append-only trigger ────────────────────
    # Defense-in-depth: prevents modification or deletion of audit records
    # even with direct SQL access.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION
                'admin_audit_log is append-only: UPDATE and DELETE are prohibited';
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER enforce_audit_log_append_only
        BEFORE UPDATE OR DELETE ON admin_audit_log
        FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
        """
    )


def downgrade() -> None:
    # Drop trigger and function first (depends on table)
    op.execute(
        "DROP TRIGGER IF EXISTS enforce_audit_log_append_only ON admin_audit_log;"
    )
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_log_modification();")

    # Drop indexes
    op.drop_index(
        "ix_plan_change_history_org_created", table_name="plan_change_history"
    )
    op.drop_index("ix_admin_audit_log_action_created", table_name="admin_audit_log")
    op.drop_index("ix_admin_audit_log_org_created", table_name="admin_audit_log")
    op.drop_index("ix_admin_audit_log_admin_created", table_name="admin_audit_log")

    # Drop tables
    op.drop_table("onboarding_states")
    op.drop_table("plan_change_history")
    op.drop_table("admin_audit_log")

    # Drop enums
    sa.Enum(name="onboardingstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="adminauditaction").drop(op.get_bind(), checkfirst=True)
