"""Allow admin audits and plan history to persist opaque auth actor ids.

Revision ID: 030_admin_actor_auth_fallback
Revises: 029_onboarding_camunda_only
Create Date: 2026-03-19 02:05:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "030_admin_actor_auth_fallback"
down_revision: str | Sequence[str] | None = "029_onboarding_camunda_only"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("admin_audit_log") as batch_op:
        batch_op.add_column(
            sa.Column("admin_auth_user_id", sa.String(length=64), nullable=True)
        )
        batch_op.alter_column(
            "admin_user_id",
            existing_type=sa.UUID(),
            nullable=True,
        )

    op.execute(
        """
        UPDATE admin_audit_log AS aal
        SET admin_auth_user_id = u.auth_user_id
        FROM users AS u
        WHERE aal.admin_user_id = u.id
          AND aal.admin_auth_user_id IS NULL
        """
    )

    with op.batch_alter_table("plan_change_history") as batch_op:
        batch_op.add_column(
            sa.Column(
                "changed_by_auth_user_id",
                sa.String(length=64),
                nullable=True,
            )
        )
        batch_op.alter_column(
            "changed_by",
            existing_type=sa.UUID(),
            nullable=True,
        )

    op.execute(
        """
        UPDATE plan_change_history AS pch
        SET changed_by_auth_user_id = u.auth_user_id
        FROM users AS u
        WHERE pch.changed_by = u.id
          AND pch.changed_by_auth_user_id IS NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM admin_audit_log
            WHERE admin_user_id IS NULL
              AND admin_auth_user_id IS NOT NULL
          ) THEN
            RAISE EXCEPTION
              'Cannot downgrade 030_admin_actor_auth_fallback while admin_audit_log contains auth-only actors';
          END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM plan_change_history
            WHERE changed_by IS NULL
              AND changed_by_auth_user_id IS NOT NULL
          ) THEN
            RAISE EXCEPTION
              'Cannot downgrade 030_admin_actor_auth_fallback while plan_change_history contains auth-only actors';
          END IF;
        END $$;
        """
    )

    with op.batch_alter_table("plan_change_history") as batch_op:
        batch_op.alter_column(
            "changed_by",
            existing_type=sa.UUID(),
            nullable=False,
        )
        batch_op.drop_column("changed_by_auth_user_id")

    with op.batch_alter_table("admin_audit_log") as batch_op:
        batch_op.alter_column(
            "admin_user_id",
            existing_type=sa.UUID(),
            nullable=False,
        )
        batch_op.drop_column("admin_auth_user_id")
