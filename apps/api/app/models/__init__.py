"""SQLAlchemy ORM models — all models imported here for Alembic discovery.

Importing Base and all model classes ensures Alembic's autogenerate
can detect all tables when creating migrations.
"""

from app.models.absence import (
    Absence,
    AbsenceCategory,
    AbsenceStatus,
    AbsenceType,
    DayPortion,
)
from app.models.action_plan import ActionPlan, ActionPlanStatus
from app.models.admin import (
    AdminAuditAction,
    AdminAuditLog,
    OnboardingState,
    OnboardingStatus,
    PlanChangeHistory,
)
from app.models.base import Base
from app.models.daily_forecast import DailyForecast, ForecastDimension
from app.models.dashboard_alert import (
    AlertSeverity,
    AlertType,
    DashboardAlert,
    RelatedEntityType,
)
from app.models.data_catalog import (
    ClientDataset,
    ColumnDtype,
    ColumnRole,
    DatasetColumn,
    DatasetStatus,
    FitParameter,
    IngestionLog,
    IngestionMode,
    PipelineConfigHistory,
    RunStatus,
)
from app.models.decision import (
    Decision,
    DecisionPriority,
    DecisionStatus,
    DecisionType,
)
from app.models.department import Department
from app.models.employee import (
    ContractType,
    Employee,
    EmployeeStatus,
    EmploymentType,
)
from app.models.forecast_run import (
    ForecastModelType,
    ForecastRun,
    ForecastStatus,
)
from app.models.operational import (
    CanonicalRecord,
    CostParameter,
    CoverageAlert,
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
    OperationalDecision,
    ProofRecord,
    ScenarioOption,
    ScenarioOptionType,
    ShiftType,
)
from app.models.organization import (
    IndustrySector,
    Organization,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.models.site import Site
from app.models.user import User, UserRole, UserStatus

__all__ = [
    # Base
    "Base",
    # Organization
    "Organization",
    "OrganizationStatus",
    "SubscriptionPlan",
    "IndustrySector",
    "OrganizationSize",
    # Site
    "Site",
    # Department
    "Department",
    # User
    "User",
    "UserRole",
    "UserStatus",
    # Employee
    "Employee",
    "EmploymentType",
    "ContractType",
    "EmployeeStatus",
    # Absence
    "Absence",
    "AbsenceType",
    "AbsenceCategory",
    "AbsenceStatus",
    "DayPortion",
    # Forecast
    "ForecastRun",
    "ForecastModelType",
    "ForecastStatus",
    "DailyForecast",
    "ForecastDimension",
    # Decision
    "Decision",
    "DecisionType",
    "DecisionStatus",
    "DecisionPriority",
    # Dashboard Alert
    "DashboardAlert",
    "AlertType",
    "AlertSeverity",
    "RelatedEntityType",
    # Action Plan
    "ActionPlan",
    "ActionPlanStatus",
    # Data Catalog
    "ClientDataset",
    "DatasetStatus",
    "DatasetColumn",
    "ColumnDtype",
    "ColumnRole",
    "FitParameter",
    "IngestionLog",
    "IngestionMode",
    "RunStatus",
    "PipelineConfigHistory",
    # Admin
    "AdminAuditLog",
    "AdminAuditAction",
    "PlanChangeHistory",
    "OnboardingState",
    "OnboardingStatus",
    # Operational
    "CanonicalRecord",
    "CostParameter",
    "CoverageAlert",
    "CoverageAlertSeverity",
    "CoverageAlertStatus",
    "Horizon",
    "OperationalDecision",
    "ProofRecord",
    "ScenarioOption",
    "ScenarioOptionType",
    "ShiftType",
]
