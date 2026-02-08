# ruff: noqa: S608 — table names are hardcoded constants, not user input
"""RLS hardening for tenant-scoped tables and public schema safety.

Revision ID: 013
Revises: 012
Create Date: 2026-02-08

Applies/repairs RLS coverage for tenant-scoped tables introduced before and
after migration 007. Also revokes CREATE on schema public from PUBLIC.
"""

from collections.abc import Sequence

from sqlalchemy import inspect

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "013"
down_revision: str | None = "012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ALL_POLICY_NAMES = [
    "tenant_isolation_select",
    "tenant_isolation_insert",
    "tenant_isolation_update",
    "tenant_isolation_delete",
]

_DIRECT_ORG_TABLES = [
    "users",
    "sites",
    "departments",
    "employees",
    "absences",
    "forecast_runs",
    "daily_forecasts",
    "decisions",
    "dashboard_alerts",
    "action_plans",
    "client_datasets",
    "canonical_records",
    "cost_parameters",
    "coverage_alerts",
    "operational_decisions",
    "proof_records",
    "plan_change_history",
    "onboarding_states",
]

_INDIRECT_DATASET_TABLES = [
    "dataset_columns",
    "fit_parameters",
    "ingestion_log",
    "quality_reports",
    "pipeline_config_history",
]

_INDIRECT_ALERT_TABLES = [
    "scenario_options",
]


def _enable_rls(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def _drop_policies(table: str) -> None:
    for policy in _ALL_POLICY_NAMES:
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {table}")


def _add_direct_policies(table: str, id_col: str) -> None:
    cond = f"{id_col} = current_org_id()"
    op.execute(
        f"CREATE POLICY tenant_isolation_select ON {table} FOR SELECT USING ({cond})"
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
        f"CREATE POLICY tenant_isolation_delete ON {table} FOR DELETE USING ({cond})"
    )


def _add_indirect_dataset_policies(table: str) -> None:
    condition = (
        "( SELECT cd.organization_id"
        " FROM client_datasets cd"
        f" WHERE cd.id = {table}.dataset_id"  # nosec B608
        ") = current_org_id()"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_select ON {table} "
        f"FOR SELECT USING ({condition})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_insert ON {table} "
        f"FOR INSERT WITH CHECK ({condition})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_update ON {table} "
        f"FOR UPDATE USING ({condition}) "
        f"WITH CHECK ({condition})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_delete ON {table} "
        f"FOR DELETE USING ({condition})"
    )


def _add_indirect_alert_policies(table: str) -> None:
    condition = (
        "( SELECT ca.organization_id"
        " FROM coverage_alerts ca"
        f" WHERE ca.id = {table}.coverage_alert_id"  # nosec B608
        ") = current_org_id()"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_select ON {table} "
        f"FOR SELECT USING ({condition})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_insert ON {table} "
        f"FOR INSERT WITH CHECK ({condition})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_update ON {table} "
        f"FOR UPDATE USING ({condition}) "
        f"WITH CHECK ({condition})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_delete ON {table} "
        f"FOR DELETE USING ({condition})"
    )


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION current_org_id()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        AS $$
            SELECT NULLIF(
                current_setting('app.current_organization_id', true),
                ''
            )::uuid;
        $$;
        """
    )

    bind = op.get_bind()
    existing_tables = set(inspect(bind).get_table_names(schema="public"))

    if "organizations" in existing_tables:
        _drop_policies("organizations")
        _enable_rls("organizations")
        _add_direct_policies("organizations", "id")

    for table in _DIRECT_ORG_TABLES:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        _enable_rls(table)
        _add_direct_policies(table, "organization_id")

    for table in _INDIRECT_DATASET_TABLES:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        _enable_rls(table)
        _add_indirect_dataset_policies(table)

    for table in _INDIRECT_ALERT_TABLES:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        _enable_rls(table)
        _add_indirect_alert_policies(table)

    # Hardening: prevent arbitrary object creation in public schema.
    op.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")


def downgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(inspect(bind).get_table_names(schema="public"))
    tables = [
        "organizations",
        *_DIRECT_ORG_TABLES,
        *_INDIRECT_DATASET_TABLES,
        *_INDIRECT_ALERT_TABLES,
    ]
    for table in tables:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
