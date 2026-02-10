"""Remove orphan models: action_plans, absences, employees.

These tables were part of the initial schema but are not used by any
router, service, or frontend. Dropping them reduces schema complexity.

Revision ID: 019
Revises: 018
Create Date: 2026-02-10
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "019"
down_revision: str = "018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop tables (CASCADE handles FK constraints)
    op.execute("DROP TABLE IF EXISTS absences CASCADE")
    op.execute("DROP TABLE IF EXISTS action_plans CASCADE")
    op.execute("DROP TABLE IF EXISTS employees CASCADE")

    # Drop associated PostgreSQL ENUM types
    op.execute("DROP TYPE IF EXISTS absencetype CASCADE")
    op.execute("DROP TYPE IF EXISTS absencecategory CASCADE")
    op.execute("DROP TYPE IF EXISTS absencestatus CASCADE")
    op.execute("DROP TYPE IF EXISTS dayportion CASCADE")
    op.execute("DROP TYPE IF EXISTS actionplanstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS employmentstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS employmenttype CASCADE")
    op.execute("DROP TYPE IF EXISTS contracttype CASCADE")
    op.execute("DROP TYPE IF EXISTS employeestatus CASCADE")


def downgrade() -> None:
    # These tables can be recreated from migration 001 if needed.
    # Intentionally left empty — this is an irreversible cleanup migration.
    pass
