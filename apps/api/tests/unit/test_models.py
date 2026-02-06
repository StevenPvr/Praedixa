"""Tests for all app.models — ORM model structure, enums, mixins."""

import enum
from datetime import date

from app.models.base import Base, TenantMixin, TimestampMixin, sa_enum

# ── sa_enum helper ──────────────────────────────────────────────────


class TestSaEnum:
    """Test sa_enum helper function."""

    def test_uses_values_not_names(self):
        """sa_enum uses .value (lowercase), not .name (UPPERCASE)."""

        class TestEnum(str, enum.Enum):
            ITEM_ONE = "item_one"
            ITEM_TWO = "item_two"

        sa = sa_enum(TestEnum)
        # The values_callable should produce lowercase values
        assert sa.enums == ["item_one", "item_two"]

    def test_native_enum_true(self):
        class E(str, enum.Enum):
            A = "a"

        sa = sa_enum(E)
        assert sa.native_enum is True

    def test_create_constraint_false(self):
        class E(str, enum.Enum):
            A = "a"

        sa = sa_enum(E)
        assert sa.create_constraint is False


# ── Base and mixins ─────────────────────────────────────────────────


class TestBase:
    def test_declarative_base(self):
        assert hasattr(Base, "metadata")
        assert hasattr(Base, "registry")


class TestTimestampMixin:
    def test_has_created_at(self):
        assert hasattr(TimestampMixin, "created_at")

    def test_has_updated_at(self):
        assert hasattr(TimestampMixin, "updated_at")


class TestTenantMixin:
    def test_inherits_timestamp(self):
        assert issubclass(TenantMixin, TimestampMixin)

    def test_has_organization_id(self):
        assert hasattr(TenantMixin, "organization_id")


# ── Organization model ──────────────────────────────────────────────


class TestOrganizationModel:
    def test_tablename(self):
        from app.models.organization import Organization

        assert Organization.__tablename__ == "organizations"

    def test_repr(self):
        from app.models.organization import Organization

        org = Organization()
        org.slug = "test-org"
        assert repr(org) == "<Organization test-org>"

    def test_organization_status_values(self):
        from app.models.organization import OrganizationStatus

        assert OrganizationStatus.ACTIVE.value == "active"
        assert OrganizationStatus.SUSPENDED.value == "suspended"
        assert OrganizationStatus.TRIAL.value == "trial"
        assert OrganizationStatus.CHURNED.value == "churned"

    def test_subscription_plan_values(self):
        from app.models.organization import SubscriptionPlan

        assert SubscriptionPlan.FREE.value == "free"
        assert SubscriptionPlan.ENTERPRISE.value == "enterprise"

    def test_industry_sector_values(self):
        from app.models.organization import IndustrySector

        assert IndustrySector.LOGISTICS.value == "logistics"
        assert IndustrySector.OTHER.value == "other"
        assert len(IndustrySector) == 11

    def test_organization_size_values(self):
        from app.models.organization import OrganizationSize

        assert OrganizationSize.SMALL.value == "small"
        assert OrganizationSize.ENTERPRISE.value == "enterprise"


# ── Site model ──────────────────────────────────────────────────────


class TestSiteModel:
    def test_tablename(self):
        from app.models.site import Site

        assert Site.__tablename__ == "sites"

    def test_repr(self):
        from app.models.site import Site

        s = Site()
        s.name = "Paris Hub"
        assert repr(s) == "<Site Paris Hub>"


# ── Department model ────────────────────────────────────────────────


class TestDepartmentModel:
    def test_tablename(self):
        from app.models.department import Department

        assert Department.__tablename__ == "departments"

    def test_repr(self):
        from app.models.department import Department

        d = Department()
        d.name = "Logistics"
        assert repr(d) == "<Department Logistics>"


# ── User model ──────────────────────────────────────────────────────


class TestUserModel:
    def test_tablename(self):
        from app.models.user import User

        assert User.__tablename__ == "users"

    def test_repr(self):
        from app.models.user import User

        u = User()
        u.email = "test@example.com"
        assert repr(u) == "<User test@example.com>"

    def test_user_role_values(self):
        from app.models.user import UserRole

        assert UserRole.SUPER_ADMIN.value == "super_admin"
        assert UserRole.VIEWER.value == "viewer"
        assert len(UserRole) == 6

    def test_user_status_values(self):
        from app.models.user import UserStatus

        assert UserStatus.ACTIVE.value == "active"
        assert UserStatus.SUSPENDED.value == "suspended"


