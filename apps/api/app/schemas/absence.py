"""Absence schemas — request/response models.

Maps to shared-types: Absence, AbsenceSummary, AbsenceRequest.
"""

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import ConfigDict, Field

from app.models.absence import (
    AbsenceCategory,
    AbsenceStatus,
    AbsenceType,
    DayPortion,
)
from app.schemas.base import CamelModel, TenantEntitySchema


class AbsenceRead(TenantEntitySchema):
    """Full absence response."""

    employee_id: uuid.UUID
    type: AbsenceType
    category: AbsenceCategory
    start_date: date
    end_date: date
    start_portion: DayPortion
    end_portion: DayPortion
    duration: dict[str, Any]
    business_days: int
    status: AbsenceStatus
    reason: str | None = None
    manager_comment: str | None = None
    rejection_reason: str | None = None
    approver_id: uuid.UUID | None = None
    decision_at: datetime | None = None
    medical_certificate_required: bool
    medical_certificate_uploaded: bool
    replacement_employee_id: uuid.UUID | None = None
    source_system: str | None = None
    external_id: str | None = None
    recurrence_pattern: dict[str, Any] | None = None


class AbsenceSummary(CamelModel):
    """Lightweight absence for listings."""

    id: uuid.UUID
    employee_id: uuid.UUID
    type: AbsenceType
    category: AbsenceCategory
    start_date: date
    end_date: date
    duration: dict[str, Any]
    status: AbsenceStatus


class AbsenceCreate(CamelModel):
    """Create absence request."""

    model_config = ConfigDict(extra="forbid")

    employee_id: uuid.UUID
    type: AbsenceType
    start_date: date
    end_date: date
    start_portion: DayPortion = DayPortion.FULL
    end_portion: DayPortion = DayPortion.FULL
    reason: str | None = None
    recurrence_pattern: dict[str, Any] | None = None


class AbsenceUpdate(CamelModel):
    """Update absence request."""

    model_config = ConfigDict(extra="forbid")

    start_date: date | None = None
    end_date: date | None = None
    start_portion: DayPortion | None = None
    end_portion: DayPortion | None = None
    reason: str | None = None


class AbsenceDecisionRequest(CamelModel):
    """Approve or reject an absence."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["approve", "reject"]
    comment: str | None = Field(default=None, max_length=2000)
    rejection_reason: str | None = Field(default=None, max_length=2000)
