"""Organization model — top-level tenant entity.

Maps to shared-types: Organization, OrganizationSettings, OrganizationStatus,
SubscriptionPlan, IndustrySector, OrganizationSize.
"""

import enum
import uuid

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, sa_enum


class OrganizationStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    CHURNED = "churned"


class SubscriptionPlan(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class IndustrySector(str, enum.Enum):
    HEALTHCARE = "healthcare"
    RETAIL = "retail"
    MANUFACTURING = "manufacturing"
    SERVICES = "services"
    TECHNOLOGY = "technology"
    FINANCE = "finance"
    EDUCATION = "education"
    PUBLIC_SECTOR = "public_sector"
    HOSPITALITY = "hospitality"
    LOGISTICS = "logistics"
    OTHER = "other"


class OrganizationSize(str, enum.Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    ENTERPRISE = "enterprise"


class Organization(TimestampMixin, Base):
    """Organization — the root tenant entity.

    All other tenant-scoped entities reference organization.id
    via their organization_id column.
    """

    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    legal_name: Mapped[str | None] = mapped_column(String(255))
    siret: Mapped[str | None] = mapped_column(String(14))
    sector: Mapped[IndustrySector | None] = mapped_column(sa_enum(IndustrySector))
    size: Mapped[OrganizationSize | None] = mapped_column(sa_enum(OrganizationSize))
    headcount: Mapped[int | None] = mapped_column()
    status: Mapped[OrganizationStatus] = mapped_column(
        sa_enum(OrganizationStatus),
        default=OrganizationStatus.TRIAL,
    )
    plan: Mapped[SubscriptionPlan] = mapped_column(
        sa_enum(SubscriptionPlan),
        default=SubscriptionPlan.FREE,
    )
    timezone: Mapped[str] = mapped_column(String(50), default="Europe/Paris")
    locale: Mapped[str] = mapped_column(String(10), default="fr-FR")
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    contact_email: Mapped[str] = mapped_column(String(320), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(Text)
    # JSONB for flexible settings (OrganizationSettings + WorkingDaysConfig)
    settings: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )

    def __repr__(self) -> str:
        return f"<Organization {self.slug}>"
