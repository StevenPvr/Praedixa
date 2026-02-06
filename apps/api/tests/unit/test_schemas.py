"""Tests for all app.schemas — Pydantic models, validation, serialization."""

import uuid
from datetime import UTC, date, datetime
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

# ── Base schemas ────────────────────────────────────────────────────


class TestCamelModel:
    """Test CamelModel base class."""

    def test_alias_generator_camel_case(self):
        from app.schemas.base import CamelModel

        class TestSchema(CamelModel):
            first_name: str
            last_name: str

        s = TestSchema(first_name="Jean", last_name="Dupont")
        d = s.model_dump(by_alias=True)
        assert "firstName" in d
        assert "lastName" in d

    def test_populate_by_name(self):
        from app.schemas.base import CamelModel

        class TestSchema(CamelModel):
            some_field: str

        s = TestSchema(some_field="hello")
        assert s.some_field == "hello"

    def test_from_attributes(self):
        from app.schemas.base import CamelModel

        class TestSchema(CamelModel):
            name: str
            value: int

        obj = SimpleNamespace(name="test", value=42)
        s = TestSchema.model_validate(obj, from_attributes=True)
        assert s.name == "test"
        assert s.value == 42


class TestTimestampSchema:
    def test_fields(self):
        from app.schemas.base import TimestampSchema

        now = datetime.now(UTC)
        s = TimestampSchema(created_at=now, updated_at=now)
        assert s.created_at == now
        assert s.updated_at == now


class TestTenantEntitySchema:
    def test_fields(self):
        from app.schemas.base import TenantEntitySchema

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = TenantEntitySchema(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
        )
        assert s.id == uid


class TestPaginationMeta:
    def test_fields(self):
        from app.schemas.base import PaginationMeta

        p = PaginationMeta(
            total=100,
            page=2,
            page_size=20,
            total_pages=5,
            has_next_page=True,
            has_previous_page=True,
        )
        assert p.total == 100
        assert p.has_next_page is True

    def test_camel_case_serialization(self):
        from app.schemas.base import PaginationMeta

        p = PaginationMeta(
            total=10,
            page=1,
            page_size=10,
            total_pages=1,
            has_next_page=False,
            has_previous_page=False,
        )
        d = p.model_dump(by_alias=True)
        assert "pageSize" in d
        assert "hasNextPage" in d
        assert "hasPreviousPage" in d
        assert "totalPages" in d


class TestPaginationParams:
    def test_defaults(self):
        from app.schemas.base import PaginationParams

        p = PaginationParams()
        assert p.page == 1
        assert p.page_size == 20
        assert p.sort_by is None
        assert p.sort_order == "asc"


# ── Organization schemas ───────────────────────────────────────────


class TestOrganizationSchemas:
    def test_organization_read(self):
        from app.models.organization import OrganizationStatus, SubscriptionPlan
        from app.schemas.organization import OrganizationRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = OrganizationRead(
            id=uid,
            organization_id=None,
            created_at=now,
            updated_at=now,
            name="Test Org",
            slug="test-org",
            status=OrganizationStatus.ACTIVE,
            plan=SubscriptionPlan.PROFESSIONAL,
            timezone="Europe/Paris",
            locale="fr-FR",
            currency="EUR",
            contact_email="org@test.com",
            settings={},
        )
        assert s.name == "Test Org"
        assert s.organization_id is None

    def test_organization_summary(self):
        from app.models.organization import OrganizationStatus, SubscriptionPlan
        from app.schemas.organization import OrganizationSummary

        s = OrganizationSummary(
            id=uuid.uuid4(),
            name="Org",
            slug="org",
            status=OrganizationStatus.ACTIVE,
            plan=SubscriptionPlan.FREE,
        )
        assert s.headcount is None

    def test_organization_update(self):
        from app.schemas.organization import OrganizationUpdate

        s = OrganizationUpdate()
        assert s.name is None
        assert s.timezone is None


# ── Site schemas ───────────────────────────────────────────────────


