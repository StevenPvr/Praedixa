"""Add site_id column to users table for site-level access control.

Users can be assigned to a specific site. When site_id is set, the user
only sees data from that site. When NULL (org_admin), the user sees all
sites in the organization.

Revision ID: 015
Revises: 014
Create Date: 2026-02-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "015"
down_revision: str | None = "014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "site_id",
            UUID(as_uuid=True),
            sa.ForeignKey("sites.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_users_organization_id_site_id",
        "users",
        ["organization_id", "site_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_organization_id_site_id", table_name="users")
    op.drop_column("users", "site_id")
