"""Add quality_reports table for data quality pipeline.

Revision ID: 009
Revises: 008
Create Date: 2026-02-07

Stores per-ingestion quality metrics (dedup, missing values, outliers) and
per-column analysis detail in JSONB. Scoped by dataset_id FK CASCADE.

Security notes:
- column_details JSONB stores server-computed ColumnReport dicts — never client input.
- strategy_config records the QualityConfig used, for audit reproducibility.
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op

# revision identifiers, used by Alembic.
revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "quality_reports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "dataset_id",
            UUID(as_uuid=True),
            sa.ForeignKey("client_datasets.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "ingestion_log_id",
            UUID(as_uuid=True),
            sa.ForeignKey("ingestion_log.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("rows_received", sa.Integer(), nullable=False),
        sa.Column("rows_after_dedup", sa.Integer(), nullable=False),
        sa.Column("rows_after_quality", sa.Integer(), nullable=False),
        sa.Column("duplicates_found", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "missing_values_found", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "missing_values_imputed", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("outliers_found", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("outliers_clamped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("column_details", JSONB(), nullable=False),
        sa.Column("strategy_config", JSONB(), nullable=False),
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


def downgrade() -> None:
    op.drop_table("quality_reports")
