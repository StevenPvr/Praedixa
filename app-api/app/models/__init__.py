"""SQLAlchemy ORM models — all models imported here for Alembic discovery.

Importing Base and all model classes ensures Alembic's autogenerate
can detect all tables when creating migrations.
"""

from app.models.admin import (
    AdminAuditAction,
    AdminAuditLog,
    OnboardingState,
    OnboardingStatus,
    PlanChangeHistory,
    RgpdErasureAuditEvent,
    RgpdErasureRequest,
    RgpdErasureStatus,
)
from app.models.base import Base
from app.models.contact_request import (
    ContactRequest,
    ContactRequestStatus,
    ContactRequestType,
)
from app.models.conversation import (
    Conversation,
    ConversationInitiator,
    ConversationStatus,
    Message,
)
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
from app.models.forecast_run import (
    ForecastModelType,
    ForecastRun,
    ForecastStatus,
)
from app.models.integration import (
    DeadLetterStatus,
    IntegrationAuditEvent,
    IntegrationAuthMode,
    IntegrationConnection,
    IntegrationConnectionStatus,
    IntegrationDeadLetter,
    IntegrationErrorClass,
    IntegrationErrorEvent,
    IntegrationFieldMapping,
    IntegrationRawEvent,
    IntegrationSyncRun,
    IntegrationSyncState,
    IntegrationSyncStatus,
    IntegrationSyncTriggerType,
    IntegrationVendor,
    IntegrationWebhookReceipt,
)
from app.models.mlops import (
    DataLineageEvent,
    InferenceJobStatus,
    ModelArtifactAccessLog,
    ModelInferenceJob,
    ModelRegistry,
    ModelRegistryStatus,
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
    # Forecast
    "ForecastRun",
    "ForecastModelType",
    "ForecastStatus",
    # Integrations
    "IntegrationConnection",
    "IntegrationConnectionStatus",
    "IntegrationAuthMode",
    "IntegrationVendor",
    "IntegrationSyncRun",
    "IntegrationSyncStatus",
    "IntegrationSyncTriggerType",
    "IntegrationSyncState",
    "IntegrationRawEvent",
    "IntegrationFieldMapping",
    "IntegrationErrorEvent",
    "IntegrationErrorClass",
    "IntegrationDeadLetter",
    "DeadLetterStatus",
    "IntegrationWebhookReceipt",
    "IntegrationAuditEvent",
    # MLOps
    "ModelRegistry",
    "ModelRegistryStatus",
    "ModelInferenceJob",
    "InferenceJobStatus",
    "ModelArtifactAccessLog",
    "DataLineageEvent",
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
    "RgpdErasureRequest",
    "RgpdErasureStatus",
    "RgpdErasureAuditEvent",
    # Conversation
    "Conversation",
    "ConversationStatus",
    "ConversationInitiator",
    "Message",
    # Contact requests
    "ContactRequest",
    "ContactRequestStatus",
    "ContactRequestType",
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
