"""Department model — team/unit within a site.

Maps to shared-types: Department.
"""

import uuid

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin


class Department(TenantMixin, Base):
    """Department/Team within an organization.

    A department belongs to a site and an organization.
    The parent_id allows hierarchical department trees.
    """

    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sites.id", ondelete="SET NULL"),
        index=True,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
    )
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        # FK to users deferred to avoid circular imports; enforced at app level
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50))
    cost_center: Mapped[str | None] = mapped_column(String(50))
    headcount: Mapped[int] = mapped_column(Integer, default=0)
    min_staffing_level: Mapped[float] = mapped_column(
        Numeric(5, 2), default=80.0
    )
    critical_roles_count: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<Department {self.name}>"
