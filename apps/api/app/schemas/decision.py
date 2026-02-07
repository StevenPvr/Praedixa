"""Decision schemas — request/response models.

Maps to shared-types: Decision, DecisionSummary, DecisionOutcome.
"""

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import ConfigDict, Field

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


class CreateDecisionRequest(CamelModel):
    """Create a new decision.

    Validation:
    - title/description/rationale have max_length enforced by Pydantic.
    - estimated_cost and cost_of_inaction must be >= 0 if provided.
    - confidence_score is bounded [0, 100].
    - type and priority are enum-validated (allowlist).
    - extra='forbid' rejects unknown fields to prevent mass assignment
      (e.g. injecting reviewed_by, organization_id, or status).
    """

    model_config = ConfigDict(extra="forbid")

    department_id: uuid.UUID
    type: DecisionType
    priority: DecisionPriority
    title: str = Field(max_length=500)
    description: str = Field(max_length=5000)
    rationale: str = Field(max_length=5000)
    target_period: dict[str, Any]
    estimated_cost: float | None = Field(default=None, ge=0)
    cost_of_inaction: float | None = Field(default=None, ge=0)
    confidence_score: float = Field(ge=0, le=100)
    risk_indicators: dict[str, Any] = Field(default_factory=dict)


class ReviewDecisionRequest(CamelModel):
    """Review a decision (approve/reject/defer).

    Uses Literal type for action to enforce allowlist validation
    at the Pydantic layer (rejects any value not in the set).
    extra='forbid' prevents injection of reviewed_by or status fields.
    """

    model_config = ConfigDict(extra="forbid")

    action: Literal["approve", "reject", "defer"]
    notes: str | None = Field(default=None, max_length=2000)
    implementation_deadline: date | None = None


class RecordDecisionOutcomeRequest(CamelModel):
    """Record the outcome of an implemented decision.

    Validation:
    - actual_cost must be >= 0 if provided.
    - actual_impact and lessons_learned have max_length limits.
    - extra='forbid' prevents injection of implemented_by or status fields.
    """

    model_config = ConfigDict(extra="forbid")

    effective: bool
    actual_cost: float | None = Field(default=None, ge=0)
    actual_impact: str = Field(max_length=5000)
    lessons_learned: str | None = Field(default=None, max_length=5000)
