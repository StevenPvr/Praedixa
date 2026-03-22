"""Enable pgcrypto extension for gen_random_uuid().

Revision ID: 002
Revises: 001
Create Date: 2026-02-06

pgcrypto is required by dynamic raw/transformed tables
that use gen_random_uuid() as default for _row_id.
"""

from collections.abc import Sequence

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS pgcrypto")
