"""Operational layer tables: canonical records, cost parameters, coverage
alerts, scenario options, decisions, and proof records.

Revision ID: 012
Revises: 011
Create Date: 2026-02-07

Creates:
- canonical_records: Unified charge/capacity data after ingestion.
- cost_parameters: Versioned cost coefficients per site.
- coverage_alerts: Probabilistic understaffing alerts.
- scenario_options: Pareto-optimal remediation options per alert.
- operational_decisions: Manager decisions with outcome tracking.
- proof_records: Monthly aggregated ROI proof-of-value per site.

Security notes:
- All tables include organization_id for tenant isolation.
- New enums use lowercase values matching the sa_enum() convention.
- adminauditaction is extended with 4 new operational values.
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

NOW_SQL = "now()"
ON_DELETE_CASCADE = "CASCADE"
ON_DELETE_RESTRICT = "RESTRICT"
ON_DELETE_SET_NULL = "SET NULL"
ORGANIZATIONS_ID_REF = "organizations.id"
SCENARIO_OPTIONS_ID_REF = "scenario_options.id"
COVERAGE_ALERTS_ID_REF = "coverage_alerts.id"
CLIENT_DATASETS_CREATED_AT_DESC = "created_at DESC"

# revision identifiers, used by Alembic.
revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Create new enums via raw SQL ──────────────────
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE shifttype AS ENUM ('am','pm'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE horizon AS ENUM ('j3','j7','j14'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE scenariooptiontype AS ENUM ("
        "'hs','interim','realloc_intra','realloc_inter',"
        "'service_adjust','outsource'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE coveragealertseverity AS ENUM ("
        "'low','medium','high','critical'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE coveragealertstatus AS ENUM ("
        "'open','acknowledged','resolved','expired'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )

    # PG_ENUM references — enums already created above.
    shifttype = PG_ENUM(name="shifttype", create_type=False)
    horizon = PG_ENUM(name="horizon", create_type=False)
    scenariooptiontype = PG_ENUM(name="scenariooptiontype", create_type=False)
    coveragealertseverity = PG_ENUM(name="coveragealertseverity", create_type=False)
    coveragealertstatus = PG_ENUM(name="coveragealertstatus", create_type=False)

    # ── 2. Create tables ─────────────────────────────────

    op.create_table(
        "canonical_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id", UUID(as_uuid=True), nullable=False, index=True
        ),
        sa.Column("site_id", sa.String(50), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("shift", shifttype, nullable=False),
        sa.Column("competence", sa.String(100), nullable=True),
        sa.Column("charge_units", sa.Numeric(12, 2), nullable=True),
        sa.Column("capacite_plan_h", sa.Numeric(8, 2), nullable=False),
        sa.Column("realise_h", sa.Numeric(8, 2), nullable=True),
        sa.Column("abs_h", sa.Numeric(8, 2), nullable=True, server_default="0"),
        sa.Column("hs_h", sa.Numeric(8, 2), nullable=True, server_default="0"),
        sa.Column("interim_h", sa.Numeric(8, 2), nullable=True, server_default="0"),
        sa.Column("cout_interne_est", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id",
            "site_id",
            "date",
            "shift",
            "competence",
            name="uq_canonical_record",
        ),
    )

    op.create_table(
        "cost_parameters",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id", UUID(as_uuid=True), nullable=False, index=True
        ),
        sa.Column("site_id", sa.String(50), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("c_int", sa.Numeric(8, 2), nullable=False),
        sa.Column("maj_hs", sa.Numeric(5, 4), nullable=False),
        sa.Column("c_interim", sa.Numeric(8, 2), nullable=False),
        sa.Column(
            "premium_urgence",
            sa.Numeric(5, 4),
            nullable=False,
            server_default="0.1000",
        ),
        sa.Column(
            "c_backlog",
            sa.Numeric(8, 2),
            nullable=False,
            server_default="60.00",
        ),
        sa.Column("cap_hs_shift", sa.Integer(), nullable=False, server_default="30"),
        sa.Column(
            "cap_interim_site", sa.Integer(), nullable=False, server_default="50"
        ),
        sa.Column("lead_time_jours", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_until", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
    )

    op.create_table(
        "coverage_alerts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id", UUID(as_uuid=True), nullable=False, index=True
        ),
        sa.Column("site_id", sa.String(50), nullable=False),
        sa.Column("alert_date", sa.Date(), nullable=False),
        sa.Column("shift", shifttype, nullable=False),
        sa.Column("horizon", horizon, nullable=False),
        sa.Column("p_rupture", sa.Numeric(5, 4), nullable=False),
        sa.Column("gap_h", sa.Numeric(8, 2), nullable=False),
        sa.Column("impact_eur", sa.Numeric(12, 2), nullable=True),
        sa.Column("severity", coveragealertseverity, nullable=False),
        sa.Column(
            "status",
            coveragealertstatus,
            nullable=False,
            server_default="open",
        ),
        sa.Column("drivers_json", JSONB(), nullable=False, server_default="[]"),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
    )

    op.create_table(
        "scenario_options",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id", UUID(as_uuid=True), nullable=False, index=True
        ),
        sa.Column(
            "coverage_alert_id",
            UUID(as_uuid=True),
            sa.ForeignKey(COVERAGE_ALERTS_ID_REF, ondelete=ON_DELETE_CASCADE),
            nullable=False,
        ),
        sa.Column(
            "cost_parameter_id",
            UUID(as_uuid=True),
            sa.ForeignKey("cost_parameters.id", ondelete=ON_DELETE_RESTRICT),
            nullable=False,
        ),
        sa.Column("option_type", scenariooptiontype, nullable=False),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("cout_total_eur", sa.Numeric(12, 2), nullable=False),
        sa.Column("service_attendu_pct", sa.Numeric(5, 4), nullable=False),
        sa.Column("heures_couvertes", sa.Numeric(8, 2), nullable=False),
        sa.Column(
            "is_pareto_optimal",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "is_recommended",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("contraintes_json", JSONB(), server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
    )

    op.create_table(
        "operational_decisions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id", UUID(as_uuid=True), nullable=False, index=True
        ),
        sa.Column(
            "coverage_alert_id",
            UUID(as_uuid=True),
            sa.ForeignKey(COVERAGE_ALERTS_ID_REF, ondelete=ON_DELETE_CASCADE),
            nullable=False,
        ),
        sa.Column(
            "recommended_option_id",
            UUID(as_uuid=True),
            sa.ForeignKey(SCENARIO_OPTIONS_ID_REF, ondelete=ON_DELETE_SET_NULL),
            nullable=True,
        ),
        sa.Column(
            "chosen_option_id",
            UUID(as_uuid=True),
            sa.ForeignKey(SCENARIO_OPTIONS_ID_REF, ondelete=ON_DELETE_SET_NULL),
            nullable=True,
        ),
        sa.Column("site_id", sa.String(50), nullable=False),
        sa.Column("decision_date", sa.Date(), nullable=False),
        sa.Column("shift", shifttype, nullable=False),
        sa.Column("horizon", horizon, nullable=False),
        sa.Column("gap_h", sa.Numeric(8, 2), nullable=False),
        sa.Column(
            "is_override",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("override_reason", sa.String(500), nullable=True),
        sa.Column("cout_attendu_eur", sa.Numeric(12, 2), nullable=True),
        sa.Column("service_attendu_pct", sa.Numeric(5, 4), nullable=True),
        sa.Column("cout_observe_eur", sa.Numeric(12, 2), nullable=True),
        sa.Column("service_observe_pct", sa.Numeric(5, 4), nullable=True),
        sa.Column("decided_by", UUID(as_uuid=True), nullable=False),
        sa.Column("comment", sa.String(1000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
    )

    op.create_table(
        "proof_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id", UUID(as_uuid=True), nullable=False, index=True
        ),
        sa.Column("site_id", sa.String(50), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("cout_bau_eur", sa.Numeric(12, 2), nullable=False),
        sa.Column("cout_100_eur", sa.Numeric(12, 2), nullable=False),
        sa.Column("cout_reel_eur", sa.Numeric(12, 2), nullable=False),
        sa.Column("gain_net_eur", sa.Numeric(12, 2), nullable=False),
        sa.Column("service_bau_pct", sa.Numeric(5, 4), nullable=True),
        sa.Column("service_reel_pct", sa.Numeric(5, 4), nullable=True),
        sa.Column("adoption_pct", sa.Numeric(5, 4), nullable=True),
        sa.Column("alertes_emises", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("alertes_traitees", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("details_json", JSONB(), server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(NOW_SQL),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id",
            "site_id",
            "month",
            name="uq_proof_record",
        ),
    )

    # ── 3. Create composite indexes ──────────────────────

    op.create_index(
        "ix_canonical_records_org_site_date",
        "canonical_records",
        ["organization_id", "site_id", "date"],
    )

    op.create_index(
        "ix_cost_parameters_org_site_effective",
        "cost_parameters",
        ["organization_id", "site_id", "effective_from"],
    )

    op.create_index(
        "ix_coverage_alerts_org_status_severity",
        "coverage_alerts",
        ["organization_id", "status", "severity"],
    )
    op.create_index(
        "ix_coverage_alerts_org_site_date",
        "coverage_alerts",
        ["organization_id", "site_id", "alert_date"],
    )

    op.create_index(
        "ix_scenario_options_alert",
        "scenario_options",
        ["coverage_alert_id"],
    )

    op.create_index(
        "ix_operational_decisions_org_site_date",
        "operational_decisions",
        ["organization_id", "site_id", "decision_date"],
    )
    op.create_index(
        "ix_operational_decisions_org_override",
        "operational_decisions",
        ["organization_id", "is_override"],
    )

    op.create_index(
        "ix_proof_records_org_month",
        "proof_records",
        ["organization_id", "month"],
    )

    # ── 4. Extend adminauditaction enum ──────────────────
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
    op.execute("COMMIT")
    op.execute("ALTER TYPE adminauditaction ADD VALUE IF NOT EXISTS 'view_canonical'")
    op.execute("ALTER TYPE adminauditaction ADD VALUE IF NOT EXISTS 'view_cost_params'")
    op.execute(
        "ALTER TYPE adminauditaction ADD VALUE IF NOT EXISTS 'view_coverage_alerts'"
    )
    op.execute("ALTER TYPE adminauditaction ADD VALUE IF NOT EXISTS 'view_proof_packs'")


def downgrade() -> None:
    # Drop indexes (reverse order)
    op.drop_index("ix_proof_records_org_month", table_name="proof_records")
    op.drop_index(
        "ix_operational_decisions_org_override",
        table_name="operational_decisions",
    )
    op.drop_index(
        "ix_operational_decisions_org_site_date",
        table_name="operational_decisions",
    )
    op.drop_index("ix_scenario_options_alert", table_name="scenario_options")
    op.drop_index("ix_coverage_alerts_org_site_date", table_name="coverage_alerts")
    op.drop_index(
        "ix_coverage_alerts_org_status_severity", table_name="coverage_alerts"
    )
    op.drop_index("ix_cost_parameters_org_site_effective", table_name="cost_parameters")
    op.drop_index("ix_canonical_records_org_site_date", table_name="canonical_records")

    # Drop tables (reverse dependency order)
    op.drop_table("proof_records")
    op.drop_table("operational_decisions")
    op.drop_table("scenario_options")
    op.drop_table("coverage_alerts")
    op.drop_table("cost_parameters")
    op.drop_table("canonical_records")

    # Drop enums
    sa.Enum(name="coveragealertstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="coveragealertseverity").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="scenariooptiontype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="horizon").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="shifttype").drop(op.get_bind(), checkfirst=True)

    # Note: adminauditaction values cannot be removed in PostgreSQL.
    # They will remain but be unused after downgrade.
