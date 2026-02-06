"""PostgreSQL role architecture for multi-tenant data foundation.

Revision ID: 006
Revises: 005
Create Date: 2026-02-06

Creates the complete role hierarchy:
- praedixa_owner (NOLOGIN): owns all schemas and tables
- Group roles (NOLOGIN): define permission boundaries
- Login roles: inherit from group roles for least-privilege access

Security notes:
- Uses DO $$ IF NOT EXISTS for idempotency (safe to re-run).
- NOLOGIN group roles cannot authenticate directly.
- ALTER DEFAULT PRIVILEGES scoped to praedixa_owner ensures newly
  created tables automatically inherit correct grants.
- Platform schema grants are applied for the data catalog tables.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Owner role ───────────────────────────────────
    # Owns all schemas and tables. Ensures ALTER DEFAULT PRIVILEGES
    # works predictably (only applies to objects created by owner).
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_owner'
            ) THEN
                CREATE ROLE praedixa_owner NOLOGIN;
            END IF;
        END $$;
    """)

    # ── Group roles (permission boundaries) ──────────
    _group_roles = [
        "praedixa_platform_reader",
        "praedixa_platform_writer",
        "praedixa_catalog_reader",
        "praedixa_catalog_writer",
        "praedixa_client_raw_reader",
        "praedixa_client_transformed_reader",
        "praedixa_transform_engine",
        "praedixa_ingestion",
        "praedixa_provisioner",
        "praedixa_migrator",
        "praedixa_audit_writer",
    ]
    for role in _group_roles:
        op.execute(f"""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT FROM pg_catalog.pg_roles
                    WHERE rolname = '{role}'
                ) THEN
                    CREATE ROLE {role} NOLOGIN;
                END IF;
            END $$;
        """)  # nosec B608 — role names are hardcoded constants

    # ── Login roles ──────────────────────────────────

    # praedixa_api: standard API access (reads platform, raw data)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_api'
            ) THEN
                CREATE ROLE praedixa_api LOGIN;
            END IF;
        END $$;
    """)
    op.execute("GRANT praedixa_platform_reader TO praedixa_api")
    op.execute("GRANT praedixa_platform_writer TO praedixa_api")
    op.execute("GRANT praedixa_client_raw_reader TO praedixa_api")
    op.execute("GRANT praedixa_audit_writer TO praedixa_api")

    # praedixa_api_admin: admin API (also reads transformed)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_api_admin'
            ) THEN
                CREATE ROLE praedixa_api_admin LOGIN;
            END IF;
        END $$;
    """)
    op.execute("GRANT praedixa_platform_reader TO praedixa_api_admin")
    op.execute("GRANT praedixa_platform_writer TO praedixa_api_admin")
    op.execute("GRANT praedixa_client_raw_reader TO praedixa_api_admin")
    op.execute("GRANT praedixa_client_transformed_reader TO praedixa_api_admin")
    op.execute("GRANT praedixa_audit_writer TO praedixa_api_admin")

    # praedixa_etl: transform engine (reads raw, writes transformed)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_etl'
            ) THEN
                CREATE ROLE praedixa_etl LOGIN;
            END IF;
        END $$;
    """)
    op.execute("GRANT praedixa_transform_engine TO praedixa_etl")
    op.execute("GRANT praedixa_catalog_reader TO praedixa_etl")
    op.execute("GRANT praedixa_catalog_writer TO praedixa_etl")
    op.execute("GRANT praedixa_audit_writer TO praedixa_etl")

    # praedixa_ingest: data ingestion (writes raw only)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_ingest'
            ) THEN
                CREATE ROLE praedixa_ingest LOGIN;
            END IF;
        END $$;
    """)
    op.execute("GRANT praedixa_ingestion TO praedixa_ingest")
    op.execute("GRANT praedixa_audit_writer TO praedixa_ingest")

    # praedixa_provision: schema provisioning (DDL)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_provision'
            ) THEN
                CREATE ROLE praedixa_provision LOGIN;
            END IF;
        END $$;
    """)
    op.execute("""
        GRANT praedixa_provisioner TO praedixa_provision;
    """)

    # praedixa_migrate: Alembic migrations
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_migrate'
            ) THEN
                CREATE ROLE praedixa_migrate LOGIN;
            END IF;
        END $$;
    """)
    op.execute("""
        GRANT praedixa_migrator TO praedixa_migrate;
    """)

    # praedixa_support: read-only support access
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_support'
            ) THEN
                CREATE ROLE praedixa_support LOGIN;
            END IF;
        END $$;
    """)
    op.execute("GRANT praedixa_platform_reader TO praedixa_support")
    op.execute("GRANT praedixa_client_raw_reader TO praedixa_support")
    op.execute("GRANT praedixa_client_transformed_reader TO praedixa_support")

    # ── Platform schema ownership + grants ───────────
    # Transfer platform schema ownership to praedixa_owner.
    # The schema must already exist (created in migration 004).
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT FROM information_schema.schemata
                WHERE schema_name = 'platform'
            ) THEN
                ALTER SCHEMA platform OWNER TO praedixa_owner;
            END IF;
        END $$;
    """)

    # Grant USAGE on platform schema (if it exists — tables may
    # be in public schema depending on deployment)
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT FROM information_schema.schemata
                WHERE schema_name = 'platform'
            ) THEN
                GRANT USAGE ON SCHEMA platform
                    TO praedixa_platform_reader,
                       praedixa_platform_writer,
                       praedixa_catalog_reader,
                       praedixa_catalog_writer,
                       praedixa_audit_writer;

                ALTER DEFAULT PRIVILEGES
                    FOR ROLE praedixa_owner IN SCHEMA platform
                    GRANT SELECT ON TABLES
                    TO praedixa_platform_reader;

                ALTER DEFAULT PRIVILEGES
                    FOR ROLE praedixa_owner IN SCHEMA platform
                    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
                    TO praedixa_platform_writer;

                ALTER DEFAULT PRIVILEGES
                    FOR ROLE praedixa_owner IN SCHEMA platform
                    GRANT SELECT ON TABLES
                    TO praedixa_catalog_reader;

                ALTER DEFAULT PRIVILEGES
                    FOR ROLE praedixa_owner IN SCHEMA platform
                    GRANT INSERT ON TABLES
                    TO praedixa_catalog_writer;

                ALTER DEFAULT PRIVILEGES
                    FOR ROLE praedixa_owner IN SCHEMA platform
                    GRANT INSERT ON TABLES
                    TO praedixa_audit_writer;
            END IF;
        END $$;
    """)

    # ── Grant SELECT on existing platform tables ─────
    # For tables that already exist before default privileges
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT FROM information_schema.schemata
                WHERE schema_name = 'platform'
            ) THEN
                GRANT SELECT ON ALL TABLES IN SCHEMA platform
                    TO praedixa_platform_reader;
                GRANT SELECT, INSERT, UPDATE, DELETE
                    ON ALL TABLES IN SCHEMA platform
                    TO praedixa_platform_writer;
                GRANT SELECT ON ALL TABLES IN SCHEMA platform
                    TO praedixa_catalog_reader;
            END IF;
        END $$;
    """)

    # ── Transfer ownership of existing tables ───────
    # All 16 tables (11 from migration 001 + 5 from migration 004)
    # must be owned by praedixa_owner so that ALTER DEFAULT
    # PRIVILEGES applies consistently.
    _public_tables = [
        # Migration 001 — core domain tables
        "organizations",
        "sites",
        "departments",
        "users",
        "employees",
        "absences",
        "forecast_runs",
        "daily_forecasts",
        "decisions",
        "dashboard_alerts",
        "action_plans",
        # Migration 004 — data catalog tables
        "client_datasets",
        "dataset_columns",
        "fit_parameters",
        "ingestion_log",
        "pipeline_config_history",
    ]
    for table in _public_tables:
        op.execute(
            f"ALTER TABLE IF EXISTS {table}"
            " OWNER TO praedixa_owner;"
        )

    # ── Public schema ownership + grants ────────────
    # Transfer public schema ownership to praedixa_owner.
    op.execute(
        "ALTER SCHEMA public OWNER TO praedixa_owner;"
    )

    # Default privileges for public schema (same pattern
    # as platform schema above).
    op.execute("""
        ALTER DEFAULT PRIVILEGES
            FOR ROLE praedixa_owner
            IN SCHEMA public
        GRANT SELECT ON TABLES
            TO praedixa_platform_reader;
    """)

    op.execute("""
        ALTER DEFAULT PRIVILEGES
            FOR ROLE praedixa_owner
            IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
            TO praedixa_platform_writer;
    """)

    # Grant on existing public tables
    op.execute(
        "GRANT SELECT ON ALL TABLES IN SCHEMA public"
        " TO praedixa_platform_reader"
    )
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE"
        " ON ALL TABLES IN SCHEMA public"
        " TO praedixa_platform_writer"
    )


