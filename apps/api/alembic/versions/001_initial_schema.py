"""Initial schema — all tables for the Praedixa POC.

Revision ID: 001
Revises:
Create Date: 2026-02-06

This migration creates the complete Data Foundation schema.
All tables follow multi-tenant isolation via organization_id.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- Organizations ---
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("legal_name", sa.String(255)),
        sa.Column("siret", sa.String(14)),
        sa.Column(
            "sector",
            sa.Enum(
                "healthcare",
                "retail",
                "manufacturing",
                "services",
                "technology",
                "finance",
                "education",
                "public_sector",
                "hospitality",
                "logistics",
                "other",
                name="industrysector",
            ),
        ),
        sa.Column(
            "size",
            sa.Enum(
                "small", "medium", "large", "enterprise", name="organizationsize"
            ),
        ),
        sa.Column("headcount", sa.Integer),
        sa.Column(
            "status",
            sa.Enum(
                "active", "suspended", "trial", "churned",
                name="organizationstatus",
            ),
            nullable=False,
            server_default="trial",
        ),
        sa.Column(
            "plan",
            sa.Enum(
                "free", "starter", "professional", "enterprise",
                name="subscriptionplan",
            ),
            nullable=False,
            server_default="free",
        ),
        sa.Column("timezone", sa.String(50), server_default="Europe/Paris"),
        sa.Column("locale", sa.String(10), server_default="fr-FR"),
        sa.Column("currency", sa.String(3), server_default="EUR"),
        sa.Column("contact_email", sa.String(320), nullable=False),
        sa.Column("logo_url", sa.Text),
        sa.Column(
            "settings",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"])

    # --- Sites ---
    op.create_table(
        "sites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50)),
        sa.Column("address", postgresql.JSONB),
        sa.Column("timezone", sa.String(50), server_default="Europe/Paris"),
        sa.Column("working_days_config", postgresql.JSONB),
        sa.Column("headcount", sa.Integer, server_default="0"),
        sa.Column("capacity_units", sa.Text),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_sites_organization_id", "sites", ["organization_id"])

    # --- Departments ---
    op.create_table(
        "departments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "site_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sites.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="SET NULL"),
        ),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True)),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50)),
        sa.Column("cost_center", sa.String(50)),
        sa.Column("headcount", sa.Integer, server_default="0"),
        sa.Column(
            "min_staffing_level", sa.Numeric(5, 2), server_default="80.0"
        ),
        sa.Column("critical_roles_count", sa.Integer, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_departments_organization_id", "departments", ["organization_id"]
    )
    op.create_index("ix_departments_site_id", "departments", ["site_id"])

    # --- Users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "supabase_user_id", sa.String(255), unique=True, nullable=False
        ),
        sa.Column("email", sa.String(320), unique=True, nullable=False),
        sa.Column(
            "email_verified", sa.Boolean, server_default=sa.text("false")
        ),
        sa.Column(
            "role",
            sa.Enum(
                "super_admin",
                "org_admin",
                "hr_manager",
                "manager",
                "employee",
                "viewer",
                name="userrole",
            ),
            nullable=False,
            server_default="viewer",
        ),
        sa.Column(
            "status",
            sa.Enum(
                "active", "inactive", "pending", "suspended", name="userstatus"
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True)),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column(
            "mfa_enabled", sa.Boolean, server_default=sa.text("false")
        ),
        sa.Column("locale", sa.String(10)),
        sa.Column("timezone", sa.String(50)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_index("ix_users_supabase_user_id", "users", ["supabase_user_id"])
    op.create_index("ix_users_email", "users", ["email"])

    # --- Employees ---
    op.create_table(
        "employees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "department_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "site_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sites.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "manager_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="SET NULL"),
        ),
        sa.Column("employee_number", sa.String(50), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("personal_email", sa.String(320)),
        sa.Column("phone", sa.String(30)),
        sa.Column("job_title", sa.String(200), nullable=False),
        sa.Column("job_category", sa.String(100)),
        sa.Column(
            "employment_type",
            sa.Enum(
                "full_time",
                "part_time",
                "contractor",
                "intern",
                "temporary",
                name="employmenttype",
            ),
            nullable=False,
        ),
        sa.Column(
            "contract_type",
            sa.Enum(
                "cdi",
                "cdd",
                "interim",
                "apprenticeship",
                "internship",
                "other",
                name="contracttype",
            ),
            nullable=False,
        ),
        sa.Column("fte", sa.Numeric(3, 2), server_default="1.0"),
        sa.Column("hire_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date),
        sa.Column(
            "is_critical_role", sa.Boolean, server_default=sa.text("false")
        ),
        sa.Column("skills", postgresql.ARRAY(sa.String(100))),
        sa.Column("daily_cost", sa.Numeric(10, 2)),
        sa.Column(
            "absence_balance",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "on_leave",
                "terminated",
                "pending",
                name="employeestatus",
            ),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_employees_organization_id", "employees", ["organization_id"]
    )
    op.create_index(
        "ix_employees_department_id", "employees", ["department_id"]
    )
    op.create_index("ix_employees_site_id", "employees", ["site_id"])
    op.create_index(
        "ix_employees_employee_number", "employees", ["employee_number"]
    )
    op.create_index("ix_employees_email", "employees", ["email"])

    # --- Absences ---
    op.create_table(
        "absences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "employee_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "type",
            sa.Enum(
                "paid_leave",
                "rtt",
                "sick_leave",
                "sick_leave_workplace",
                "maternity",
                "paternity",
                "parental",
                "bereavement",
                "wedding",
                "moving",
                "unpaid_leave",
                "training",
                "remote_work",
                "other",
                name="absencetype",
            ),
            nullable=False,
        ),
        sa.Column(
            "category",
            sa.Enum(
                "planned", "unplanned", "statutory", name="absencecategory"
            ),
            nullable=False,
        ),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column(
            "start_portion",
            sa.Enum("full", "morning", "afternoon", name="dayportion"),
            server_default="full",
        ),
        sa.Column(
            "end_portion",
            sa.Enum("full", "morning", "afternoon", name="dayportion",
                    create_type=False),
            server_default="full",
        ),
        sa.Column(
            "duration",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column("business_days", sa.Integer, server_default="0"),
        sa.Column(
            "status",
            sa.Enum(
                "draft",
                "pending",
                "approved",
                "rejected",
                "cancelled",
                "completed",
                name="absencestatus",
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("reason", sa.Text),
        sa.Column("manager_comment", sa.Text),
        sa.Column("rejection_reason", sa.Text),
        sa.Column(
            "approver_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("decision_at", sa.DateTime(timezone=True)),
        sa.Column(
            "medical_certificate_required",
            sa.Boolean,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "medical_certificate_uploaded",
            sa.Boolean,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "replacement_employee_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="SET NULL"),
        ),
        sa.Column("source_system", sa.String(100)),
        sa.Column("external_id", sa.String(255)),
        sa.Column("recurrence_pattern", postgresql.JSONB),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_absences_organization_id", "absences", ["organization_id"]
    )
    op.create_index("ix_absences_employee_id", "absences", ["employee_id"])
    op.create_index("ix_absences_start_date", "absences", ["start_date"])
    op.create_index("ix_absences_end_date", "absences", ["end_date"])

    # --- Forecast Runs ---
    op.create_table(
        "forecast_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "model_type",
            sa.Enum(
                "arima",
                "prophet",
                "random_forest",
                "xgboost",
                "ensemble",
                name="forecastmodeltype",
            ),
            nullable=False,
        ),
        sa.Column("model_version", sa.String(50)),
        sa.Column("horizon_days", sa.Integer, nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "running",
                "completed",
                "failed",
                name="forecaststatus",
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("accuracy_score", sa.Numeric(5, 4)),
        sa.Column("error_message", sa.String(1000)),
        sa.Column(
            "department_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "config",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_forecast_runs_organization_id",
        "forecast_runs",
        ["organization_id"],
    )
    op.create_index(
        "ix_forecast_runs_department_id", "forecast_runs", ["department_id"]
    )

    # --- Daily Forecasts ---
    op.create_table(
        "daily_forecasts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "forecast_run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("forecast_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "department_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="SET NULL"),
        ),
        sa.Column("forecast_date", sa.Date, nullable=False),
        sa.Column(
            "dimension",
            sa.Enum("human", "merchandise", name="forecastdimension"),
            nullable=False,
        ),
        sa.Column("predicted_demand", sa.Numeric(10, 2), nullable=False),
        sa.Column("predicted_capacity", sa.Numeric(10, 2), nullable=False),
        sa.Column("gap", sa.Numeric(10, 2), nullable=False),
        sa.Column("risk_score", sa.Numeric(5, 2), server_default="0.0"),
        sa.Column("confidence_lower", sa.Numeric(10, 2), nullable=False),
        sa.Column("confidence_upper", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "details",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_daily_forecasts_organization_id",
        "daily_forecasts",
        ["organization_id"],
    )
    op.create_index(
        "ix_daily_forecasts_forecast_run_id",
        "daily_forecasts",
        ["forecast_run_id"],
    )
    op.create_index(
        "ix_daily_forecasts_department_id",
        "daily_forecasts",
        ["department_id"],
    )
    op.create_index(
        "ix_daily_forecasts_forecast_date",
        "daily_forecasts",
        ["forecast_date"],
    )

    # --- Decisions ---
    op.create_table(
        "decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "forecast_run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("forecast_runs.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "department_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("target_period", postgresql.JSONB, nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "replacement",
                "redistribution",
                "postponement",
                "overtime",
                "external",
                "training",
                "no_action",
                name="decisiontype",
            ),
            nullable=False,
        ),
        sa.Column(
            "priority",
            sa.Enum(
                "low", "medium", "high", "critical", name="decisionpriority"
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "suggested",
                "pending_review",
                "approved",
                "rejected",
                "implemented",
                "expired",
                name="decisionstatus",
            ),
            nullable=False,
            server_default="suggested",
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("rationale", sa.Text, nullable=False),
        sa.Column(
            "risk_indicators",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column("estimated_cost", sa.Numeric(12, 2)),
        sa.Column("cost_of_inaction", sa.Numeric(12, 2)),
        sa.Column("estimated_roi", sa.Numeric(8, 2)),
        sa.Column("confidence_score", sa.Numeric(5, 2), nullable=False),
        sa.Column(
            "related_employee_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "suggested_replacement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "reviewed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("manager_notes", sa.Text),
        sa.Column("implementation_deadline", sa.Date),
        sa.Column(
            "implemented_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("implemented_at", sa.DateTime(timezone=True)),
        sa.Column("outcome", postgresql.JSONB),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_decisions_organization_id", "decisions", ["organization_id"]
    )
    op.create_index(
        "ix_decisions_department_id", "decisions", ["department_id"]
    )

    # --- Dashboard Alerts ---
    op.create_table(
        "dashboard_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "type",
            sa.Enum(
                "risk",
                "decision",
                "forecast",
                "absence",
                "system",
                name="alerttype",
            ),
            nullable=False,
        ),
        sa.Column(
            "severity",
            sa.Enum(
                "info", "warning", "error", "critical", name="alertseverity"
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column(
            "related_entity_type",
            sa.Enum(
                "absence",
                "decision",
                "forecast",
                "employee",
                "department",
                name="relatedentitytype",
            ),
        ),
        sa.Column("related_entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("action_url", sa.String(500)),
        sa.Column("action_label", sa.String(200)),
        sa.Column("dismissed_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_dashboard_alerts_organization_id",
        "dashboard_alerts",
        ["organization_id"],
    )

    # --- Action Plans ---
    op.create_table(
        "action_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("period", postgresql.JSONB, nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "draft", "active", "completed", "archived",
                name="actionplanstatus",
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "decisions",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "total_estimated_cost",
            sa.Numeric(12, 2),
            server_default="0.0",
        ),
        sa.Column(
            "total_estimated_savings",
            sa.Numeric(12, 2),
            server_default="0.0",
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=False,
        ),
        sa.Column(
            "approved_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_action_plans_organization_id",
        "action_plans",
        ["organization_id"],
    )


def downgrade() -> None:
    op.drop_table("action_plans")
    op.drop_table("dashboard_alerts")
    op.drop_table("decisions")
    op.drop_table("daily_forecasts")
    op.drop_table("forecast_runs")
    op.drop_table("absences")
    op.drop_table("employees")
    op.drop_table("users")
    op.drop_table("departments")
    op.drop_table("sites")
    op.drop_table("organizations")

    # Drop all enums
    for enum_name in [
        "actionplanstatus",
        "relatedentitytype",
        "alertseverity",
        "alerttype",
        "decisionstatus",
        "decisionpriority",
        "decisiontype",
        "forecastdimension",
        "forecaststatus",
        "forecastmodeltype",
        "absencestatus",
        "dayportion",
        "absencecategory",
        "absencetype",
        "employeestatus",
        "contracttype",
        "employmenttype",
        "userstatus",
        "userrole",
        "subscriptionplan",
        "organizationstatus",
        "organizationsize",
        "industrysector",
    ]:
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