# ── Employee model ──────────────────────────────────────────────────


class TestEmployeeModel:
    def test_tablename(self):
        from app.models.employee import Employee

        assert Employee.__tablename__ == "employees"

    def test_repr(self):
        from app.models.employee import Employee

        e = Employee()
        e.display_name = "Jean Dupont"
        assert repr(e) == "<Employee Jean Dupont>"

    def test_employment_type_values(self):
        from app.models.employee import EmploymentType

        assert EmploymentType.FULL_TIME.value == "full_time"
        assert EmploymentType.TEMPORARY.value == "temporary"
        assert len(EmploymentType) == 5

    def test_contract_type_values(self):
        from app.models.employee import ContractType

        assert ContractType.CDI.value == "cdi"
        assert ContractType.OTHER.value == "other"
        assert len(ContractType) == 6

    def test_employee_status_values(self):
        from app.models.employee import EmployeeStatus

        assert EmployeeStatus.ACTIVE.value == "active"
        assert EmployeeStatus.ON_LEAVE.value == "on_leave"


# ── Absence model ──────────────────────────────────────────────────


class TestAbsenceModel:
    def test_tablename(self):
        from app.models.absence import Absence

        assert Absence.__tablename__ == "absences"

    def test_repr(self):
        from app.models.absence import Absence, AbsenceType

        a = Absence()
        a.type = AbsenceType.PAID_LEAVE
        a.start_date = date(2026, 1, 1)
        a.end_date = date(2026, 1, 5)
        r = repr(a)
        assert "paid_leave" in r
        assert "2026-01-01" in r

    def test_absence_type_values(self):
        from app.models.absence import AbsenceType

        assert AbsenceType.PAID_LEAVE.value == "paid_leave"
        assert AbsenceType.RTT.value == "rtt"
        assert AbsenceType.SICK_LEAVE.value == "sick_leave"
        assert len(AbsenceType) == 14

    def test_absence_category_values(self):
        from app.models.absence import AbsenceCategory

        assert AbsenceCategory.PLANNED.value == "planned"
        assert AbsenceCategory.UNPLANNED.value == "unplanned"
        assert AbsenceCategory.STATUTORY.value == "statutory"

    def test_absence_status_values(self):
        from app.models.absence import AbsenceStatus

        assert AbsenceStatus.DRAFT.value == "draft"
        assert AbsenceStatus.COMPLETED.value == "completed"
        assert len(AbsenceStatus) == 6

    def test_day_portion_values(self):
        from app.models.absence import DayPortion

        assert DayPortion.FULL.value == "full"
        assert DayPortion.MORNING.value == "morning"
        assert DayPortion.AFTERNOON.value == "afternoon"


# ── ForecastRun model ──────────────────────────────────────────────


class TestForecastRunModel:
    def test_tablename(self):
        from app.models.forecast_run import ForecastRun

        assert ForecastRun.__tablename__ == "forecast_runs"

    def test_repr(self):
        from app.models.forecast_run import (
            ForecastModelType,
            ForecastRun,
            ForecastStatus,
        )

        fr = ForecastRun()
        fr.model_type = ForecastModelType.PROPHET
        fr.status = ForecastStatus.COMPLETED
        assert repr(fr) == "<ForecastRun prophet completed>"

    def test_forecast_model_type_values(self):
        from app.models.forecast_run import ForecastModelType

        assert ForecastModelType.ARIMA.value == "arima"
        assert ForecastModelType.ENSEMBLE.value == "ensemble"
        assert len(ForecastModelType) == 5

    def test_forecast_status_values(self):
        from app.models.forecast_run import ForecastStatus

        assert ForecastStatus.PENDING.value == "pending"
        assert ForecastStatus.COMPLETED.value == "completed"
        assert ForecastStatus.FAILED.value == "failed"


# ── DailyForecast model ───────────────────────────────────────────


