"""Department schemas — request/response models.

Maps to shared-types: Department.
"""

import uuid

from pydantic import ConfigDict

from app.schemas.base import CamelModel, TenantEntitySchema


class DepartmentRead(TenantEntitySchema):
    """Full department response."""

    site_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    manager_id: uuid.UUID | None = None
    name: str
    code: str | None = None
    cost_center: str | None = None
    headcount: int
    min_staffing_level: float
    critical_roles_count: int


class DepartmentCreate(CamelModel):
    """Create department request."""

    model_config = ConfigDict(extra="forbid")

    site_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    manager_id: uuid.UUID | None = None
    name: str
    code: str | None = None
    cost_center: str | None = None
    headcount: int = 0
    min_staffing_level: float = 80.0
    critical_roles_count: int = 0


class DepartmentUpdate(CamelModel):
    """Update department request."""

    model_config = ConfigDict(extra="forbid")

    site_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    manager_id: uuid.UUID | None = None
    name: str | None = None
    code: str | None = None
    cost_center: str | None = None
    headcount: int | None = None
    min_staffing_level: float | None = None
    critical_roles_count: int | None = None
