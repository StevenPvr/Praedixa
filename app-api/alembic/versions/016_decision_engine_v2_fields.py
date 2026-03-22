"""Add decision engine v2 fields for risk-aware recommendations and proof.

Revision ID: 016
Revises: 015
Create Date: 2026-02-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

# revision identifiers, used by Alembic.
revision: str = "016"
down_revision: str | None = "015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # coverage_alerts
    op.add_column(
        "coverage_alerts",
        sa.Column("prediction_interval_low", sa.Numeric(8, 2), nullable=True),
    )
    op.add_column(
        "coverage_alerts",
        sa.Column("prediction_interval_high", sa.Numeric(8, 2), nullable=True),
    )
    op.add_column(
        "coverage_alerts",
        sa.Column("model_version", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "coverage_alerts",
        sa.Column("calibration_bucket", sa.String(length=30), nullable=True),
    )

    # scenario_options
    op.add_column(
        "scenario_options",
        sa.Column("feasibility_score", sa.Numeric(5, 4), nullable=True),
    )
    op.add_column(
        "scenario_options",
        sa.Column("risk_score", sa.Numeric(5, 4), nullable=True),
    )
    op.add_column(
        "scenario_options",
        sa.Column(
            "policy_compliance",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "scenario_options",
        sa.Column("dominance_reason", sa.String(length=300), nullable=True),
    )
    op.add_column(
        "scenario_options",
        sa.Column(
            "recommendation_policy_version",
            sa.String(length=100),
            nullable=True,
        ),
    )

    # operational_decisions
    op.add_column(
        "operational_decisions",
        sa.Column("override_category", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "operational_decisions",
        sa.Column("exogenous_event_tag", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "operational_decisions",
        sa.Column(
            "recommendation_policy_version",
            sa.String(length=100),
            nullable=True,
        ),
    )

    # proof_records
    op.add_column(
        "proof_records",
        sa.Column("capture_rate", sa.Numeric(6, 4), nullable=True),
    )
    op.add_column(
        "proof_records",
        sa.Column("bau_method_version", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "proof_records",
        sa.Column("attribution_confidence", sa.Numeric(5, 4), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("proof_records", "attribution_confidence")
    op.drop_column("proof_records", "bau_method_version")
    op.drop_column("proof_records", "capture_rate")

    op.drop_column("operational_decisions", "recommendation_policy_version")
    op.drop_column("operational_decisions", "exogenous_event_tag")
    op.drop_column("operational_decisions", "override_category")

    op.drop_column("scenario_options", "recommendation_policy_version")
    op.drop_column("scenario_options", "dominance_reason")
    op.drop_column("scenario_options", "policy_compliance")
    op.drop_column("scenario_options", "risk_score")
    op.drop_column("scenario_options", "feasibility_score")

    op.drop_column("coverage_alerts", "calibration_bucket")
    op.drop_column("coverage_alerts", "model_version")
    op.drop_column("coverage_alerts", "prediction_interval_high")
    op.drop_column("coverage_alerts", "prediction_interval_low")