class TestSiteSchemas:
    def test_site_read(self):
        from app.schemas.site import SiteRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = SiteRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            name="Paris Hub",
            timezone="Europe/Paris",
            headcount=50,
        )
        assert s.name == "Paris Hub"
        assert s.code is None
        assert s.capacity_units is None

    def test_site_create_defaults(self):
        from app.schemas.site import SiteCreate

        s = SiteCreate(name="New Site")
        assert s.timezone == "Europe/Paris"
        assert s.headcount == 0

    def test_site_update_all_none(self):
        from app.schemas.site import SiteUpdate

        s = SiteUpdate()
        assert s.name is None


# ── Department schemas ─────────────────────────────────────────────


class TestDepartmentSchemas:
    def test_department_read(self):
        from app.schemas.department import DepartmentRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = DepartmentRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            name="Logistics",
            headcount=30,
            min_staffing_level=80.0,
            critical_roles_count=2,
        )
        assert s.name == "Logistics"
        assert s.site_id is None

    def test_department_create_defaults(self):
        from app.schemas.department import DepartmentCreate

        s = DepartmentCreate(name="New Dept")
        assert s.headcount == 0
        assert s.min_staffing_level == 80.0
        assert s.critical_roles_count == 0

    def test_department_update_all_none(self):
        from app.schemas.department import DepartmentUpdate

        s = DepartmentUpdate()
        assert s.name is None


# ── User schemas ───────────────────────────────────────────────────


class TestUserSchemas:
    def test_user_read(self):
        from app.models.user import UserRole, UserStatus
        from app.schemas.user import UserRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = UserRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            email="user@test.com",
            email_verified=True,
            role=UserRole.MANAGER,
            status=UserStatus.ACTIVE,
            mfa_enabled=False,
        )
        assert s.email == "user@test.com"
        assert s.employee_id is None

    def test_user_create_defaults(self):
        from app.models.user import UserRole
        from app.schemas.user import UserCreate

        s = UserCreate(email="new@test.com")
        assert s.role == UserRole.VIEWER

    def test_user_update_all_none(self):
        from app.schemas.user import UserUpdate

        s = UserUpdate()
        assert s.role is None


# ── Employee schemas ───────────────────────────────────────────────


class TestEmployeeSchemas:
    def test_employee_read(self):
        from app.models.employee import ContractType, EmployeeStatus, EmploymentType
        from app.schemas.employee import EmployeeRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = EmployeeRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            employee_number="EMP001",
            first_name="Jean",
            last_name="Dupont",
            display_name="Jean Dupont",
            email="jean@test.com",
            job_title="Engineer",
            department_id=uid,
            employment_type=EmploymentType.FULL_TIME,
            contract_type=ContractType.CDI,
            fte=1.0,
            hire_date=date(2020, 1, 1),
            is_critical_role=False,
            absence_balance={},
            status=EmployeeStatus.ACTIVE,
        )
        assert s.display_name == "Jean Dupont"

    def test_employee_summary(self):
        from app.models.employee import EmployeeStatus
        from app.schemas.employee import EmployeeSummary

        uid = uuid.uuid4()
        s = EmployeeSummary(
            id=uid,
            employee_number="E01",
            display_name="JD",
            email="jd@test.com",
            job_title="Dev",
            department_id=uid,
            fte=1.0,
            status=EmployeeStatus.ACTIVE,
        )
        assert s.manager_id is None

    def test_employee_create(self):
        from app.models.employee import ContractType, EmploymentType
        from app.schemas.employee import EmployeeCreate

        s = EmployeeCreate(
            employee_number="E01",
            first_name="A",
            last_name="B",
            email="ab@test.com",
            job_title="Dev",
            department_id=uuid.uuid4(),
            employment_type=EmploymentType.FULL_TIME,
            contract_type=ContractType.CDI,
            hire_date=date(2025, 1, 1),
        )
        assert s.fte == 1.0
        assert s.is_critical_role is False


