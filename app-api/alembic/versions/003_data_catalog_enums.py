"""Data Catalog enumerated types.

Revision ID: 003
Revises: 002
Create Date: 2026-02-06

Creates PostgreSQL enums used by the Data Foundation catalog tables.
Values are lowercase (matching sa_enum() convention).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Dataset status lifecycle
    op.execute(
        "CREATE TYPE datasetstatus AS ENUM "
        "('pending', 'active', 'migrating', 'archived')"
    )
    # Ingestion mode
    op.execute("CREATE TYPE ingestionmode AS ENUM ('incremental', 'full_refit')")
    # Ingestion run status
    op.execute("CREATE TYPE runstatus AS ENUM ('running', 'success', 'failed')")
    # Column data type
    op.execute(
        "CREATE TYPE columndtype AS ENUM "
        "('float', 'integer', 'date', 'category', 'boolean', 'text')"
    )
    # Column role
    op.execute(
        "CREATE TYPE columnrole AS ENUM "
        "('target', 'feature', 'temporal_index', 'group_by', 'id', 'meta')"
    )


def downgrade() -> None:
    for enum_name in [
        "columnrole",
        "columndtype",
        "runstatus",
        "ingestionmode",
        "datasetstatus",
    ]:
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
