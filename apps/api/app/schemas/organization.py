"""Organization schemas — request/response models.

Maps to shared-types: Organization, OrganizationSettings,
OrganizationSummary.
"""

import uuid
from typing import Any

from pydantic import ConfigDict

from app.models.organization import (
    IndustrySector,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.schemas.base import CamelModel, TenantEntitySchema


class OrganizationRead(TenantEntitySchema):
    """Full organization response (no organization_id — it IS the org)."""

    # Override: org doesn't have a separate org_id field
    organization_id: uuid.UUID | None = None  # type: ignore[assignment]

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


class OrganizationSummary(CamelModel):
    """Lightweight organization response for listings."""

    id: uuid.UUID
    name: str
    slug: str
    status: OrganizationStatus
    plan: SubscriptionPlan
    headcount: int | None = None
    sector: IndustrySector | None = None


class OrganizationUpdate(CamelModel):
    """Update organization request."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    legal_name: str | None = None
    sector: IndustrySector | None = None
    size: OrganizationSize | None = None
    headcount: int | None = None
    timezone: str | None = None
    locale: str | None = None
    currency: str | None = None
    contact_email: str | None = None
    logo_url: str | None = None
    settings: dict[str, Any] | None = None
