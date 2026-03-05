"""Grant CREATE on current database to praedixa_owner.

Revision ID: 597a0ce523b5
Revises: 025
Create Date: 2026-03-03 02:49:27.105704
"""

from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "597a0ce523b5"
down_revision: str | None = "025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_owner'
            ) THEN
                EXECUTE format(
                    'GRANT CREATE ON DATABASE %I TO praedixa_owner',
                    current_database()
                );
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT FROM pg_catalog.pg_roles
                WHERE rolname = 'praedixa_owner'
            ) THEN
                EXECUTE format(
                    'REVOKE CREATE ON DATABASE %I FROM praedixa_owner',
                    current_database()
                );
            END IF;
        END $$;
    """)
