"""Tests for all app.models — ORM model structure, enums, mixins."""

import enum
from datetime import date

from app.models.base import Base, TenantMixin, TimestampMixin, sa_enum

# ── sa_enum helper ──────────────────────────────────────────────────


class TestSaEnum:
    """Test sa_enum helper function."""

    def test_uses_values_not_names(self) -> None:
        """sa_enum uses .value (lowercase), not .name (UPPERCASE)."""

        class TestEnum(str, enum.Enum):
            ITEM_ONE = "item_one"
            ITEM_TWO = "item_two"

        sa = sa_enum(TestEnum)
        # The values_callable should produce lowercase values
        assert sa.enums == ["item_one", "item_two"]

    def test_native_enum_true(self) -> None:
        class E(str, enum.Enum):
            A = "a"

        sa = sa_enum(E)
        assert sa.native_enum is True

    def test_create_constraint_false(self) -> None:
        class E(str, enum.Enum):
            A = "a"

        sa = sa_enum(E)
        assert sa.create_constraint is False


# ── Base and mixins ─────────────────────────────────────────────────


class TestBase:
    def test_declarative_base(self) -> None:
        assert hasattr(Base, "metadata")
        assert hasattr(Base, "registry")


class TestTimestampMixin:
    def test_has_created_at(self) -> None:
        assert hasattr(TimestampMixin, "created_at")

    def test_has_updated_at(self) -> None:
        assert hasattr(TimestampMixin, "updated_at")


class TestTenantMixin:
    def test_inherits_timestamp(self) -> None:
        assert issubclass(TenantMixin, TimestampMixin)

    def test_has_organization_id(self) -> None:
        assert hasattr(TenantMixin, "organization_id")


# ── Organization model ──────────────────────────────────────────────


class TestOrganizationModel:
    def test_tablename(self) -> None:
        from app.models.organization import Organization

        assert Organization.__tablename__ == "organizations"

    def test_repr(self) -> None:
        from app.models.organization import Organization

        org = Organization()
        org.slug = "test-org"
        assert repr(org) == "<Organization test-org>"

    def test_organization_status_values(self) -> None:
        from app.models.organization import OrganizationStatus

        assert OrganizationStatus.ACTIVE.value == "active"
        assert OrganizationStatus.SUSPENDED.value == "suspended"
        assert OrganizationStatus.TRIAL.value == "trial"
        assert OrganizationStatus.CHURNED.value == "churned"

    def test_subscription_plan_values(self) -> None:
        from app.models.organization import SubscriptionPlan

        assert SubscriptionPlan.FREE.value == "free"
        assert SubscriptionPlan.ENTERPRISE.value == "enterprise"

    def test_industry_sector_values(self) -> None:
        from app.models.organization import IndustrySector

        assert IndustrySector.LOGISTICS.value == "logistics"
        assert IndustrySector.OTHER.value == "other"
        assert len(IndustrySector) == 11

    def test_organization_size_values(self) -> None:
        from app.models.organization import OrganizationSize

        assert OrganizationSize.SMALL.value == "small"
        assert OrganizationSize.ENTERPRISE.value == "enterprise"


# ── Site model ──────────────────────────────────────────────────────


class TestSiteModel:
    def test_tablename(self) -> None:
        from app.models.site import Site

        assert Site.__tablename__ == "sites"

    def test_repr(self) -> None:
        from app.models.site import Site

        s = Site()
        s.name = "Paris Hub"
        assert repr(s) == "<Site Paris Hub>"


# ── Department model ────────────────────────────────────────────────


class TestDepartmentModel:
    def test_tablename(self) -> None:
        from app.models.department import Department

        assert Department.__tablename__ == "departments"

    def test_repr(self) -> None:
        from app.models.department import Department

        d = Department()
        d.name = "Logistics"
        assert repr(d) == "<Department Logistics>"


# ── User model ──────────────────────────────────────────────────────


class TestUserModel:
    def test_tablename(self) -> None:
        from app.models.user import User

        assert User.__tablename__ == "users"

    def test_repr(self) -> None:
        from app.models.user import User

        u = User()
        u.email = "test@example.com"
        assert repr(u) == "<User test@example.com>"

    def test_user_role_values(self) -> None:
        from app.models.user import UserRole

        assert UserRole.SUPER_ADMIN.value == "super_admin"
        assert UserRole.VIEWER.value == "viewer"
        assert len(UserRole) == 6

    def test_user_status_values(self) -> None:
        from app.models.user import UserStatus

        assert UserStatus.ACTIVE.value == "active"
        assert UserStatus.SUSPENDED.value == "suspended"


# ── ForecastRun model ──────────────────────────────────────────────


