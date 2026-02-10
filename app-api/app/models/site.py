"""Site model — physical location within an organization.

Maps to shared-types: Site, Address.
"""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin


class Site(TenantMixin, Base):
    """Site / physical location.

    Each site belongs to one organization and can have its own
    working days config and timezone.
    """

    __tablename__ = "sites"

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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50))
    # Address stored as JSONB (street, city, postalCode, country, region)
    address: Mapped[dict | None] = mapped_column(JSONB)  # type: ignore[type-arg]
    timezone: Mapped[str] = mapped_column(String(50), default="Europe/Paris")
    # Site-specific working days config override
    working_days_config: Mapped[dict | None] = mapped_column(JSONB)  # type: ignore[type-arg]
    headcount: Mapped[int] = mapped_column(default=0)
    capacity_units: Mapped[str | None] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<Site {self.name}>"
