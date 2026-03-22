"""Rename users.supabase_user_id to users.auth_user_id.

Revision ID: 024
Revises: 023
Create Date: 2026-02-18
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

revision: str = "024"
down_revision: str | None = "023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "supabase_user_id",
        new_column_name="auth_user_id",
        existing_type=sa.String(length=255),
        existing_nullable=False,
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_users_supabase_user_id "
        "RENAME TO ix_users_auth_user_id"
    )


def downgrade() -> None:
    op.execute(
        "ALTER INDEX IF EXISTS ix_users_auth_user_id "
        "RENAME TO ix_users_supabase_user_id"
    )
    op.alter_column(
        "users",
        "auth_user_id",
        new_column_name="supabase_user_id",
        existing_type=sa.String(length=255),
        existing_nullable=False,
    )
