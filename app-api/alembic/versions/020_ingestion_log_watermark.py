"""Add processed ingestion watermark to ingestion_log.

Revision ID: 020
Revises: 019
Create Date: 2026-02-10
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "020"
down_revision: str | None = "019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ingestion_log",
        sa.Column("ingested_watermark_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_ingestion_log_dataset_watermark",
        "ingestion_log",
        ["dataset_id", "ingested_watermark_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ingestion_log_dataset_watermark", table_name="ingestion_log")
    op.drop_column("ingestion_log", "ingested_watermark_at")
