"""Add FILE_UPLOAD ingestion mode and file metadata columns.

Revision ID: 008
Revises: 007
Create Date: 2026-02-07

Adds 'file_upload' value to the ingestionmode enum and adds file_name /
file_size columns to the ingestion_log table for upload audit trail.

Security notes:
- file_name is server-sanitized (os.path.basename) before storage.
- file_size is set server-side from actual bytes length, never from client.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'file_upload' to the ingestionmode enum.
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block,
    # so we execute it outside the default transaction.
    op.execute("COMMIT")
    op.execute("ALTER TYPE ingestionmode ADD VALUE IF NOT EXISTS 'file_upload'")
    op.execute("BEGIN")

    # Add file metadata columns to ingestion_log.
    op.add_column(
        "ingestion_log",
        sa.Column("file_name", sa.String(255), nullable=True),
    )
    op.add_column(
        "ingestion_log",
        sa.Column("file_size", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ingestion_log", "file_size")
    op.drop_column("ingestion_log", "file_name")
    # Note: PostgreSQL does not support removing values from an enum type.
    # The 'file_upload' value will remain in the enum after downgrade.
