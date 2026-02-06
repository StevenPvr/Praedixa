"""ActionPlan model — aggregated decision plans.

Maps to shared-types: ActionPlan.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, sa_enum


class ActionPlanStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ActionPlan(TenantMixin, Base):
    """Action plan grouping multiple decisions.

    Used by managers to bundle related decisions for CODIR review
    and track aggregate costs/savings.
    """

    __tablename__ = "action_plans"

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
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # Period stored as JSONB (DateRange: startDate, endDate)
    period: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False
    )
    status: Mapped[ActionPlanStatus] = mapped_column(
        sa_enum(ActionPlanStatus),
        default=ActionPlanStatus.DRAFT,
    )
    # Decision IDs are stored in a junction table or as JSONB array for POC
    decisions: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="[]"
    )
    total_estimated_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    total_estimated_savings: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return f"<ActionPlan {self.name}>"
