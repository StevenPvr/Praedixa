"""Site schemas — request/response models.

Maps to shared-types: Site, Address.
"""

from typing import Any

from pydantic import ConfigDict

from app.schemas.base import CamelModel, TenantEntitySchema


class SiteRead(TenantEntitySchema):
    """Full site response."""

    name: str
    code: str | None = None
    address: dict[str, Any] | None = None
    timezone: str
    working_days_config: dict[str, Any] | None = None
    headcount: int
    capacity_units: str | None = None


class SiteCreate(CamelModel):
    """Create site request."""

    model_config = ConfigDict(extra="forbid")

    name: str
    code: str | None = None
    address: dict[str, Any] | None = None
    timezone: str = "Europe/Paris"
    working_days_config: dict[str, Any] | None = None
    headcount: int = 0
    capacity_units: str | None = None


class SiteUpdate(CamelModel):
    """Update site request."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    code: str | None = None
    address: dict[str, Any] | None = None
    timezone: str | None = None
    working_days_config: dict[str, Any] | None = None
    headcount: int | None = None
    capacity_units: str | None = None
