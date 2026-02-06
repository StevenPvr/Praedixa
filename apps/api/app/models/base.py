"""SQLAlchemy declarative base and mixins.

Security notes:
- TenantMixin enforces organization_id on every tenant-aware table.
  The column is indexed for efficient filtering and is NOT nullable,
  so there is no way to insert a row without tenant assignment.
- TimestampMixin provides audit timestamps via server_default=now()
  to prevent client-side timestamp manipulation.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all models."""


class TimestampMixin:
    """Audit timestamp fields.

    created_at: set once at INSERT via DB server clock (not client).
    updated_at: set at INSERT and refreshed on each UPDATE.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


class TenantMixin(TimestampMixin):
    """Multi-tenant mixin with organization_id.

    Every tenant-scoped table MUST include this mixin.
    The organization_id column is indexed for query performance
    and is NOT nullable — a row cannot exist without a tenant.
    """

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
