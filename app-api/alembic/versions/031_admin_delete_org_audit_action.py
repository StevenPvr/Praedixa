"""Add delete_org to the admin audit action enum.

Revision ID: 031_admin_delete_org
Revises: 030_admin_actor_auth_fallback
Create Date: 2026-03-19 03:55:00.000000
"""

from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "031_admin_delete_org"
down_revision: str | Sequence[str] | None = "030_admin_actor_auth_fallback"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE adminauditaction ADD VALUE IF NOT EXISTS 'delete_org'")


def downgrade() -> None:
    # PostgreSQL enums cannot drop individual values safely.
    pass
