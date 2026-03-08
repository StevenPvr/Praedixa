"""Integration platform foundation schema and RLS policies.

Revision ID: 026
Revises: 597a0ce523b5
Create Date: 2026-03-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "026"
down_revision: str | None = "597a0ce523b5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_TABLES_WITH_DIRECT_ORG = [
    "integration_connections",
    "integration_sync_runs",
    "integration_sync_state",
    "integration_raw_events",
    "integration_field_mappings",
    "integration_error_events",
    "integration_dead_letter_queue",
    "integration_webhook_receipts",
    "integration_audit_events",
]


def _create_enum_types() -> None:
    op.execute(
        "CREATE TYPE integrationvendor AS ENUM ("
        "'salesforce','ukg','toast','olo','cdk','reynolds','geotab',"
        "'fourth','oracle_tm','sap_tm','blue_yonder','manhattan','ncr_aloha')"
    )
    op.execute(
        "CREATE TYPE integrationauthmode AS ENUM "
        "('oauth2','api_key','service_account','sftp')"
    )
    op.execute(
        "CREATE TYPE integrationconnectionstatus AS ENUM "
        "('pending','active','disabled','needs_attention')"
    )
    op.execute(
        "CREATE TYPE integrationsynctriggertype AS ENUM "
        "('schedule','manual','webhook','backfill','replay')"
    )
    op.execute(
        "CREATE TYPE integrationsyncstatus AS ENUM "
        "('queued','running','success','failed','canceled')"
    )
    op.execute(
        "CREATE TYPE integrationerrorclass AS ENUM "
        "('auth','rate_limit','transient','permanent','mapping',"
        "'validation','provider','system')"
    )
    op.execute(
        "CREATE TYPE deadletterstatus AS ENUM ('pending','requeued','discarded')"
    )


def _drop_enum_types() -> None:
    op.execute("DROP TYPE IF EXISTS deadletterstatus")
    op.execute("DROP TYPE IF EXISTS integrationerrorclass")
    op.execute("DROP TYPE IF EXISTS integrationsyncstatus")
    op.execute("DROP TYPE IF EXISTS integrationsynctriggertype")
    op.execute("DROP TYPE IF EXISTS integrationconnectionstatus")
    op.execute("DROP TYPE IF EXISTS integrationauthmode")
    op.execute("DROP TYPE IF EXISTS integrationvendor")


def _enable_rls_with_bypass(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
    cond = (
        "(organization_id = current_org_id() "
        "OR current_setting('app.bypass_rls', true) = 'true')"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_select ON {table} FOR SELECT USING ({cond})"
    )
    op.execute(
        "CREATE POLICY tenant_isolation_insert "
        f"ON {table} FOR INSERT WITH CHECK (organization_id = current_org_id())"
    )
    op.execute(
        "CREATE POLICY tenant_isolation_update "
        f"ON {table} FOR UPDATE "
        "USING (organization_id = current_org_id()) "
        "WITH CHECK (organization_id = current_org_id())"
    )
    op.execute(
        "CREATE POLICY tenant_isolation_delete "
        f"ON {table} FOR DELETE USING (organization_id = current_org_id())"
    )


def _drop_rls_policies(table: str) -> None:
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation_select ON {table}")
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation_insert ON {table}")
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation_update ON {table}")
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation_delete ON {table}")


def upgrade() -> None:
    _create_enum_types()

    op.create_table(
        "integration_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "vendor",
            postgresql.ENUM(name="integrationvendor", create_type=False),
            nullable=False,
        ),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="integrationconnectionstatus", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "auth_mode",
            postgresql.ENUM(name="integrationauthmode", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "config_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("secret_ref", sa.String(length=255), nullable=True),
        sa.Column("secret_version", sa.Integer(), nullable=True),
        sa.Column("oauth_scopes", sa.Text(), nullable=True),
        sa.Column("base_url", sa.Text(), nullable=True),
        sa.Column("external_account_id", sa.String(length=255), nullable=True),
        sa.Column(
            "sync_interval_minutes", sa.Integer(), nullable=False, server_default="30"
        ),
        sa.Column(
            "webhook_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("next_scheduled_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_successful_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_tested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disabled_reason", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "vendor",
            "display_name",
            name="uq_integration_conn_org_vendor_name",
        ),
    )
    op.create_index(
        "ix_integration_conn_org_vendor_status",
        "integration_connections",
        ["organization_id", "vendor", "status"],
        unique=False,
    )

    op.create_table(
        "integration_sync_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "trigger_type",
            postgresql.ENUM(name="integrationsynctriggertype", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(name="integrationsyncstatus", create_type=False),
            nullable=False,
            server_default="queued",
        ),
        sa.Column("priority", sa.SmallInteger(), nullable=False, server_default="50"),
        sa.Column(
            "available_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="8"),
        sa.Column("idempotency_key", sa.String(length=120), nullable=False),
        sa.Column("locked_by", sa.String(length=120), nullable=True),
        sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_window_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_window_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("records_fetched", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_written", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "error_class",
            postgresql.ENUM(name="integrationerrorclass", create_type=False),
            nullable=True,
        ),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("error_message_redacted", sa.String(length=400), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column(
            "scope_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["connection_id"], ["integration_connections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "connection_id",
            "idempotency_key",
            name="uq_integration_sync_runs_idempotency",
        ),
    )
    op.create_index(
        "ix_integration_sync_runs_queue",
        "integration_sync_runs",
        ["status", "available_at", "priority"],
        unique=False,
    )
    op.create_index(
        "ix_integration_sync_runs_org_status_created",
        "integration_sync_runs",
        ["organization_id", "status", "created_at"],
        unique=False,
    )

    op.create_table(
        "integration_sync_state",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_object", sa.String(length=120), nullable=False),
        sa.Column("watermark_text", sa.String(length=255), nullable=True),
        sa.Column("watermark_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "cursor_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("last_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_worker", sa.String(length=80), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["connection_id"], ["integration_connections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["last_run_id"], ["integration_sync_runs.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "connection_id",
            "source_object",
            name="uq_integration_sync_state_conn_object",
        ),
    )

    op.create_table(
        "integration_raw_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sync_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source_object", sa.String(length=120), nullable=False),
        sa.Column("source_record_id", sa.String(length=255), nullable=False),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("event_id", sa.String(length=128), nullable=False),
        sa.Column("payload_sha256", sa.String(length=64), nullable=False),
        sa.Column("object_store_key", sa.Text(), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "replayed", sa.Boolean(), nullable=False, server_default=sa.text("false")
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["connection_id"], ["integration_connections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["sync_run_id"], ["integration_sync_runs.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "connection_id",
            "event_id",
            name="uq_integration_raw_events_conn_event",
        ),
    )
    op.create_index(
        "ix_integration_raw_events_conn_object_updated",
        "integration_raw_events",
        ["connection_id", "source_object", "source_updated_at"],
        unique=False,
    )

    op.create_table(
        "integration_field_mappings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_object", sa.String(length=120), nullable=False),
        sa.Column("mapping_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "active", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "fields_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["connection_id"], ["integration_connections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "connection_id",
            "source_object",
            "mapping_version",
            name="uq_integration_field_map_version",
        ),
    )

    op.create_table(
        "integration_error_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sync_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "error_class",
            postgresql.ENUM(name="integrationerrorclass", create_type=False),
            nullable=False,
        ),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("message_redacted", sa.Text(), nullable=False),
        sa.Column(
            "details_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["connection_id"], ["integration_connections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["sync_run_id"], ["integration_sync_runs.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_integration_error_events_conn_occurred",
        "integration_error_events",
        ["connection_id", "occurred_at"],
        unique=False,
    )

    op.create_table(
        "integration_dead_letter_queue",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sync_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_id", sa.String(length=128), nullable=True),
        sa.Column("reason_code", sa.String(length=80), nullable=False),
        sa.Column("payload_ref", sa.Text(), nullable=True),
        sa.Column(
            "snapshot_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "status",
            postgresql.ENUM(name="deadletterstatus", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("requeue_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["connection_id"], ["integration_connections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["sync_run_id"], ["integration_sync_runs.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_integration_dlq_conn_status_created",
        "integration_dead_letter_queue",
        ["connection_id", "status", "created_at"],
        unique=False,
    )

    op.create_table(
        "integration_webhook_receipts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "vendor",
            postgresql.ENUM(name="integrationvendor", create_type=False),
            nullable=False,
        ),
        sa.Column("signature_id", sa.String(length=255), nullable=False),
        sa.Column(
            "signature_valid",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("payload_sha256", sa.String(length=64), nullable=False),
        sa.Column("response_code", sa.Integer(), nullable=False),
        sa.Column(
            "processed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("sync_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["connection_id"], ["integration_connections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["sync_run_id"], ["integration_sync_runs.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "connection_id",
            "signature_id",
            name="uq_integration_webhook_signature_id",
        ),
    )

    op.create_table(
        "integration_audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_service", sa.String(length=80), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=200), nullable=True),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["connection_id"], ["integration_connections.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_integration_audit_conn_created",
        "integration_audit_events",
        ["connection_id", "created_at"],
        unique=False,
    )

    for table in _TABLES_WITH_DIRECT_ORG:
        _enable_rls_with_bypass(table)


def downgrade() -> None:
    for table in _TABLES_WITH_DIRECT_ORG:
        _drop_rls_policies(table)
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.drop_index(
        "ix_integration_audit_conn_created", table_name="integration_audit_events"
    )
    op.drop_table("integration_audit_events")

    op.drop_table("integration_webhook_receipts")

    op.drop_index(
        "ix_integration_dlq_conn_status_created",
        table_name="integration_dead_letter_queue",
    )
    op.drop_table("integration_dead_letter_queue")

    op.drop_index(
        "ix_integration_error_events_conn_occurred",
        table_name="integration_error_events",
    )
    op.drop_table("integration_error_events")

    op.drop_table("integration_field_mappings")

    op.drop_index(
        "ix_integration_raw_events_conn_object_updated",
        table_name="integration_raw_events",
    )
    op.drop_table("integration_raw_events")

    op.drop_table("integration_sync_state")

    op.drop_index(
        "ix_integration_sync_runs_org_status_created",
        table_name="integration_sync_runs",
    )
    op.drop_index("ix_integration_sync_runs_queue", table_name="integration_sync_runs")
    op.drop_table("integration_sync_runs")

    op.drop_index(
        "ix_integration_conn_org_vendor_status",
        table_name="integration_connections",
    )
    op.drop_table("integration_connections")

    _drop_enum_types()
