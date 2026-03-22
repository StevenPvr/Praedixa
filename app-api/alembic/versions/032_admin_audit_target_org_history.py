"""Keep admin audit target_org_id as a historical reference only.

Revision ID: 032_admin_audit_target_org
Revises: 031_admin_delete_org
Create Date: 2026-03-19 04:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

# revision identifiers, used by Alembic.
revision: str = "032_admin_audit_target_org"
down_revision: str | Sequence[str] | None = "031_admin_delete_org"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("admin_audit_log") as batch_op:
        batch_op.drop_constraint(
            "admin_audit_log_target_org_id_fkey",
            type_="foreignkey",
        )
        batch_op.alter_column(
            "target_org_id",
            existing_type=sa.UUID(),
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("admin_audit_log") as batch_op:
        batch_op.create_foreign_key(
            "admin_audit_log_target_org_id_fkey",
            "organizations",
            ["target_org_id"],
            ["id"],
            ondelete="SET NULL",
        )
