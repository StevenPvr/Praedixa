"""Row-Level Security policies for all org-scoped public tables.

Revision ID: 007
Revises: 006
Create Date: 2026-02-06

Applies ENABLE + FORCE RLS on all org-scoped tables in the public
schema. Adds tenant isolation policies using current_org_id() helper.

Security notes:
- FORCE ROW LEVEL SECURITY ensures even table owners are subject to
  policies (defense-in-depth against misconfigured ownership).
- current_org_id() reads from session variable set by the API dependency.
- The organizations table uses id = current_org_id() (not organization_id).
- Tables without direct organization_id (dataset_columns, fit_parameters,
  ingestion_log, pipeline_config_history) use a subquery through
  client_datasets.organization_id for RLS enforcement.
- Policies cover both read (USING) and write (WITH CHECK) paths.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: str | None = "006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Tables with direct organization_id column
_DIRECT_ORG_TABLES = [
    "users",
    "client_datasets",
]

# Tables scoped via dataset_id -> client_datasets.organization_id
_INDIRECT_ORG_TABLES = [
    "dataset_columns",
    "fit_parameters",
    "ingestion_log",
    "pipeline_config_history",
]

# Subquery to resolve org_id from dataset_id
_DATASET_ORG_SUBQUERY = """(
    SELECT cd.organization_id
    FROM client_datasets cd
    WHERE cd.id = {table}.dataset_id
) = current_org_id()"""

_ALL_POLICY_NAMES = [
    "tenant_isolation_select",
    "tenant_isolation_insert",
    "tenant_isolation_update",
    "tenant_isolation_delete",
]


def _enable_rls(table: str) -> None:
    """Enable and force RLS on a public table."""
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def _add_direct_policies(table: str, id_col: str) -> None:
    """Add RLS policies using a direct column comparison."""
    condition = f"{id_col} = current_org_id()"

    for action, clause in [
        ("SELECT", f"USING ({condition})"),
        ("INSERT", f"WITH CHECK ({condition})"),
        ("UPDATE", f"USING ({condition}) WITH CHECK ({condition})"),
        ("DELETE", f"USING ({condition})"),
    ]:
        policy = f"tenant_isolation_{action.lower()}"
        op.execute(f"""
            CREATE POLICY {policy}
                ON {table}
                FOR {action}
                {clause};
        """)


def _add_indirect_policies(table: str) -> None:
    """Add RLS policies using subquery through client_datasets."""
    using = _DATASET_ORG_SUBQUERY.format(table=table)

    op.execute(f"""
        CREATE POLICY tenant_isolation_select
            ON {table}
            FOR SELECT
            USING ({using});
    """)
    op.execute(f"""
        CREATE POLICY tenant_isolation_insert
            ON {table}
            FOR INSERT
            WITH CHECK ({using});
    """)
    op.execute(f"""
        CREATE POLICY tenant_isolation_update
            ON {table}
            FOR UPDATE
            USING ({using})
            WITH CHECK ({using});
    """)
    op.execute(f"""
        CREATE POLICY tenant_isolation_delete
            ON {table}
            FOR DELETE
            USING ({using});
    """)


def upgrade() -> None:
    # ── Helper function: current_org_id() ────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION current_org_id()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        AS $$
            SELECT NULLIF(
                current_setting(
                    'app.current_organization_id', true
                ),
                ''
            )::uuid;
        $$;
    """)

    # ── organizations: special case (id, not organization_id) ──
    _enable_rls("organizations")
    _add_direct_policies("organizations", "id")

    # ── Tables with direct organization_id ───────────
    for table in _DIRECT_ORG_TABLES:
        _enable_rls(table)
        _add_direct_policies(table, "organization_id")

    # ── Tables scoped via dataset_id ─────────────────
    for table in _INDIRECT_ORG_TABLES:
        _enable_rls(table)
        _add_indirect_policies(table)


def downgrade() -> None:
    _all_tables = [
        "organizations",
        *_DIRECT_ORG_TABLES,
        *_INDIRECT_ORG_TABLES,
    ]

    for table in _all_tables:
        for policy in _ALL_POLICY_NAMES:
            op.execute(f"""
                DROP POLICY IF EXISTS {policy}
                    ON {table};
            """)
        op.execute(f"""
            ALTER TABLE {table}
                DISABLE ROW LEVEL SECURITY;
        """)

    op.execute("""
        DROP FUNCTION IF EXISTS current_org_id();
    """)
