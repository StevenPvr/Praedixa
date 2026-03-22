# ruff: noqa: S608 — table names are hardcoded constants, not user input
"""Add RLS bypass for super_admin cross-org read-only endpoints.

Revision ID: 022
Revises: 021
Create Date: 2026-02-12

When app.bypass_rls = 'true' is set (by authenticated super_admin on
cross-org summary endpoints), SELECT policies allow reading all rows.
INSERT/UPDATE/DELETE remain strictly tenant-scoped — super_admin cannot
write cross-org. Only SELECT policies are modified.
"""

from collections.abc import Sequence

from sqlalchemy import inspect

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

revision: str = "022"
down_revision: str | None = "021"
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

_BYPASS_COND = " OR current_setting('app.bypass_rls', true) = 'true'"
_POLICY_ACTIONS = [
    ("SELECT", "USING"),
    ("INSERT", "WITH CHECK"),
    ("UPDATE", "USING WITH CHECK"),
    ("DELETE", "USING"),
]


def _drop_policies(table: str) -> None:
    for policy in _ALL_POLICY_NAMES:
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {table}")


def _add_direct_policies(table: str, id_col: str) -> None:
    cond = f"{id_col} = current_org_id()"
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
        f"CREATE POLICY tenant_isolation_delete ON {table} FOR DELETE USING ({cond})"
    )


def _add_indirect_dataset_policies(table: str) -> None:
    base_cond = (
        "( SELECT cd.organization_id"
        " FROM client_datasets cd"
        f" WHERE cd.id = {table}.dataset_id"  # nosec B608
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


def _add_indirect_alert_policies(table: str) -> None:
    base_cond = (
        "( SELECT ca.organization_id"
        " FROM coverage_alerts ca"
        f" WHERE ca.id = {table}.coverage_alert_id"  # nosec B608
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


def _restore_policies(table: str, cond: str) -> None:
    for action, clause in _POLICY_ACTIONS:
        policy = f"tenant_isolation_{action.lower()}"
        if clause == "USING WITH CHECK":
            op.execute(
                f"CREATE POLICY {policy} ON {table} "
                f"FOR {action} USING ({cond}) WITH CHECK ({cond})"
            )
            continue

        keyword = clause.split(" ", 1)[0]
        op.execute(
            f"CREATE POLICY {policy} ON {table} FOR {action} "
            f"{keyword} ({cond})"
        )


def _restore_direct_policies(table: str, id_col: str) -> None:
    _restore_policies(table, f"{id_col} = current_org_id()")


def _restore_dataset_policies(table: str) -> None:
    _restore_policies(
        table,
        "( SELECT cd.organization_id FROM client_datasets cd"
        f" WHERE cd.id = {table}.dataset_id"  # nosec B608
        ") = current_org_id()",
    )


def _restore_alert_policies(table: str) -> None:
    _restore_policies(
        table,
        "( SELECT ca.organization_id FROM coverage_alerts ca"
        f" WHERE ca.id = {table}.coverage_alert_id"  # nosec B608
        ") = current_org_id()",
    )


def upgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(inspect(bind).get_table_names(schema="public"))

    if "organizations" in existing_tables:
        _drop_policies("organizations")
        _add_direct_policies("organizations", "id")

    for table in _DIRECT_ORG_TABLES:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        _add_direct_policies(table, "organization_id")

    for table in _INDIRECT_DATASET_TABLES:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        _add_indirect_dataset_policies(table)

    for table in _INDIRECT_ALERT_TABLES:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        _add_indirect_alert_policies(table)


def downgrade() -> None:
    """Restore policies without bypass (re-run 013 logic)."""
    bind = op.get_bind()
    existing_tables = set(inspect(bind).get_table_names(schema="public"))

    if "organizations" in existing_tables:
        _drop_policies("organizations")
        _restore_direct_policies("organizations", "id")

    for table in _DIRECT_ORG_TABLES:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        _restore_direct_policies(table, "organization_id")

    for table in _INDIRECT_DATASET_TABLES:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        _restore_dataset_policies(table)

    for table in _INDIRECT_ALERT_TABLES:
        if table not in existing_tables:
            continue
        _drop_policies(table)
        _restore_alert_policies(table)
