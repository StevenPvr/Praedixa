# ruff: noqa: S608 — table names are hardcoded migration constants
"""Add onboarding BPM foundation tables.

Revision ID: 028
Revises: 027
Create Date: 2026-03-18

Creates:
- onboarding_cases: root onboarding control-plane cases per organization
- onboarding_case_tasks: projected human/technical tasks attached to a case
- onboarding_case_blockers: explicit blockers for readiness and activation
- onboarding_case_events: append-only timeline events per case

Security notes:
- Every table is organization-scoped via direct or indirect RLS policies.
- SELECT policies preserve the super_admin bypass used by cross-org admin views.
- Workflow metadata stays lightweight and never stores secrets.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op

revision: str = "028"
down_revision: str | None = "027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ALL_POLICY_NAMES = [
    "tenant_isolation_select",
    "tenant_isolation_insert",
    "tenant_isolation_update",
    "tenant_isolation_delete",
]
_BYPASS_COND = " OR current_setting('app.bypass_rls', true) = 'true'"
_DIRECT_TABLES = ["onboarding_cases"]
_CASE_SCOPED_TABLES = [
    "onboarding_case_tasks",
    "onboarding_case_blockers",
    "onboarding_case_events",
]


def _drop_policies(table: str) -> None:
    for policy in _ALL_POLICY_NAMES:
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {table}")


def _enable_rls(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def _add_direct_org_policies(table: str) -> None:
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


def _add_case_scoped_policies(table: str) -> None:
    base_cond = (
        "( SELECT oc.organization_id"
        " FROM onboarding_cases oc"
        f" WHERE oc.id = {table}.case_id"  # nosec B608
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
        "onboarding_cases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "sponsor_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("phase", sa.String(length=40), nullable=False, server_default="intake"),
        sa.Column("activation_mode", sa.String(length=16), nullable=False),
        sa.Column("environment_target", sa.String(length=16), nullable=False),
        sa.Column("data_residency_region", sa.String(length=32), nullable=False),
        sa.Column(
            "workflow_provider",
            sa.String(length=24),
            nullable=False,
            server_default="local_projection",
        ),
        sa.Column("process_definition_key", sa.String(length=80), nullable=False),
        sa.Column("process_definition_version", sa.Integer(), nullable=False),
        sa.Column("process_instance_key", sa.String(length=80), nullable=False),
        sa.Column(
            "subscription_modules",
            JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "selected_packs",
            JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "source_modes",
            JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "last_readiness_status",
            sa.String(length=24),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column(
            "last_readiness_score",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("target_go_live_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "metadata_json",
            JSONB(),
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
            "status IN ("
            "'draft','in_progress','blocked','ready_limited','ready_full',"
            "'active_limited','active_full','completed','cancelled'"
            ")",
            name="ck_onboarding_cases_status",
        ),
        sa.CheckConstraint(
            "phase IN ("
            "'intake','access_setup','source_activation','mapping_validation',"
            "'product_configuration','readiness_review','activation','hypercare'"
            ")",
            name="ck_onboarding_cases_phase",
        ),
        sa.CheckConstraint(
            "activation_mode IN ('shadow','limited','full')",
            name="ck_onboarding_cases_activation_mode",
        ),
        sa.CheckConstraint(
            "environment_target IN ('sandbox','production')",
            name="ck_onboarding_cases_environment_target",
        ),
        sa.CheckConstraint(
            "last_readiness_status IN ("
            "'not_started','in_progress','ready','warning','blocked'"
            ")",
            name="ck_onboarding_cases_readiness_status",
        ),
        sa.CheckConstraint(
            "workflow_provider IN ('camunda','local_projection')",
            name="ck_onboarding_cases_workflow_provider",
        ),
    )
    op.create_index(
        "ix_onboarding_cases_org_created",
        "onboarding_cases",
        ["organization_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_onboarding_cases_status_created",
        "onboarding_cases",
        ["status", sa.text("created_at DESC")],
    )

    op.create_table(
        "onboarding_case_tasks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "case_id",
            UUID(as_uuid=True),
            sa.ForeignKey("onboarding_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("task_key", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("domain", sa.String(length=24), nullable=False),
        sa.Column("task_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="todo"),
        sa.Column(
            "assignee_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "details_json",
            JSONB(),
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
            "domain IN ('scope','access','sources','mapping','product','activation')",
            name="ck_onboarding_case_tasks_domain",
        ),
        sa.CheckConstraint(
            "status IN ('todo','in_progress','done','blocked')",
            name="ck_onboarding_case_tasks_status",
        ),
        sa.UniqueConstraint(
            "case_id",
            "task_key",
            name="uq_onboarding_case_tasks_case_task_key",
        ),
    )
    op.create_index(
        "ix_onboarding_case_tasks_case_status_sort",
        "onboarding_case_tasks",
        ["case_id", "status", "sort_order"],
    )

    op.create_table(
        "onboarding_case_blockers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "case_id",
            UUID(as_uuid=True),
            sa.ForeignKey("onboarding_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("blocker_key", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("domain", sa.String(length=24), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="open"),
        sa.Column(
            "details_json",
            JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "opened_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "domain IN ('scope','access','sources','mapping','product','activation')",
            name="ck_onboarding_case_blockers_domain",
        ),
        sa.CheckConstraint(
            "severity IN ('info','warning','critical')",
            name="ck_onboarding_case_blockers_severity",
        ),
        sa.CheckConstraint(
            "status IN ('open','resolved')",
            name="ck_onboarding_case_blockers_status",
        ),
        sa.UniqueConstraint(
            "case_id",
            "blocker_key",
            name="uq_onboarding_case_blockers_case_blocker_key",
        ),
    )
    op.create_index(
        "ix_onboarding_case_blockers_case_status_severity",
        "onboarding_case_blockers",
        ["case_id", "status", "severity"],
    )

    op.create_table(
        "onboarding_case_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "case_id",
            UUID(as_uuid=True),
            sa.ForeignKey("onboarding_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "payload_json",
            JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_onboarding_case_events_case_occurred",
        "onboarding_case_events",
        ["case_id", sa.text("occurred_at DESC")],
    )

    for table in _DIRECT_TABLES:
        _drop_policies(table)
        _enable_rls(table)
        _add_direct_org_policies(table)

    for table in _CASE_SCOPED_TABLES:
        _drop_policies(table)
        _enable_rls(table)
        _add_case_scoped_policies(table)


def downgrade() -> None:
    tables = [*_CASE_SCOPED_TABLES, *_DIRECT_TABLES]
    for table in tables:
        _drop_policies(table)
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.drop_table("onboarding_case_events")
    op.drop_table("onboarding_case_blockers")
    op.drop_table("onboarding_case_tasks")
    op.drop_table("onboarding_cases")