# ── Absence schemas ────────────────────────────────────────────────


class TestAbsenceSchemas:
    def test_absence_read(self):
        from app.models.absence import (
            AbsenceCategory,
            AbsenceStatus,
            AbsenceType,
            DayPortion,
        )
        from app.schemas.absence import AbsenceRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = AbsenceRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            employee_id=uid,
            type=AbsenceType.PAID_LEAVE,
            category=AbsenceCategory.PLANNED,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 5),
            start_portion=DayPortion.FULL,
            end_portion=DayPortion.FULL,
            duration={},
            business_days=3,
            status=AbsenceStatus.APPROVED,
            medical_certificate_required=False,
            medical_certificate_uploaded=False,
        )
        assert s.business_days == 3

    def test_absence_create_defaults(self):
        from app.models.absence import AbsenceType, DayPortion
        from app.schemas.absence import AbsenceCreate

        s = AbsenceCreate(
            employee_id=uuid.uuid4(),
            type=AbsenceType.PAID_LEAVE,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 5),
        )
        assert s.start_portion == DayPortion.FULL
        assert s.end_portion == DayPortion.FULL

    def test_absence_decision_request(self):
        from app.schemas.absence import AbsenceDecisionRequest

        s = AbsenceDecisionRequest(action="approve")
        assert s.comment is None
        assert s.rejection_reason is None


# ── Forecast schemas ───────────────────────────────────────────────


class TestForecastSchemas:
    def test_forecast_run_read(self):
        from app.models.forecast_run import ForecastModelType, ForecastStatus
        from app.schemas.forecast import ForecastRunRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = ForecastRunRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            model_type=ForecastModelType.PROPHET,
            horizon_days=14,
            status=ForecastStatus.COMPLETED,
            config={},
        )
        assert s.horizon_days == 14

    def test_forecast_run_summary(self):
        from app.models.forecast_run import ForecastModelType, ForecastStatus
        from app.schemas.forecast import ForecastRunSummary

        s = ForecastRunSummary(
            id=uuid.uuid4(),
            model_type=ForecastModelType.ARIMA,
            horizon_days=7,
            status=ForecastStatus.PENDING,
        )
        assert s.accuracy_score is None

    def test_daily_forecast_read(self):
        from app.models.daily_forecast import ForecastDimension
        from app.schemas.forecast import DailyForecastRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = DailyForecastRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            forecast_run_id=uid,
            forecast_date=date(2026, 1, 15),
            dimension=ForecastDimension.HUMAN,
            predicted_demand=100.0,
            predicted_capacity=90.0,
            gap=-10.0,
            risk_score=0.75,
            confidence_lower=85.0,
            confidence_upper=95.0,
            details={},
        )
        assert s.gap == -10.0

    def test_forecast_request(self):
        from app.schemas.forecast import ForecastRequest

        s = ForecastRequest(horizon_days=14)
        assert s.model_type is None
        assert s.department_id is None


# ── Responses schemas ──────────────────────────────────────────────


class TestResponseSchemas:
    def test_api_response(self):
        from app.schemas.responses import ApiResponse

        r = ApiResponse(
            success=True,
            data={"key": "value"},
            timestamp="2026-01-01T00:00:00Z",
        )
        assert r.success is True
        assert r.message is None

    def test_paginated_response(self):
        from app.schemas.base import PaginationMeta
        from app.schemas.responses import PaginatedResponse

        r = PaginatedResponse(
            data=["item1"],
            pagination=PaginationMeta(
                total=1,
                page=1,
                page_size=10,
                total_pages=1,
                has_next_page=False,
                has_previous_page=False,
            ),
            timestamp="2026-01-01T00:00:00Z",
        )
        assert r.success is True
        assert len(r.data) == 1

    def test_error_detail(self):
        from app.schemas.responses import ErrorDetail

        e = ErrorDetail(code="NOT_FOUND", message="Not found")
        assert e.details is None

    def test_error_response(self):
        from app.schemas.responses import ErrorDetail, ErrorResponse

        e = ErrorResponse(
            error=ErrorDetail(code="ERR", message="Error"),
            timestamp="2026-01-01T00:00:00Z",
        )
        assert e.success is False

    def test_health_check(self):
        from app.schemas.responses import HealthCheck

        h = HealthCheck(name="database", status="pass")
        assert h.duration is None

    def test_health_check_response(self):
        from app.schemas.responses import HealthCheck, HealthCheckResponse

        r = HealthCheckResponse(
            status="healthy",
            version="0.1.0",
            environment="development",
            timestamp=datetime.now(UTC),
            checks=[HealthCheck(name="db", status="pass")],
        )
        assert r.status == "healthy"


