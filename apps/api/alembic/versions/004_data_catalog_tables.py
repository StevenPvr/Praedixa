"""Data Catalog tables — Data Foundation platform schema.

Revision ID: 004
Revises: 003
Create Date: 2026-02-06

Creates the 5 catalog tables: client_datasets, dataset_columns,
fit_parameters, ingestion_log, pipeline_config_history.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- client_datasets ---
    op.create_table(
        "client_datasets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("schema_raw", sa.String(255), nullable=False),
        sa.Column("schema_transformed", sa.String(255), nullable=False),
        sa.Column("table_name", sa.String(255), nullable=False),
        sa.Column("temporal_index", sa.String(255), nullable=False),
        sa.Column(
            "group_by",
            postgresql.ARRAY(sa.String(255)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "pipeline_config",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "pending", "active", "migrating", "archived",
                name="datasetstatus",
                create_type=False,
            ),
        ),
        sa.Column("metadata_hash", sa.String(64)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id", "name", name="uq_client_datasets_org_name"
        ),
    )
    op.create_index(
        "ix_client_datasets_organization_id",
        "client_datasets",
        ["organization_id"],
    )

    # --- dataset_columns ---
    op.create_table(
        "dataset_columns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "dataset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("client_datasets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "dtype",
            postgresql.ENUM(
                "float", "integer", "date", "category", "boolean", "text",
                name="columndtype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "role",
            postgresql.ENUM(
                "target", "feature", "temporal_index", "group_by", "id", "meta",
                name="columnrole",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "nullable", sa.Boolean, nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("rules_override", postgresql.JSONB),
        sa.Column("ordinal_position", sa.Integer, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "dataset_id", "name", name="uq_dataset_columns_dataset_name"
        ),
        sa.UniqueConstraint(
            "dataset_id",
            "ordinal_position",
            name="uq_dataset_columns_dataset_ordinal",
        ),
    )
    op.create_index(
        "ix_dataset_columns_dataset_id",
        "dataset_columns",
        ["dataset_id"],
    )

    # --- fit_parameters ---
    op.create_table(
        "fit_parameters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "dataset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("client_datasets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("column_name", sa.String(255), nullable=False),
        sa.Column("transform_type", sa.String(100), nullable=False),
        sa.Column("parameters", postgresql.JSONB, nullable=False),
        sa.Column("hmac_sha256", sa.String(128)),
        sa.Column("fitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("row_count", sa.Integer, nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "is_active",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "dataset_id",
            "column_name",
            "transform_type",
            "version",
            name="uq_fit_params_dataset_col_transform_ver",
        ),
        sa.CheckConstraint("version >= 1", name="ck_fit_parameters_version_min"),
    )
    op.create_index(
        "ix_fit_parameters_dataset_id",
        "fit_parameters",
        ["dataset_id"],
    )
    # Partial index for active params lookup
    op.create_index(
        "ix_fit_parameters_active",
        "fit_parameters",
        ["dataset_id"],
        postgresql_where=sa.text("is_active"),
    )

    # --- ingestion_log ---
    op.create_table(
        "ingestion_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "dataset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("client_datasets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "mode",
            postgresql.ENUM(
                "incremental", "full_refit",
                name="ingestionmode",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("rows_received", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "rows_transformed", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column(
            "status",
            postgresql.ENUM(
                "running", "success", "failed",
                name="runstatus",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("error_message", sa.Text),
        sa.Column("triggered_by", sa.String(100)),
        sa.Column("request_id", sa.String(255)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_ingestion_log_dataset_id",
        "ingestion_log",
        ["dataset_id"],
    )
    op.create_index(
        "ix_ingestion_log_dataset_started",
        "ingestion_log",
        ["dataset_id", sa.text("started_at DESC")],
    )
    op.create_index(
        "ix_ingestion_log_status_started",
        "ingestion_log",
        ["status", sa.text("started_at DESC")],
    )

    # --- pipeline_config_history ---
    op.create_table(
        "pipeline_config_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "dataset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("client_datasets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("config_snapshot", postgresql.JSONB, nullable=False),
        sa.Column("columns_snapshot", postgresql.JSONB, nullable=False),
        sa.Column(
            "changed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=False,
        ),
        sa.Column("change_reason", sa.Text),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_pipeline_config_history_dataset_id",
        "pipeline_config_history",
        ["dataset_id"],
    )
    op.create_index(
        "ix_pipeline_config_history_dataset_created",
        "pipeline_config_history",
        ["dataset_id", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_table("pipeline_config_history")
    op.drop_table("ingestion_log")
    op.drop_table("fit_parameters")
    op.drop_table("dataset_columns")
    op.drop_table("client_datasets")
