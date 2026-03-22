"""Lock onboarding workflow provider to Camunda.

Revision ID: 029_onboarding_camunda_only
Revises: 028
Create Date: 2026-03-18 15:20:00.000000
"""

from collections.abc import Sequence

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

# revision identifiers, used by Alembic.
revision: str = "029_onboarding_camunda_only"
down_revision: str | Sequence[str] | None = "028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE onboarding_cases
        SET workflow_provider = 'camunda'
        WHERE workflow_provider = 'local_projection'
        """
    )
    with op.batch_alter_table("onboarding_cases") as batch_op:
        batch_op.drop_constraint(
            "ck_onboarding_cases_workflow_provider",
            type_="check",
        )
        batch_op.create_check_constraint(
            "ck_onboarding_cases_workflow_provider",
            "workflow_provider = 'camunda'",
        )


def downgrade() -> None:
    with op.batch_alter_table("onboarding_cases") as batch_op:
        batch_op.drop_constraint(
            "ck_onboarding_cases_workflow_provider",
            type_="check",
        )
        batch_op.create_check_constraint(
            "ck_onboarding_cases_workflow_provider",
            "workflow_provider IN ('camunda','local_projection')",
        )
