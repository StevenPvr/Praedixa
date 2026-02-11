"""UX-focused schemas for decision workspaces, preferences, and telemetry.

Security notes:
- Patch/input schemas use extra='forbid' to block mass assignment.
- Product event batch size is capped to prevent abuse.
- User preference payloads are typed and constrained to known values.
"""

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import ConfigDict, Field, field_validator

from app.models.operational import CoverageAlertSeverity, Horizon, ShiftType
from app.schemas.base import CamelModel
from app.schemas.operational import CoverageAlertRead, ScenarioOptionRead

UserLanguage = Literal["fr", "en"]
UiDensity = Literal["comfortable", "compact"]
ProductEventName = Literal[
    "decision_queue_opened",
    "decision_option_selected",
    "decision_validated",
    "time_to_decision_ms",
    "onboarding_step_completed",
]
_MAX_COACHMARKS = 100
_MAX_COACHMARK_LENGTH = 80


class DecisionQueueItemRead(CamelModel):
    """Lightweight queue row optimized for triage in the client UX."""

    id: uuid.UUID
    site_id: str
    alert_date: date
    shift: ShiftType
    severity: CoverageAlertSeverity
    horizon: Horizon | None = None
    gap_h: float
    p_rupture: float | None = None
    drivers_json: list[str] = Field(default_factory=list)
    priority_score: float | None = None
    estimated_impact_eur: float | None = None
    time_to_breach_hours: float | None = None


class DecisionDiagnosticRead(CamelModel):
    """Additional context shown next to options in the decision workspace."""

    top_drivers: list[str] = Field(default_factory=list)
    confidence_pct: float | None = Field(default=None, ge=0, le=100)
    risk_trend: Literal["improving", "stable", "worsening"] | None = None
    note: str | None = Field(default=None, max_length=500)


class DecisionWorkspaceRead(CamelModel):
    """Single payload for split-view operational decision making."""

    alert: CoverageAlertRead
    options: list[ScenarioOptionRead]
    recommended_option_id: uuid.UUID | None = None
    diagnostic: DecisionDiagnosticRead | None = None


class UserUxPreferencesRead(CamelModel):
    """Stored UX preferences for the authenticated user."""

    user_id: uuid.UUID | None = None
    language: UserLanguage = "fr"
    density: UiDensity = "comfortable"
    default_landing: str = Field(default="/dashboard", max_length=120)
    dismissed_coachmarks: list[str] = Field(default_factory=list)

    @field_validator("dismissed_coachmarks", mode="before")
    @classmethod
    def validate_dismissed_coachmarks(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            return []
        deduped: list[str] = []
        seen: set[str] = set()
        for raw in value:
            if not isinstance(raw, str):
                continue
            token = raw.strip()
            if not token:
                continue
            token = token[:_MAX_COACHMARK_LENGTH]
            if token in seen:
                continue
            seen.add(token)
            deduped.append(token)
            if len(deduped) >= _MAX_COACHMARKS:
                break
        return deduped


class UserUxPreferencesPatch(CamelModel):
    """Partial update payload for user UX preferences."""

    model_config = ConfigDict(extra="forbid")

    language: UserLanguage | None = None
    density: UiDensity | None = None
    default_landing: str | None = Field(
        default=None,
        max_length=120,
        pattern=r"^/[a-zA-Z0-9/_-]*$",
    )
    dismissed_coachmarks: list[str] | None = None

    @field_validator("dismissed_coachmarks", mode="before")
    @classmethod
    def validate_patch_dismissed_coachmarks(cls, value: Any) -> list[str] | None:
        if value is None:
            return None
        if not isinstance(value, list):
            return []
        deduped: list[str] = []
        seen: set[str] = set()
        for raw in value:
            if not isinstance(raw, str):
                continue
            token = raw.strip()
            if not token:
                continue
            token = token[:_MAX_COACHMARK_LENGTH]
            if token in seen:
                continue
            seen.add(token)
            deduped.append(token)
            if len(deduped) >= _MAX_COACHMARKS:
                break
        return deduped


class ProductEventIn(CamelModel):
    """Single telemetry event emitted by the product UI."""

    model_config = ConfigDict(extra="forbid")

    name: ProductEventName
    occurred_at: datetime | None = None
    context: dict[str, Any] | None = None


class ProductEventBatchRequest(CamelModel):
    """Batch ingestion payload for product telemetry."""

    model_config = ConfigDict(extra="forbid")

    events: list[ProductEventIn] = Field(min_length=1, max_length=100)


class ProductEventBatchResult(CamelModel):
    """Acknowledgement payload for accepted telemetry events."""

    accepted: int
