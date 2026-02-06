"""Absence model — core business entity for leave tracking.

Maps to shared-types: Absence, AbsenceType, AbsenceCategory, AbsenceStatus,
DayPortion.
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, sa_enum


class AbsenceType(str, enum.Enum):
    PAID_LEAVE = "paid_leave"
    RTT = "rtt"
    SICK_LEAVE = "sick_leave"
    SICK_LEAVE_WORKPLACE = "sick_leave_workplace"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    PARENTAL = "parental"
    BEREAVEMENT = "bereavement"
    WEDDING = "wedding"
    MOVING = "moving"
    UNPAID_LEAVE = "unpaid_leave"
    TRAINING = "training"
    REMOTE_WORK = "remote_work"
    OTHER = "other"


class AbsenceCategory(str, enum.Enum):
    PLANNED = "planned"
    UNPLANNED = "unplanned"
    STATUTORY = "statutory"


class AbsenceStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class DayPortion(str, enum.Enum):
    FULL = "full"
    MORNING = "morning"
    AFTERNOON = "afternoon"


class Absence(TenantMixin, Base):
    """Absence record.

    Tracks leave periods for employees with full audit trail
    (who approved, when, with what reason).
    """

    __tablename__ = "absences"

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
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[AbsenceType] = mapped_column(sa_enum(AbsenceType), nullable=False)
    category: Mapped[AbsenceCategory] = mapped_column(
        sa_enum(AbsenceCategory), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_portion: Mapped[DayPortion] = mapped_column(
        sa_enum(DayPortion), default=DayPortion.FULL
    )
    end_portion: Mapped[DayPortion] = mapped_column(
        sa_enum(DayPortion), default=DayPortion.FULL
    )
    # Duration as JSONB (days, workingDays, calendarDays)
    duration: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )
    business_days: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[AbsenceStatus] = mapped_column(
        sa_enum(AbsenceStatus), default=AbsenceStatus.DRAFT
    )
    reason: Mapped[str | None] = mapped_column(Text)
    manager_comment: Mapped[str | None] = mapped_column(Text)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    approver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    decision_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    medical_certificate_required: Mapped[bool] = mapped_column(default=False)
    medical_certificate_uploaded: Mapped[bool] = mapped_column(default=False)
    replacement_employee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
    )
    source_system: Mapped[str | None] = mapped_column(String(100))
    external_id: Mapped[str | None] = mapped_column(String(255))
    # Recurrence pattern (RecurrencePattern from shared-types)
    recurrence_pattern: Mapped[dict | None] = mapped_column(JSONB)  # type: ignore[type-arg]

    def __repr__(self) -> str:
        return f"<Absence {self.type.value} {self.start_date}–{self.end_date}>"
