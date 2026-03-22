"""Add MLOps registry, inference jobs, artifact access logs, and lineage.

Revision ID: 025
Revises: 024
Create Date: 2026-02-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

NOW_SQL = "now()"
EMPTY_JSONB_OBJECT_SQL = "'{}'::jsonb"
ORGANIZATIONS_ID_REF = "organizations.id"
USERS_ID_REF = "users.id"
ON_DELETE_CASCADE = "CASCADE"
ON_DELETE_SET_NULL = "SET NULL"

revision: str = "025"
down_revision: str | None = "024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_POLICY_NAMES = (
    "tenant_isolation_select",
    "tenant_isolation_insert",
    "tenant_isolation_update",
    "tenant_isolation_delete",
)


def _drop_policies(table_name: str) -> None:
    for name in _POLICY_NAMES:
        op.execute(f"DROP POLICY IF EXISTS {name} ON {table_name}")


def _apply_direct_org_rls_with_bypass(table_name: str) -> None:
    op.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY")

    cond = "organization_id = current_org_id()"
    select_cond = "(" + cond + " OR current_setting('app.bypass_rls', true) = 'true')"

    op.execute(
        f"CREATE POLICY tenant_isolation_select ON {table_name} "
        f"FOR SELECT USING ({select_cond})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_insert ON {table_name} "
        f"FOR INSERT WITH CHECK ({cond})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_update ON {table_name} "
        f"FOR UPDATE USING ({cond}) WITH CHECK ({cond})"
    )
    op.execute(
        f"CREATE POLICY tenant_isolation_delete ON {table_name} "
        f"FOR DELETE USING ({cond})"
    )


def upgrade() -> None:
    # Extend admin audit action enum for MLOps operations.
    for value in (
        "model_register",
        "model_activate",
        "model_view",
        "inference_job_create",
        "inference_job_run",
        "inference_job_view",
    ):
        op.execute(f"ALTER TYPE adminauditaction ADD VALUE IF NOT EXISTS '{value}'")

    op.create_table(
        "model_registry",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_family", sa.String(length=80), nullable=False),
        sa.Column("version", sa.String(length=40), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'draft'"),
        ),
        sa.Column("artifact_uri", sa.Text(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("metadata_hmac", sa.String(length=64), nullable=False),
        sa.Column("onnx_opset", sa.Integer(), nullable=True),
        sa.Column(
            "features_schema_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(EMPTY_JSONB_OBJECT_SQL),
        ),
        sa.Column(
            "metrics_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(EMPTY_JSONB_OBJECT_SQL),
        ),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
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
            "status IN ('draft','active','archived','failed')",
            name="ck_model_registry_status",
        ),
        sa.CheckConstraint(
            "char_length(sha256) = 64",
            name="ck_model_registry_sha256_len",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            [ORGANIZATIONS_ID_REF],
            ondelete=ON_DELETE_CASCADE,
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            [USERS_ID_REF],
            ondelete=ON_DELETE_SET_NULL,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "model_family",
            "version",
            name="uq_model_registry_org_family_version",
        ),
    )
    op.create_index(
        "ix_model_registry_org_family_status",
        "model_registry",
        ["organization_id", "model_family", "status"],
        unique=False,
    )
    op.create_index(
        "uq_model_registry_active_per_family",
        "model_registry",
        ["organization_id", "model_family"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "model_inference_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_registry_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'queued'"),
        ),
        sa.Column(
            "scope_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(EMPTY_JSONB_OBJECT_SQL),
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("error_message_redacted", sa.String(length=400), nullable=True),
        sa.Column(
            "rows_in",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "rows_out",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("forecast_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=True),
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
            "status IN ('queued','running','completed','failed')",
            name="ck_model_inference_jobs_status",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            [ORGANIZATIONS_ID_REF],
            ondelete=ON_DELETE_CASCADE,
        ),
        sa.ForeignKeyConstraint(
            ["model_registry_id"],
            ["model_registry.id"],
            ondelete=ON_DELETE_SET_NULL,
        ),
        sa.ForeignKeyConstraint(
            ["forecast_run_id"],
            ["forecast_runs.id"],
            ondelete=ON_DELETE_SET_NULL,
        ),
        sa.ForeignKeyConstraint(
            ["requested_by"],
            [USERS_ID_REF],
            ondelete=ON_DELETE_SET_NULL,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_model_inference_jobs_org_status_created",
        "model_inference_jobs",
        ["organization_id", "status", "created_at"],
        unique=False,
    )

    op.create_table(
        "model_artifact_access_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_registry_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_service", sa.String(length=80), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(EMPTY_JSONB_OBJECT_SQL),
        ),
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
        sa.ForeignKeyConstraint(
            ["organization_id"],
            [ORGANIZATIONS_ID_REF],
            ondelete=ON_DELETE_CASCADE,
        ),
        sa.ForeignKeyConstraint(
            ["model_registry_id"],
            ["model_registry.id"],
            ondelete=ON_DELETE_CASCADE,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_model_artifact_access_org_model_created",
        "model_artifact_access_log",
        ["organization_id", "model_registry_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "data_lineage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_type", sa.String(length=40), nullable=False),
        sa.Column("source_ref", sa.String(length=255), nullable=False),
        sa.Column("target_type", sa.String(length=40), nullable=False),
        sa.Column("target_ref", sa.String(length=255), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(EMPTY_JSONB_OBJECT_SQL),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["organization_id"],
            [ORGANIZATIONS_ID_REF],
            ondelete=ON_DELETE_CASCADE,
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            [USERS_ID_REF],
            ondelete=ON_DELETE_SET_NULL,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_data_lineage_org_created",
        "data_lineage_events",
        ["organization_id", "created_at"],
        unique=False,
    )

    for table in (
        "model_registry",
        "model_inference_jobs",
        "model_artifact_access_log",
        "data_lineage_events",
    ):
        _drop_policies(table)
        _apply_direct_org_rls_with_bypass(table)


def downgrade() -> None:
    for table in (
        "data_lineage_events",
        "model_artifact_access_log",
        "model_inference_jobs",
        "model_registry",
    ):
        _drop_policies(table)

    op.drop_index("ix_data_lineage_org_created", table_name="data_lineage_events")
    op.drop_table("data_lineage_events")

    op.drop_index(
        "ix_model_artifact_access_org_model_created",
        table_name="model_artifact_access_log",
    )
    op.drop_table("model_artifact_access_log")

    op.drop_index(
        "ix_model_inference_jobs_org_status_created",
        table_name="model_inference_jobs",
    )
    op.drop_table("model_inference_jobs")

    op.drop_index("uq_model_registry_active_per_family", table_name="model_registry")
    op.drop_index("ix_model_registry_org_family_status", table_name="model_registry")
    op.drop_table("model_registry")

    # Enum values added to adminauditaction are intentionally not removed.
    # PostgreSQL enum value removal is non-trivial and unsafe for downgrade.