# ── Dashboard schemas ──────────────────────────────────────────────


class TestDashboardSchemas:
    def test_dashboard_summary_response(self):
        from app.schemas.dashboard import DashboardSummaryResponse

        s = DashboardSummaryResponse(
            coverage_human=95.0,
            coverage_merchandise=88.0,
            active_alerts_count=3,
        )
        assert s.forecast_accuracy is None
        assert s.last_forecast_date is None

    def test_dashboard_alert_read(self):
        from app.models.dashboard_alert import AlertSeverity, AlertType
        from app.schemas.dashboard import DashboardAlertRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = DashboardAlertRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            type=AlertType.RISK,
            severity=AlertSeverity.WARNING,
            title="Alert",
            message="Something happened",
        )
        assert s.dismissed_at is None

    def test_dashboard_alert_dismiss(self):
        from app.schemas.dashboard import DashboardAlertDismiss

        uid = uuid.uuid4()
        s = DashboardAlertDismiss(alert_id=uid)
        assert s.alert_id == uid

    def test_action_plan_read(self):
        from app.models.action_plan import ActionPlanStatus
        from app.schemas.dashboard import ActionPlanRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = ActionPlanRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            name="Q1 Plan",
            description="Plan for Q1",
            period={"start": "2026-01", "end": "2026-03"},
            status=ActionPlanStatus.ACTIVE,
            decisions=[],
            total_estimated_cost=5000.0,
            total_estimated_savings=3000.0,
            created_by=uid,
        )
        assert s.approved_by is None

    def test_action_plan_create(self):
        from app.schemas.dashboard import ActionPlanCreate

        s = ActionPlanCreate(
            name="Plan",
            description="Desc",
            period={},
        )
        assert s.decision_ids == []

    def test_action_plan_update(self):
        from app.schemas.dashboard import ActionPlanUpdate

        s = ActionPlanUpdate()
        assert s.name is None
        assert s.status is None


# ── Decision schemas ───────────────────────────────────────────────