class TestDailyForecastModel:
    def test_tablename(self):
        from app.models.daily_forecast import DailyForecast

        assert DailyForecast.__tablename__ == "daily_forecasts"

    def test_repr(self):
        from app.models.daily_forecast import DailyForecast, ForecastDimension

        df = DailyForecast()
        df.forecast_date = date(2026, 3, 15)
        df.dimension = ForecastDimension.HUMAN
        assert repr(df) == "<DailyForecast 2026-03-15 human>"

    def test_forecast_dimension_values(self):
        from app.models.daily_forecast import ForecastDimension

        assert ForecastDimension.HUMAN.value == "human"
        assert ForecastDimension.MERCHANDISE.value == "merchandise"


# ── DashboardAlert model ──────────────────────────────────────────


class TestDashboardAlertModel:
    def test_tablename(self):
        from app.models.dashboard_alert import DashboardAlert

        assert DashboardAlert.__tablename__ == "dashboard_alerts"

    def test_repr(self):
        from app.models.dashboard_alert import AlertSeverity, AlertType, DashboardAlert

        a = DashboardAlert()
        a.type = AlertType.RISK
        a.severity = AlertSeverity.WARNING
        assert repr(a) == "<DashboardAlert risk warning>"

    def test_alert_type_values(self):
        from app.models.dashboard_alert import AlertType

        assert AlertType.RISK.value == "risk"
        assert AlertType.SYSTEM.value == "system"
        assert len(AlertType) == 5

    def test_alert_severity_values(self):
        from app.models.dashboard_alert import AlertSeverity

        assert AlertSeverity.INFO.value == "info"
        assert AlertSeverity.CRITICAL.value == "critical"
        assert len(AlertSeverity) == 4

    def test_related_entity_type_values(self):
        from app.models.dashboard_alert import RelatedEntityType

        assert RelatedEntityType.DEPARTMENT.value == "department"
        assert RelatedEntityType.EMPLOYEE.value == "employee"
        assert len(RelatedEntityType) == 5


# ── Decision model ────────────────────────────────────────────────


class TestDecisionModel:
    def test_tablename(self):
        from app.models.decision import Decision

        assert Decision.__tablename__ == "decisions"

    def test_repr(self):
        from app.models.decision import Decision, DecisionStatus, DecisionType

        d = Decision()
        d.type = DecisionType.OVERTIME
        d.status = DecisionStatus.SUGGESTED
        assert repr(d) == "<Decision overtime suggested>"

    def test_decision_type_values(self):
        from app.models.decision import DecisionType

        assert DecisionType.REPLACEMENT.value == "replacement"
        assert DecisionType.NO_ACTION.value == "no_action"
        assert len(DecisionType) == 7

    def test_decision_status_values(self):
        from app.models.decision import DecisionStatus

        assert DecisionStatus.SUGGESTED.value == "suggested"
        assert DecisionStatus.IMPLEMENTED.value == "implemented"
        assert DecisionStatus.EXPIRED.value == "expired"
        assert len(DecisionStatus) == 6

    def test_decision_priority_values(self):
        from app.models.decision import DecisionPriority

        assert DecisionPriority.LOW.value == "low"
        assert DecisionPriority.CRITICAL.value == "critical"
        assert len(DecisionPriority) == 4


# ── ActionPlan model ──────────────────────────────────────────────


class TestActionPlanModel:
    def test_tablename(self):
        from app.models.action_plan import ActionPlan

        assert ActionPlan.__tablename__ == "action_plans"

    def test_repr(self):
        from app.models.action_plan import ActionPlan

        ap = ActionPlan()
        ap.name = "Q1 Plan"
        assert repr(ap) == "<ActionPlan Q1 Plan>"

    def test_action_plan_status_values(self):
        from app.models.action_plan import ActionPlanStatus

        assert ActionPlanStatus.DRAFT.value == "draft"
        assert ActionPlanStatus.ARCHIVED.value == "archived"
        assert len(ActionPlanStatus) == 4


# ── Models __init__ re-exports ──────────────────────────────────────


class TestModelsInit:
    """Test that models/__init__.py re-exports all required symbols."""

    def test_all_exports(self):
        from app.models import __all__

        expected = [
            "Base", "Organization", "Site", "Department", "User",
            "Employee", "Absence", "ForecastRun", "DailyForecast",
            "Decision", "DashboardAlert", "ActionPlan",
        ]
        for name in expected:
            assert name in __all__

    def test_import_all_models(self):
        from app.models import (
            Department,
            Organization,
            Site,
        )

        assert Organization is not None
        assert Site is not None
        assert Department is not None
