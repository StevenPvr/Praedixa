"""Add view_features to adminauditaction enum.

Revision ID: 011
Revises: 010
Create Date: 2026-02-07

Adds the 'view_features' value to the adminauditaction enum type
to track when super_admins access the transformed features data.
"""

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

# revision identifiers, used by Alembic.
revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block
    # in PostgreSQL, but Alembic runs each migration in its own
    # transaction. We must commit the current transaction first.
    op.execute("COMMIT")
    op.execute("ALTER TYPE adminauditaction ADD VALUE IF NOT EXISTS 'view_features'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values.
    # The value will remain but be unused after downgrade.
    pass
