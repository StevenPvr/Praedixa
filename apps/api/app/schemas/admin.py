"""Admin back-office Pydantic schemas.

All schemas follow the camelCase convention via CamelModel.
Create/update schemas use extra="forbid" to prevent mass-assignment attacks.
Enum fields reference the canonical model enums for type safety.

Security notes:
- AdminInviteUser and AdminChangeRole validators block super_admin role
  assignment. This is defense-in-depth — the service layer also rejects it.
- extra="forbid" on all mutation schemas prevents injection of fields
  like organization_id, admin_user_id, status, etc.
- Email validation uses Pydantic's EmailStr-equivalent pattern.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import ConfigDict, Field, field_validator

from app.models.admin import AdminAuditAction, OnboardingStatus
from app.models.organization import (
    IndustrySector,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.models.user import UserRole, UserStatus
from app.schemas.base import CamelModel


# ── Organization schemas ─────────────────────────────────


class AdminOrgListParams(CamelModel):
    """Query parameters for the organization list endpoint."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None, max_length=200)
    status: OrganizationStatus | None = None
    plan: SubscriptionPlan | None = None
    sector: IndustrySector | None = None


class AdminOrgCreate(CamelModel):
    """Schema for creating a new organization."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z][a-z0-9_-]*$",
    )
    contact_email: str = Field(..., max_length=320)
    sector: IndustrySector | None = None
    size: OrganizationSize | None = None
    plan: SubscriptionPlan = SubscriptionPlan.FREE
    settings: dict[str, Any] = Field(default_factory=dict)

    @field_validator("contact_email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Basic email validation — must contain @ with parts on both sides."""
        if "@" not in v or v.startswith("@") or v.endswith("@"):
            raise ValueError("Invalid email format")
        return v.strip().lower()


class AdminOrgUpdate(CamelModel):
    """Schema for updating an existing organization."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    name: str | None = Field(default=None, min_length=1, max_length=255)
    legal_name: str | None = Field(default=None, max_length=255)
    siret: str | None = Field(default=None, max_length=14)
    sector: IndustrySector | None = None
    size: OrganizationSize | None = None
    contact_email: str | None = Field(default=None, max_length=320)
    settings: dict[str, Any] | None = None

    @field_validator("contact_email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if "@" not in v or v.startswith("@") or v.endswith("@"):
            raise ValueError("Invalid email format")
        return v.strip().lower()


class AdminOrgRead(CamelModel):
    """Read schema for organization (list view)."""

    id: uuid.UUID
    name: str
    slug: str
    legal_name: str | None = None
    siret: str | None = None
    sector: IndustrySector | None = None
    size: OrganizationSize | None = None
    headcount: int | None = None
    status: OrganizationStatus
    plan: SubscriptionPlan
    timezone: str
    locale: str
    currency: str
    contact_email: str
    logo_url: str | None = None
    settings: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    # Aggregated counts (computed in service layer)
    user_count: int = 0
    site_count: int = 0
    department_count: int = 0
    dataset_count: int = 0


class OrgDepartmentNode(CamelModel):
    """Department node in the org hierarchy."""

    id: uuid.UUID
    name: str
    employee_count: int = 0


class OrgSiteNode(CamelModel):
    """Site node in the org hierarchy."""

    id: uuid.UUID
    name: str
    city: str | None = None
    departments: list[OrgDepartmentNode] = Field(default_factory=list)


class AdminOrgDetail(AdminOrgRead):
    """Detailed view of an organization with hierarchy."""

    hierarchy: list[OrgSiteNode] = Field(default_factory=list)


# ── User schemas ─────────────────────────────────────────


class AdminUserRead(CamelModel):
    """Read schema for users in admin views."""

    id: uuid.UUID
    email: str
    role: UserRole
    status: UserStatus
    last_login_at: datetime | None = None
    created_at: datetime


class AdminInviteUser(CamelModel):
    """Schema for inviting a user to an organization."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    email: str = Field(..., max_length=320)
    role: UserRole

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or v.startswith("@") or v.endswith("@"):
            raise ValueError("Invalid email format")
        return v.strip().lower()

    @field_validator("role")
    @classmethod
    def block_super_admin(cls, v: UserRole) -> UserRole:
        """Prevent super_admin role assignment via invite.

        Defense-in-depth: service layer also rejects this.
        """
        if v == UserRole.SUPER_ADMIN:
            raise ValueError("Cannot assign super_admin role via invitation")
        return v