class TestDecisionSchemas:
    def test_decision_read(self):
        from app.models.decision import DecisionPriority, DecisionStatus, DecisionType
        from app.schemas.decision import DecisionRead

        now = datetime.now(UTC)
        uid = uuid.uuid4()
        s = DecisionRead(
            id=uid,
            organization_id=uid,
            created_at=now,
            updated_at=now,
            department_id=uid,
            target_period={},
            type=DecisionType.OVERTIME,
            priority=DecisionPriority.HIGH,
            status=DecisionStatus.SUGGESTED,
            title="Decision",
            description="Desc",
            rationale="Why",
            risk_indicators={},
            confidence_score=85.0,
        )
        assert s.estimated_cost is None

    def test_decision_summary(self):
        from app.models.decision import DecisionPriority, DecisionStatus, DecisionType
        from app.schemas.decision import DecisionSummary

        s = DecisionSummary(
            id=uuid.uuid4(),
            type=DecisionType.EXTERNAL,
            priority=DecisionPriority.MEDIUM,
            status=DecisionStatus.APPROVED,
            title="Decision",
            target_period={},
            department_id=uuid.uuid4(),
            confidence_score=70.0,
        )
        assert s.estimated_cost is None

    def test_create_decision_request_forbid_extra(self):
        from app.schemas.decision import CreateDecisionRequest

        with pytest.raises(ValidationError):
            CreateDecisionRequest(
                department_id=uuid.uuid4(),
                type="overtime",
                priority="high",
                title="T",
                description="D",
                rationale="R",
                target_period={},
                confidence_score=50.0,
                organization_id=uuid.uuid4(),  # extra field!
            )

    def test_create_decision_request_confidence_bounds(self):
        from app.schemas.decision import CreateDecisionRequest

        with pytest.raises(ValidationError):
            CreateDecisionRequest(
                department_id=uuid.uuid4(),
                type="overtime",
                priority="high",
                title="T",
                description="D",
                rationale="R",
                target_period={},
                confidence_score=101.0,  # > 100
            )

    def test_review_decision_request_action_literal(self):
        from app.schemas.decision import ReviewDecisionRequest

        # Valid
        r = ReviewDecisionRequest(action="approve")
        assert r.action == "approve"

        # Invalid action
        with pytest.raises(ValidationError):
            ReviewDecisionRequest(action="invalid_action")

    def test_review_decision_request_forbid_extra(self):
        from app.schemas.decision import ReviewDecisionRequest

        with pytest.raises(ValidationError):
            ReviewDecisionRequest(
                action="approve",
                reviewed_by=uuid.uuid4(),  # extra field!
            )

    def test_record_outcome_request(self):
        from app.schemas.decision import RecordDecisionOutcomeRequest

        s = RecordDecisionOutcomeRequest(
            effective=True,
            actual_impact="Good result",
        )
        assert s.actual_cost is None
        assert s.lessons_learned is None

    def test_record_outcome_forbid_extra(self):
        from app.schemas.decision import RecordDecisionOutcomeRequest

        with pytest.raises(ValidationError):
            RecordDecisionOutcomeRequest(
                effective=True,
                actual_impact="Impact",
                implemented_by=uuid.uuid4(),  # extra field!
            )


# ── Arbitrage schemas ──────────────────────────────────────────────


class TestArbitrageSchemas:
    def test_arbitrage_option_read(self):
        from app.schemas.arbitrage import ArbitrageOptionRead

        s = ArbitrageOptionRead(
            type="overtime",
            label="Heures sup",
            cost=500.0,
            delay_days=0,
            coverage_impact_pct=15.0,
            risk_level="medium",
            risk_details="fatigue",
            pros=["fast"],
            cons=["costly"],
        )
        assert s.cost == 500.0

    def test_arbitrage_result_read(self):
        from app.schemas.arbitrage import ArbitrageResultRead

        s = ArbitrageResultRead(
            alert_id=uuid.uuid4(),
            alert_title="Alert",
            alert_severity="warning",
            department_name="Dept",
            site_name="Site",
            deficit_pct=15.0,
            horizon_days=7,
            options=[],
            recommendation_index=0,
        )
        assert s.deficit_pct == 15.0

    def test_validate_arbitrage_request(self):
        from app.schemas.arbitrage import ValidateArbitrageRequest

        s = ValidateArbitrageRequest(selected_option_index=2)
        assert s.notes is None

    def test_validate_arbitrage_request_bounds(self):
        from app.schemas.arbitrage import ValidateArbitrageRequest

        # index too high
        with pytest.raises(ValidationError):
            ValidateArbitrageRequest(selected_option_index=4)

        # index negative
        with pytest.raises(ValidationError):
            ValidateArbitrageRequest(selected_option_index=-1)

    def test_validate_arbitrage_forbid_extra(self):
        from app.schemas.arbitrage import ValidateArbitrageRequest

        with pytest.raises(ValidationError):
            ValidateArbitrageRequest(
                selected_option_index=0,
                organization_id=uuid.uuid4(),  # extra field!
            )


# ── Schemas __init__ ───────────────────────────────────────────────


class TestSchemasInit:
    def test_import_base(self):
        from app.schemas.base import CamelModel

        assert CamelModel is not None
