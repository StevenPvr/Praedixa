"""Add explicit capacity curves for forecast visualizations.

Revision ID: 018
Revises: 017
Create Date: 2026-02-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "018"
down_revision: str | None = "017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "daily_forecasts",
        sa.Column("capacity_planned_current", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "daily_forecasts",
        sa.Column("capacity_planned_predicted", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "daily_forecasts",
        sa.Column("capacity_optimal_predicted", sa.Numeric(10, 2), nullable=True),
    )

    op.execute(
        """
        UPDATE daily_forecasts
        SET capacity_planned_current = predicted_capacity,
            capacity_planned_predicted = predicted_capacity,
            capacity_optimal_predicted = GREATEST(predicted_demand, predicted_capacity)
        WHERE capacity_planned_current IS NULL
           OR capacity_planned_predicted IS NULL
           OR capacity_optimal_predicted IS NULL
        """
    )

    op.alter_column(
        "daily_forecasts",
        "capacity_planned_current",
        existing_type=sa.Numeric(10, 2),
        nullable=False,
    )
    op.alter_column(
        "daily_forecasts",
        "capacity_planned_predicted",
        existing_type=sa.Numeric(10, 2),
        nullable=False,
    )
    op.alter_column(
        "daily_forecasts",
        "capacity_optimal_predicted",
        existing_type=sa.Numeric(10, 2),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("daily_forecasts", "capacity_optimal_predicted")
    op.drop_column("daily_forecasts", "capacity_planned_predicted")
    op.drop_column("daily_forecasts", "capacity_planned_current")
