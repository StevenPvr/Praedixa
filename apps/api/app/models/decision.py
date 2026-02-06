"""Decision model — recommendations and validated actions.

Maps to shared-types: Decision, DecisionType, DecisionStatus,
DecisionPriority, DecisionOutcome.
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, sa_enum


class DecisionType(str, enum.Enum):
    REPLACEMENT = "replacement"
    REDISTRIBUTION = "redistribution"
    POSTPONEMENT = "postponement"
    OVERTIME = "overtime"
    EXTERNAL = "external"
    TRAINING = "training"
    NO_ACTION = "no_action"


class DecisionStatus(str, enum.Enum):
    SUGGESTED = "suggested"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"
    EXPIRED = "expired"


class DecisionPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Decision(TenantMixin, Base):
    """Decision/Recommendation entity.

    Decisions are either AI-suggested or manually created.
    They track the full lifecycle: suggestion -> review -> implementation -> outcome.
    """

    __tablename__ = "decisions"

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
    forecast_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forecast_runs.id", ondelete="SET NULL"),
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Target period stored as JSONB (DateRange: startDate, endDate)
    target_period: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False
    )
    type: Mapped[DecisionType] = mapped_column(sa_enum(DecisionType), nullable=False)
    priority: Mapped[DecisionPriority] = mapped_column(
        sa_enum(DecisionPriority), nullable=False
    )
    status: Mapped[DecisionStatus] = mapped_column(
        sa_enum(DecisionStatus),
        default=DecisionStatus.SUGGESTED,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    # RiskIndicators as JSONB
    risk_indicators: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )
    estimated_cost: Mapped[float | None] = mapped_column(Numeric(12, 2))
    cost_of_inaction: Mapped[float | None] = mapped_column(Numeric(12, 2))
    estimated_roi: Mapped[float | None] = mapped_column(Numeric(8, 2))
    confidence_score: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False
    )
    related_employee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
    )
    suggested_replacement_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    manager_notes: Mapped[str | None] = mapped_column(Text)
    implementation_deadline: Mapped[date | None] = mapped_column(Date)
    implemented_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    implemented_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    # DecisionOutcome as JSONB
    outcome: Mapped[dict | None] = mapped_column(JSONB)  # type: ignore[type-arg]

    def __repr__(self) -> str:
        return f"<Decision {self.type.value} {self.status.value}>"
