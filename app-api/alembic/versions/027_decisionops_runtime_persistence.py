"""DecisionOps runtime persistence for approvals, dispatches, and ledgers.

Revision ID: 027
Revises: 026
Create Date: 2026-03-13

Creates:
- decision_approvals: persisted approval requests per recommendation
- action_dispatches: persisted action-dispatch lifecycle per recommendation
- decision_ledger_entries: persisted finance-grade ledger revisions

Security notes:
- Every table is tenant-scoped via organization_id and RLS.
- SELECT policies keep the existing super_admin bypass behavior from revision 022.
- Runtime payloads are snapshotted in JSONB, but searchable columns stay normalized.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

revision: str = "027"
down_revision: str | None = "026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NOW_SQL = "now()"
OPERATIONAL_DECISIONS_ID_REF = "operational_decisions.id"
_BYPASS_COND = " OR current_setting('app.bypass_rls', true) = 'true'"
_TABLES_WITH_DIRECT_ORG = [
    "decision_approvals",
    "action_dispatches",
    "decision_ledger_entries",
]
_ALL_POLICY_NAMES = [
    "tenant_isolation_select",
    "tenant_isolation_insert",
    "tenant_isolation_update",
    "tenant_isolation_delete",
]


def _create_enum_types() -> None:
    op.execute(
        "CREATE TYPE approvalruntimestatus AS ENUM "
        "('requested','granted','rejected','expired','canceled')"
    )
    op.execute(
        "CREATE TYPE actiondispatchruntimestatus AS ENUM "
        "('dry_run','pending','dispatched','acknowledged','failed','retried','canceled')"
    )
    op.execute(
        "CREATE TYPE actiondispatchruntimemode AS ENUM ('dry_run','live','sandbox')"
    )
    op.execute(
        "CREATE TYPE ledgerruntimestatus AS ENUM "
        "('open','measuring','closed','recalculated','disputed')"
    )
    op.execute(
        "CREATE TYPE ledgerruntimevalidationstatus AS ENUM "
        "('estimated','validated','contested')"
    )


def _drop_enum_types() -> None:
    op.execute("DROP TYPE IF EXISTS ledgerruntimevalidationstatus")
    op.execute("DROP TYPE IF EXISTS ledgerruntimestatus")
    op.execute("DROP TYPE IF EXISTS actiondispatchruntimemode")
    op.execute("DROP TYPE IF EXISTS actiondispatchruntimestatus")
    op.execute("DROP TYPE IF EXISTS approvalruntimestatus")


def _drop_policies(table: str) -> None:
    for policy in _ALL_POLICY_NAMES:
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {table}")


def _enable_rls_with_bypass(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
    cond = "organization_id = current_org_id()"
    select_cond = f"({cond}{_BYPASS_COND})"
    op.execute(
        f"CREATE POLICY tenant_isolation_select ON {table} "
        f"FOR SELECT USING ({select_cond})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_insert ON {table} "
        f"FOR INSERT WITH CHECK ({cond})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_update ON {table} "
        f"FOR UPDATE USING ({cond}) WITH CHECK ({cond})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_delete ON {table} "
        f"FOR DELETE USING ({cond})"
    )


def upgrade() -> None:
    _create_enum_types()

    approval_status = PG_ENUM(name="approvalruntimestatus", create_type=False)
    dispatch_status = PG_ENUM(
        name="actiondispatchruntimestatus",
        create_type=False,
    )
    dispatch_mode = PG_ENUM(name="actiondispatchruntimemode", create_type=False)
    ledger_status = PG_ENUM(name="ledgerruntimestatus", create_type=False)
    ledger_validation_status = PG_ENUM(
        name="ledgerruntimevalidationstatus",
        create_type=False,
    )

    op.create_table(
        "decision_approvals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("approval_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "recommendation_id",
            UUID(as_uuid=True),
            sa.ForeignKey(OPERATIONAL_DECISIONS_ID_REF, ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("site_id", sa.String(50), nullable=True),
        sa.Column("contract_id", sa.String(100), nullable=False),
        sa.Column("contract_version", sa.Integer(), nullable=False),
        sa.Column("status", approval_status, nullable=False),
        sa.Column("approver_role", sa.String(80), nullable=False),
        sa.Column("rule_step_order", sa.Integer(), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("record_json", JSONB(), nullable=False, server_default="{}"),
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
        sa.UniqueConstraint("approval_id", name="uq_decision_approval_business_id"),
    )
    op.create_index(
        "ix_decision_approvals_org_status_requested",
        "decision_approvals",
        ["organization_id", "status", sa.text("requested_at DESC")],
    )
    op.create_index(
        "ix_decision_approvals_org_recommendation",
        "decision_approvals",
        ["organization_id", "recommendation_id", "rule_step_order"],
    )
    op.create_index(
        "ix_decision_approvals_org_site_requested",
        "decision_approvals",
        ["organization_id", "site_id", sa.text("requested_at DESC")],
    )

    op.create_table(
        "action_dispatches",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("action_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "recommendation_id",
            UUID(as_uuid=True),
            sa.ForeignKey(OPERATIONAL_DECISIONS_ID_REF, ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "approval_id",
            UUID(as_uuid=True),
            sa.ForeignKey("decision_approvals.approval_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("site_id", sa.String(50), nullable=True),
        sa.Column("contract_id", sa.String(100), nullable=False),
        sa.Column("contract_version", sa.Integer(), nullable=False),
        sa.Column("status", dispatch_status, nullable=False),
        sa.Column("dispatch_mode", dispatch_mode, nullable=False),
        sa.Column("destination_system", sa.String(80), nullable=False),
        sa.Column("destination_type", sa.String(80), nullable=False),
        sa.Column("target_resource_id", sa.String(120), nullable=True),
        sa.Column("idempotency_key", sa.String(255), nullable=False),
        sa.Column("record_json", JSONB(), nullable=False, server_default="{}"),
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
        sa.UniqueConstraint("action_id", name="uq_action_dispatch_business_id"),
    )
    op.create_index(
        "ix_action_dispatches_org_status_created",
        "action_dispatches",
        ["organization_id", "status", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_action_dispatches_org_recommendation",
        "action_dispatches",
        ["organization_id", "recommendation_id"],
    )
    op.create_index(
        "ix_action_dispatches_org_approval",
        "action_dispatches",
        ["organization_id", "approval_id"],
    )
    op.create_index(
        "ix_action_dispatches_org_site_created",
        "action_dispatches",
        ["organization_id", "site_id", sa.text("created_at DESC")],
    )

    op.create_table(
        "decision_ledger_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("ledger_id", UUID(as_uuid=True), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column(
            "recommendation_id",
            UUID(as_uuid=True),
            sa.ForeignKey(OPERATIONAL_DECISIONS_ID_REF, ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "action_id",
            UUID(as_uuid=True),
            sa.ForeignKey("action_dispatches.action_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("site_id", sa.String(50), nullable=True),
        sa.Column("contract_id", sa.String(100), nullable=False),
        sa.Column("contract_version", sa.Integer(), nullable=False),
        sa.Column("status", ledger_status, nullable=False),
        sa.Column("validation_status", ledger_validation_status, nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("record_json", JSONB(), nullable=False, server_default="{}"),
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
        sa.UniqueConstraint(
            "ledger_id",
            "revision",
            name="uq_decision_ledger_revision",
        ),
    )
    op.create_index(
        "ix_decision_ledger_entries_org_ledger_revision",
        "decision_ledger_entries",
        ["organization_id", "ledger_id", sa.text("revision DESC")],
    )
    op.create_index(
        "ix_decision_ledger_entries_org_recommendation",
        "decision_ledger_entries",
        ["organization_id", "recommendation_id"],
    )
    op.create_index(
        "ix_decision_ledger_entries_org_action",
        "decision_ledger_entries",
        ["organization_id", "action_id"],
    )
    op.create_index(
        "ix_decision_ledger_entries_org_site_opened",
        "decision_ledger_entries",
        ["organization_id", "site_id", sa.text("opened_at DESC")],
    )

    for table in _TABLES_WITH_DIRECT_ORG:
        _drop_policies(table)
        _enable_rls_with_bypass(table)


def downgrade() -> None:
    for table in _TABLES_WITH_DIRECT_ORG:
        _drop_policies(table)
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.drop_index(
        "ix_decision_ledger_entries_org_site_opened",
        table_name="decision_ledger_entries",
    )
    op.drop_index(
        "ix_decision_ledger_entries_org_action",
        table_name="decision_ledger_entries",
    )
    op.drop_index(
        "ix_decision_ledger_entries_org_recommendation",
        table_name="decision_ledger_entries",
    )
    op.drop_index(
        "ix_decision_ledger_entries_org_ledger_revision",
        table_name="decision_ledger_entries",
    )
    op.drop_table("decision_ledger_entries")

    op.drop_index(
        "ix_action_dispatches_org_site_created",
        table_name="action_dispatches",
    )
    op.drop_index(
        "ix_action_dispatches_org_approval",
        table_name="action_dispatches",
    )
    op.drop_index(
        "ix_action_dispatches_org_recommendation",
        table_name="action_dispatches",
    )
    op.drop_index(
        "ix_action_dispatches_org_status_created",
        table_name="action_dispatches",
    )
    op.drop_table("action_dispatches")

    op.drop_index(
        "ix_decision_approvals_org_site_requested",
        table_name="decision_approvals",
    )
    op.drop_index(
        "ix_decision_approvals_org_recommendation",
        table_name="decision_approvals",
    )
    op.drop_index(
        "ix_decision_approvals_org_status_requested",
        table_name="decision_approvals",
    )
    op.drop_table("decision_approvals")

    _drop_enum_types()
