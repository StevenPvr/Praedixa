"""Persist onboarding source execution evidence.

Revision ID: 033_onboarding_source_runs
Revises: 032_admin_audit_target_org
Create Date: 2026-03-22 09:40:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

NOW_SQL = "now()"
JSONB_EMPTY_OBJECT = "'{}'::jsonb"
ONBOARDING_CASES_ID_REF = "onboarding_cases.id"
ONBOARDING_CASE_TASKS_ID_REF = "onboarding_case_tasks.id"

revision: str = "033_onboarding_source_runs"
down_revision: str | Sequence[str] | None = "032_admin_audit_target_org"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_POLICY_NAMES = [
    "tenant_isolation_select",
    "tenant_isolation_insert",
    "tenant_isolation_update",
    "tenant_isolation_delete",
]
_BYPASS_COND = " OR current_setting('app.bypass_rls', true) = 'true'"


def _drop_policies(table: str) -> None:
    for policy in _POLICY_NAMES:
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {table}")


def _enable_rls(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def _add_case_scoped_policies(table: str) -> None:
    base_cond = (
        "( SELECT oc.organization_id"
        " FROM onboarding_cases oc"
        f" WHERE oc.id = {table}.case_id"
        ") = current_org_id()"
    )
    select_cond = f"({base_cond}{_BYPASS_COND})"
    op.execute(
        f"CREATE POLICY tenant_isolation_select ON {table} "
        f"FOR SELECT USING ({select_cond})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_insert ON {table} "
        f"FOR INSERT WITH CHECK ({base_cond})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_update ON {table} "
        f"FOR UPDATE USING ({base_cond}) WITH CHECK ({base_cond})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_delete ON {table} "
        f"FOR DELETE USING ({base_cond})"
    )


def upgrade() -> None:
    op.create_table(
        "onboarding_source_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "case_id",
            UUID(as_uuid=True),
            sa.ForeignKey(ONBOARDING_CASES_ID_REF, ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "task_id",
            UUID(as_uuid=True),
            sa.ForeignKey(ONBOARDING_CASE_TASKS_ID_REF, ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_key", sa.String(length=120), nullable=False),
        sa.Column("source_type", sa.String(length=16), nullable=False),
        sa.Column("action", sa.String(length=24), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("stored_path", sa.Text(), nullable=True),
        sa.Column(
            "stats_json",
            JSONB(),
            nullable=False,
            server_default=sa.text(JSONB_EMPTY_OBJECT),
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint(
            "source_type IN ('api','file','sftp')",
            name="ck_onboarding_source_runs_source_type",
        ),
        sa.CheckConstraint(
            "action IN ('probe','sync','file_import','medallion_trigger')",
            name="ck_onboarding_source_runs_action",
        ),
        sa.CheckConstraint(
            "status IN ('queued','running','success','failed')",
            name="ck_onboarding_source_runs_status",
        ),
    )
    op.create_index(
        "ix_onboarding_source_runs_case_task_created",
        "onboarding_source_runs",
        ["case_id", "task_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_onboarding_source_runs_case_source_created",
        "onboarding_source_runs",
        ["case_id", "source_key", sa.text("created_at DESC")],
    )

    _drop_policies("onboarding_source_runs")
    _enable_rls("onboarding_source_runs")
    _add_case_scoped_policies("onboarding_source_runs")


def downgrade() -> None:
    _drop_policies("onboarding_source_runs")
    op.execute("ALTER TABLE onboarding_source_runs DISABLE ROW LEVEL SECURITY")
    op.drop_table("onboarding_source_runs")
