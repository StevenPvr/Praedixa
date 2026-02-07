"""User schemas — request/response models.

Maps to shared-types: User, UserRole, UserStatus.
"""

import uuid
from datetime import datetime

from pydantic import ConfigDict

from app.models.user import UserRole, UserStatus
from app.schemas.base import CamelModel, TenantEntitySchema


class UserRead(TenantEntitySchema):
    """Full user response."""

    email: str
    email_verified: bool
    role: UserRole
    status: UserStatus
    employee_id: uuid.UUID | None = None
    last_login_at: datetime | None = None
    mfa_enabled: bool
    locale: str | None = None
    timezone: str | None = None


class UserCreate(CamelModel):
    """Create user request."""

    model_config = ConfigDict(extra="forbid")

    email: str
    role: UserRole = UserRole.VIEWER
    employee_id: uuid.UUID | None = None


class UserUpdate(CamelModel):
    """Update user request."""

    model_config = ConfigDict(extra="forbid")

    role: UserRole | None = None
    status: UserStatus | None = None
    employee_id: uuid.UUID | None = None
    locale: str | None = None
    timezone: str | None = None