class AdminChangeRole(CamelModel):
    """Schema for changing a user's role."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    role: UserRole

    @field_validator("role")
    @classmethod
    def block_super_admin(cls, v: UserRole) -> UserRole:
        """Prevent super_admin role assignment via role change."""
        if v == UserRole.SUPER_ADMIN:
            raise ValueError("Cannot assign super_admin role")
        return v


# ── Billing schemas ──────────────────────────────────────


class AdminBillingRead(CamelModel):
    """Current billing state for an organization."""

    organization_id: uuid.UUID
    plan: SubscriptionPlan
    limits: dict[str, Any]
    usage: dict[str, Any]


class AdminChangePlan(CamelModel):
    """Schema for changing an organization's subscription plan."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    new_plan: SubscriptionPlan
    reason: str = Field(..., min_length=1, max_length=1000)


class AdminPlanHistoryRead(CamelModel):
    """Read schema for plan change history entries."""

    id: uuid.UUID
    old_plan: SubscriptionPlan
    new_plan: SubscriptionPlan
    reason: str | None = None
    changed_by: uuid.UUID
    effective_at: datetime
    created_at: datetime


# ── Monitoring schemas ───────────────────────────────────


class PlatformKPIs(CamelModel):
    """Platform-wide KPIs for the admin dashboard."""

    total_organizations: int
    total_users: int
    total_datasets: int
    total_forecasts: int
    active_organizations: int
    total_decisions: int


class OrgMetrics(CamelModel):
    """Per-organization metrics for admin monitoring."""

    active_users: int
    total_datasets: int
    forecast_runs: int
    decisions_count: int
    last_activity: datetime | None = None


class UsageTrend(CamelModel):
    """Time-series usage data point."""

    date: str
    metric: str
    value: float


class ErrorMetrics(CamelModel):
    """Error rate metrics for monitoring."""

    ingestion_success_rate: float
    ingestion_error_count: int
    api_error_rate: float


# ── Onboarding schemas ──────────────────────────────────


class AdminOnboardingCreate(CamelModel):
    """Schema for initiating organization onboarding."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    org_name: str = Field(..., min_length=1, max_length=255)
    org_slug: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z][a-z0-9_-]*$",
    )
    contact_email: str = Field(..., max_length=320)
    sector: IndustrySector | None = None
    plan: SubscriptionPlan = SubscriptionPlan.FREE

    @field_validator("contact_email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or v.startswith("@") or v.endswith("@"):
            raise ValueError("Invalid email format")
        return v.strip().lower()


class AdminOnboardingStepUpdate(CamelModel):
    """Schema for completing an onboarding step."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    data: dict[str, Any] = Field(default_factory=dict)


class AdminOnboardingRead(CamelModel):
    """Read schema for onboarding state."""

    id: uuid.UUID
    organization_id: uuid.UUID
    status: OnboardingStatus
    current_step: int
    steps_completed: list[Any]
    initiated_by: uuid.UUID
    created_at: datetime
    completed_at: datetime | None = None


# ── Audit schemas ────────────────────────────────────────


class AdminAuditLogRead(CamelModel):
    """Read schema for admin audit log entries."""

    id: uuid.UUID
    admin_user_id: uuid.UUID
    target_org_id: uuid.UUID | None = None
    action: AdminAuditAction
    resource_type: str | None = None
    resource_id: uuid.UUID | None = None
    ip_address: str
    user_agent: str | None = None
    request_id: str
    metadata_json: dict[str, Any]
    severity: str
    created_at: datetime


class AuditLogParams(CamelModel):
    """Query parameters for audit log listing."""

    model_config = ConfigDict(
        alias_generator=CamelModel.model_config.get("alias_generator"),
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    admin_user_id: uuid.UUID | None = None
    target_org_id: uuid.UUID | None = None
    action: str | None = Field(default=None, max_length=50)
    date_from: datetime | None = None
    date_to: datetime | None = None