def downgrade() -> None:
    # Revoke grants and drop roles in reverse order.
    # Login roles first, then group roles, then owner.
    _login_roles = [
        "praedixa_support",
        "praedixa_migrate",
        "praedixa_provision",
        "praedixa_ingest",
        "praedixa_etl",
        "praedixa_api_admin",
        "praedixa_api",
    ]
    _group_roles = [
        "praedixa_audit_writer",
        "praedixa_migrator",
        "praedixa_provisioner",
        "praedixa_ingestion",
        "praedixa_transform_engine",
        "praedixa_client_transformed_reader",
        "praedixa_client_raw_reader",
        "praedixa_catalog_writer",
        "praedixa_catalog_reader",
        "praedixa_platform_writer",
        "praedixa_platform_reader",
    ]

    # Revoke public schema default privileges + grants
    op.execute("""
        ALTER DEFAULT PRIVILEGES
            FOR ROLE praedixa_owner
            IN SCHEMA public
        REVOKE ALL ON TABLES
            FROM praedixa_platform_reader,
                 praedixa_platform_writer;
    """)

    # Revoke platform schema default privileges
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT FROM information_schema.schemata
                WHERE schema_name = 'platform'
            ) THEN
                ALTER DEFAULT PRIVILEGES
                    FOR ROLE praedixa_owner
                    IN SCHEMA platform
                REVOKE ALL ON TABLES
                    FROM praedixa_platform_reader,
                         praedixa_platform_writer,
                         praedixa_catalog_reader,
                         praedixa_catalog_writer,
                         praedixa_audit_writer;
            END IF;
        END $$;
    """)

    for role in _login_roles:
        op.execute(f"""
            DO $$ BEGIN
                IF EXISTS (
                    SELECT FROM pg_catalog.pg_roles
                    WHERE rolname = '{role}'
                ) THEN
                    DROP ROLE {role};
                END IF;
            END $$;
        """)  # nosec B608 — role names are hardcoded constants

    for role in _group_roles:
        op.execute(f"""
            DO $$ BEGIN
                IF EXISTS (
                    SELECT FROM pg_catalog.pg_roles
                    WHERE rolname = '{role}'
                ) THEN
                    DROP ROLE {role};
                END IF;
            END $$;
        """)  # nosec B608 — role names are hardcoded constants

    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_owner'
            ) THEN
                DROP ROLE praedixa_owner;
            END IF;
        END $$;
    """)