class TestForecastRunModel:
    def test_tablename(self) -> None:
        from app.models.forecast_run import ForecastRun

        assert ForecastRun.__tablename__ == "forecast_runs"

    def test_repr(self) -> None:
        from app.models.forecast_run import (
            ForecastModelType,
            ForecastRun,
            ForecastStatus,
        )

        fr = ForecastRun()
        fr.model_type = ForecastModelType.PROPHET
        fr.status = ForecastStatus.COMPLETED
        assert repr(fr) == "<ForecastRun prophet completed>"

    def test_forecast_model_type_values(self) -> None:
        from app.models.forecast_run import ForecastModelType

        assert ForecastModelType.ARIMA.value == "arima"
        assert ForecastModelType.ENSEMBLE.value == "ensemble"
        assert len(ForecastModelType) == 5

    def test_forecast_status_values(self) -> None:
        from app.models.forecast_run import ForecastStatus

        assert ForecastStatus.PENDING.value == "pending"
        assert ForecastStatus.COMPLETED.value == "completed"
        assert ForecastStatus.FAILED.value == "failed"


# ── DailyForecast model ───────────────────────────────────────────


class TestDailyForecastModel:
    def test_tablename(self) -> None:
        from app.models.daily_forecast import DailyForecast

        assert DailyForecast.__tablename__ == "daily_forecasts"

    def test_repr(self) -> None:
        from app.models.daily_forecast import DailyForecast, ForecastDimension

        df = DailyForecast()
        df.forecast_date = date(2026, 3, 15)
        df.dimension = ForecastDimension.HUMAN
        assert repr(df) == "<DailyForecast 2026-03-15 human>"

    def test_forecast_dimension_values(self) -> None:
        from app.models.daily_forecast import ForecastDimension

        assert ForecastDimension.HUMAN.value == "human"
        assert ForecastDimension.MERCHANDISE.value == "merchandise"


# ── DashboardAlert model ──────────────────────────────────────────


class TestDashboardAlertModel:
    def test_tablename(self) -> None:
        from app.models.dashboard_alert import DashboardAlert

        assert DashboardAlert.__tablename__ == "dashboard_alerts"

    def test_repr(self) -> None:
        from app.models.dashboard_alert import AlertSeverity, AlertType, DashboardAlert

        a = DashboardAlert()
        a.type = AlertType.RISK
        a.severity = AlertSeverity.WARNING
        assert repr(a) == "<DashboardAlert risk warning>"

    def test_alert_type_values(self) -> None:
        from app.models.dashboard_alert import AlertType

        assert AlertType.RISK.value == "risk"
        assert AlertType.SYSTEM.value == "system"
        assert len(AlertType) == 5

    def test_alert_severity_values(self) -> None:
        from app.models.dashboard_alert import AlertSeverity

        assert AlertSeverity.INFO.value == "info"
        assert AlertSeverity.CRITICAL.value == "critical"
        assert len(AlertSeverity) == 4

    def test_related_entity_type_values(self) -> None:
        from app.models.dashboard_alert import RelatedEntityType

        assert RelatedEntityType.DEPARTMENT.value == "department"
        assert RelatedEntityType.EMPLOYEE.value == "employee"
        assert len(RelatedEntityType) == 5


# ── Decision model ────────────────────────────────────────────────


class TestDecisionModel:
    def test_tablename(self) -> None:
        from app.models.decision import Decision

        assert Decision.__tablename__ == "decisions"

    def test_repr(self) -> None:
        from app.models.decision import Decision, DecisionStatus, DecisionType

        d = Decision()
        d.type = DecisionType.OVERTIME
        d.status = DecisionStatus.SUGGESTED
        assert repr(d) == "<Decision overtime suggested>"

    def test_decision_type_values(self) -> None:
        from app.models.decision import DecisionType

        assert DecisionType.REPLACEMENT.value == "replacement"
        assert DecisionType.NO_ACTION.value == "no_action"
        assert len(DecisionType) == 7

    def test_decision_status_values(self) -> None:
        from app.models.decision import DecisionStatus

        assert DecisionStatus.SUGGESTED.value == "suggested"
        assert DecisionStatus.IMPLEMENTED.value == "implemented"
        assert DecisionStatus.EXPIRED.value == "expired"
        assert len(DecisionStatus) == 6

    def test_decision_priority_values(self) -> None:
        from app.models.decision import DecisionPriority

        assert DecisionPriority.LOW.value == "low"
        assert DecisionPriority.CRITICAL.value == "critical"
        assert len(DecisionPriority) == 4


# ── Models __init__ re-exports ──────────────────────────────────────


class TestModelsInit:
    """Test that models/__init__.py re-exports all required symbols."""

    def test_all_exports(self) -> None:
        from app.models import __all__

        expected = [
            "Base",
            "Organization",
            "Site",
            "Department",
            "User",
            "ForecastRun",
            "DailyForecast",
            "Decision",
            "DashboardAlert",
        ]
        for name in expected:
            assert name in __all__

    def test_import_all_models(self) -> None:
        from app.models import (
            Department,
            Organization,
            Site,
        )

        assert Organization is not None
        assert Site is not None
        assert Department is not None
