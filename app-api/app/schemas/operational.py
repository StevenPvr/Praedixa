"""Operational layer schemas — request/response models for the decision engine.

Maps to ORM models in app.models.operational.

Security notes:
- Create/Update requests use extra='forbid' to prevent mass assignment.
- organization_id is NEVER accepted from client — injected from JWT context.
- decided_by is injected server-side from the authenticated user.
- Numeric fields use Field(ge=0) where negative values are invalid.
- All date/datetime fields are properly typed for serialization safety.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import ConfigDict, Field

from app.models.operational import (
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
    ScenarioOptionType,
    ShiftType,
)
from app.schemas.base import CamelModel, TenantEntitySchema

# ── CanonicalRecord schemas ──────────────────────────────


class CanonicalRecordRead(TenantEntitySchema):
    """Full canonical record response."""

    site_id: str
    date: date
    shift: ShiftType
    competence: str | None = None
    charge_units: float | None = None
    capacite_plan_h: float
    realise_h: float | None = None
    abs_h: float | None = None
    hs_h: float | None = None
    interim_h: float | None = None
    cout_interne_est: float | None = None


class CanonicalRecordCreate(CamelModel):
    """Create a single canonical record.

    Validation:
    - site_id is required and limited to 50 chars.
    - capacite_plan_h must be >= 0 (cannot plan negative capacity).
    - extra='forbid' rejects unknown fields.
    """

    model_config = ConfigDict(extra="forbid")

    site_id: str = Field(..., max_length=50)
    date: date
    shift: ShiftType
    competence: str | None = Field(default=None, max_length=100)
    charge_units: Decimal | None = Field(default=None, ge=0)
    capacite_plan_h: Decimal = Field(..., ge=0)
    realise_h: Decimal | None = Field(default=None, ge=0)
    abs_h: Decimal | None = Field(default=None, ge=0)
    hs_h: Decimal | None = Field(default=None, ge=0)
    interim_h: Decimal | None = Field(default=None, ge=0)
    cout_interne_est: Decimal | None = Field(default=None, ge=0)


class CanonicalRecordBulkCreate(CamelModel):
    """Bulk create canonical records.

    Maximum 1000 records per request to prevent memory exhaustion.
    """

    model_config = ConfigDict(extra="forbid")

    records: list[CanonicalRecordCreate] = Field(..., min_length=1, max_length=1000)


# ── CostParameter schemas ───────────────────────────────


class CostParameterRead(TenantEntitySchema):
    """Full cost parameter response."""

    site_id: str | None = None
    version: int
    c_int: float
    maj_hs: float
    c_interim: float
    premium_urgence: float
    c_backlog: float
    cap_hs_shift: int
    cap_interim_site: int
    lead_time_jours: int
    effective_from: date
    effective_until: date | None = None


class CostParameterCreate(CamelModel):
    """Create a new cost parameter set.

    Validation:
    - Cost fields must be >= 0.
    - Rates (maj_hs, premium_urgence) must be between 0 and 1.
    - Capacity caps must be >= 0.
    - extra='forbid' rejects unknown fields.
    """

    model_config = ConfigDict(extra="forbid")

    site_id: str | None = Field(default=None, max_length=50)
    c_int: Decimal = Field(..., ge=0)
    maj_hs: Decimal = Field(..., ge=0, le=1)
    c_interim: Decimal = Field(..., ge=0)
    premium_urgence: Decimal = Field(default=Decimal("0.1000"), ge=0, le=1)
    c_backlog: Decimal = Field(default=Decimal("60.00"), ge=0)
    cap_hs_shift: int = Field(default=30, ge=0)
    cap_interim_site: int = Field(default=50, ge=0)
    lead_time_jours: int = Field(default=2, ge=0)
    effective_from: date


# ── CoverageAlert schemas ───────────────────────────────


class CoverageAlertRead(TenantEntitySchema):
    """Full coverage alert response."""

    site_id: str
    alert_date: date
    shift: ShiftType
    horizon: Horizon
    p_rupture: float
    gap_h: float
    prediction_interval_low: float | None = None
    prediction_interval_high: float | None = None
    model_version: str | None = None
    calibration_bucket: str | None = None
    impact_eur: float | None = None
    severity: CoverageAlertSeverity
    status: CoverageAlertStatus
    drivers_json: list[Any] = Field(default_factory=list)
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None


class CoverageAlertAcknowledge(CamelModel):
    """Acknowledge a coverage alert.

    No fields needed — the server sets acknowledged_at and status.
    extra='forbid' prevents injection of status or timestamps.
    """

    model_config = ConfigDict(extra="forbid")


class CoverageAlertResolve(CamelModel):
    """Resolve a coverage alert.

    No fields needed — the server sets resolved_at and status.
    extra='forbid' prevents injection of status or timestamps.
    """

    model_config = ConfigDict(extra="forbid")


# ── ScenarioOption schemas ──────────────────────────────


class ScenarioOptionRead(TenantEntitySchema):
    """Full scenario option response."""

    coverage_alert_id: uuid.UUID
    cost_parameter_id: uuid.UUID
    option_type: ScenarioOptionType
    label: str
    cout_total_eur: float
    service_attendu_pct: float
    heures_couvertes: float
    feasibility_score: float | None = None
    risk_score: float | None = None
    policy_compliance: bool = False
    dominance_reason: str | None = None
    recommendation_policy_version: str | None = None
    is_pareto_optimal: bool
    is_recommended: bool
    contraintes_json: dict[str, Any] = Field(default_factory=dict)


# ── OperationalDecision schemas ─────────────────────────


class OperationalDecisionRead(TenantEntitySchema):
    """Full operational decision response."""

    coverage_alert_id: uuid.UUID
    recommended_option_id: uuid.UUID | None = None
    chosen_option_id: uuid.UUID | None = None
    site_id: str
    decision_date: date
    shift: ShiftType
    horizon: Horizon
    gap_h: float
    is_override: bool
    override_reason: str | None = None
    override_category: str | None = None
    exogenous_event_tag: str | None = None
    recommendation_policy_version: str | None = None
    cout_attendu_eur: float | None = None
    service_attendu_pct: float | None = None
    cout_observe_eur: float | None = None
    service_observe_pct: float | None = None
    decided_by: uuid.UUID
    comment: str | None = None


class OperationalDecisionCreate(CamelModel):
    """Create an operational decision.

    Validation:
    - coverage_alert_id and chosen_option_id are required UUIDs.
    - override_reason is required when is_override is True (enforced in service).
    - decided_by is NOT in this schema — injected from JWT server-side.
    - extra='forbid' prevents injection of decided_by or observed fields.
    """

    model_config = ConfigDict(extra="forbid")

    coverage_alert_id: uuid.UUID
    chosen_option_id: uuid.UUID | None = None
    is_override: bool = False
    override_reason: str | None = Field(default=None, max_length=500)
    override_category: str | None = Field(default=None, max_length=50)
    exogenous_event_tag: str | None = Field(default=None, max_length=100)
    comment: str | None = Field(default=None, max_length=1000)


class OperationalDecisionUpdate(CamelModel):
    """Update an operational decision (observed outcomes).

    Only observed cost/service fields and comment are updatable.
    extra='forbid' prevents mutation of decided_by, site_id, etc.
    """

    model_config = ConfigDict(extra="forbid")

    cout_observe_eur: Decimal | None = Field(default=None, ge=0)
    service_observe_pct: Decimal | None = Field(default=None, ge=0, le=1)
    exogenous_event_tag: str | None = Field(default=None, max_length=100)
    comment: str | None = Field(default=None, max_length=1000)


# ── ProofRecord schemas ─────────────────────────────────


class ProofRecordRead(TenantEntitySchema):
    """Full proof record response."""

    site_id: str
    month: date
    cout_bau_eur: float
    cout_100_eur: float
    cout_reel_eur: float
    gain_net_eur: float
    service_bau_pct: float | None = None
    service_reel_pct: float | None = None
    capture_rate: float | None = None
    bau_method_version: str | None = None
    attribution_confidence: float | None = None
    adoption_pct: float | None = None
    alertes_emises: int
    alertes_traitees: int
    details_json: dict[str, Any] = Field(default_factory=dict)


class ProofSummaryResponse(CamelModel):
    """Aggregated proof-of-value summary across sites/months."""

    total_gain_net_eur: float
    avg_adoption_pct: float | None = None
    avg_capture_rate: float | None = None
    total_alertes_emises: int
    total_alertes_traitees: int
    records: list[ProofRecordRead]


# ── Pareto Frontier schemas ─────────────────────────────


class ParetoFrontierResponse(CamelModel):
    """Pareto frontier with all options and recommendation for an alert."""

    alert_id: uuid.UUID
    options: list[ScenarioOptionRead]
    pareto_frontier: list[ScenarioOptionRead]
    recommended: ScenarioOptionRead | None = None


# ── Canonical Quality Dashboard schemas ─────────────────


class CanonicalQualityDashboard(CamelModel):
    """Quality metrics for canonical data coverage."""

    total_records: int
    coverage_pct: float
    sites: int
    date_range: list[str] = Field(default_factory=list)
    missing_shifts_pct: float
    avg_abs_pct: float


# ── Override Statistics schema ───────────────────────────


class OverrideStatisticsResponse(CamelModel):
    """Aggregate override statistics for operational decisions."""

    total_decisions: int
    override_count: int
    override_pct: float
    top_override_reasons: list[dict[str, str | int]]
    avg_cost_delta: float | None = None


# ── Mock Forecast Trigger schemas ────────────────────────


class MockForecastTriggerRequest(CamelModel):
    """Request to trigger mock forecast generation.

    Used in demo/staging environments to generate sample alerts.
    """

    model_config = ConfigDict(extra="forbid")

    days_lookback: int = Field(default=30, ge=1, le=365)


class MockForecastTriggerResponse(CamelModel):
    """Response from mock forecast trigger."""

    alerts_generated: int
    message: str
