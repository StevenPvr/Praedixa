"""Decision schemas — request/response models.

Maps to shared-types: Decision, DecisionSummary, DecisionOutcome.
"""

import uuid
from datetime import date, datetime
from typing import Any

from app.models.decision import DecisionPriority, DecisionStatus, DecisionType
from app.schemas.base import CamelModel, TenantEntitySchema


class DecisionRead(TenantEntitySchema):
    """Full decision response."""

    forecast_run_id: uuid.UUID | None = None
    department_id: uuid.UUID
    target_period: dict[str, Any]
    type: DecisionType
    priority: DecisionPriority
    status: DecisionStatus
    title: str
    description: str
    rationale: str
    risk_indicators: dict[str, Any]
    estimated_cost: float | None = None
    cost_of_inaction: float | None = None
    estimated_roi: float | None = None
    confidence_score: float
    related_employee_id: uuid.UUID | None = None
    suggested_replacement_id: uuid.UUID | None = None
    reviewed_by: uuid.UUID | None = None
    reviewed_at: datetime | None = None
    manager_notes: str | None = None
    implementation_deadline: date | None = None
    implemented_by: uuid.UUID | None = None
    implemented_at: datetime | None = None
    outcome: dict[str, Any] | None = None


class DecisionSummary(CamelModel):
    """Lightweight decision for listings."""

    id: uuid.UUID
    type: DecisionType
    priority: DecisionPriority
    status: DecisionStatus
    title: str
    target_period: dict[str, Any]
    department_id: uuid.UUID
    estimated_cost: float | None = None
    cost_of_inaction: float | None = None
    confidence_score: float


class ReviewDecisionRequest(CamelModel):
    """Review a decision (approve/reject/defer)."""

    action: str  # "approve" | "reject" | "defer"
    notes: str | None = None
    implementation_deadline: date | None = None


class RecordDecisionOutcomeRequest(CamelModel):
    """Record the outcome of an implemented decision."""

    effective: bool
    actual_cost: float | None = None
    actual_impact: str
    lessons_learned: str | None = None
