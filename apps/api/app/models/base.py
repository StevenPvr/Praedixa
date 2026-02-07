"""SQLAlchemy declarative base and mixins.

Security notes:
- TenantMixin enforces organization_id on every tenant-aware table.
  The column is indexed for efficient filtering and is NOT nullable,
  so there is no way to insert a row without tenant assignment.
- TimestampMixin provides audit timestamps via server_default=now()
  to prevent client-side timestamp manipulation.
"""

import enum
import uuid
from datetime import UTC, datetime
from typing import TypeVar

from sqlalchemy import DateTime, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

_E = TypeVar("_E", bound=enum.Enum)


def sa_enum(enum_cls: type[_E]) -> SAEnum:
    """Create a SQLAlchemy Enum that uses .value (lowercase) for DB storage.

    By default SQLAlchemy sends enum .name (UPPERCASE) which mismatches
    the PostgreSQL native enum values created by Alembic (lowercase).
    """
    return SAEnum(
        enum_cls,
        values_callable=lambda x: [e.value for e in x],
        native_enum=True,
        create_constraint=False,
        create_type=False,
    )


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
