"""Operational layer models — canonical records, cost parameters, coverage
alerts, scenario options, decisions, and proof-of-value records.

These models power the real-time operational decision engine:
1. CanonicalRecord: unified charge/capacity data after ingestion pipeline
2. CostParameter: versioned cost coefficients per site
3. CoverageAlert: probabilistic understaffing alerts from the forecast engine
4. ScenarioOption: Pareto-optimal remediation options per alert
5. OperationalDecision: manager decision + observed outcome tracking
6. ProofRecord: monthly aggregated ROI proof-of-value per site

Security notes:
- All models use TenantMixin (organization_id isolation via JWT context).
- CanonicalRecord and ProofRecord have UniqueConstraint to prevent duplicates.
- ScenarioOption.contraintes_json and CoverageAlert.drivers_json are
  server-computed — never sourced from client input directly.
- OperationalDecision.decided_by is injected from the JWT, not client body.
- CostParameter.effective_from/effective_until enable temporal versioning
  without mutating existing rows.
"""

import datetime
import enum
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, sa_enum

# ── Enums ────────────────────────────────────────────────


class ShiftType(str, enum.Enum):
    """Work shift within a day."""

    AM = "am"
    PM = "pm"


class Horizon(str, enum.Enum):
    """Forecast horizon for coverage alerts."""

    J3 = "j3"
    J7 = "j7"
    J14 = "j14"


class ScenarioOptionType(str, enum.Enum):
    """Types of remediation actions for coverage gaps."""

    HS = "hs"
    INTERIM = "interim"
    REALLOC_INTRA = "realloc_intra"
    REALLOC_INTER = "realloc_inter"
    SERVICE_ADJUST = "service_adjust"
    OUTSOURCE = "outsource"


class CoverageAlertSeverity(str, enum.Enum):
    """Severity levels for coverage alerts."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CoverageAlertStatus(str, enum.Enum):
    """Lifecycle status of a coverage alert."""

    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    EXPIRED = "expired"


# ── Models ───────────────────────────────────────────────


class CanonicalRecord(TenantMixin, Base):
    """Unified charge/capacity record after data ingestion and quality pipeline.

    Combines data from multiple HR sources (Lucca, PayFit, XLSX, CSV) into a
    single canonical format. Each record represents one site-shift-competence
    data point for a given date.

    The unique constraint prevents duplicate ingestion of the same data point.
    """

    __tablename__ = "canonical_records"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "site_id",
            "date",
            "shift",
            "competence",
            name="uq_canonical_record",
        ),
        Index(
            "ix_canonical_records_org_site_date",
            "organization_id",
            "site_id",
            "date",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    site_id: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    shift: Mapped[ShiftType] = mapped_column(sa_enum(ShiftType), nullable=False)
    competence: Mapped[str | None] = mapped_column(String(100), nullable=True)
    charge_units: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    capacite_plan_h: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    realise_h: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    abs_h: Mapped[Decimal | None] = mapped_column(
        Numeric(8, 2), nullable=True, default=0
    )
    hs_h: Mapped[Decimal | None] = mapped_column(
        Numeric(8, 2), nullable=True, default=0
    )
    interim_h: Mapped[Decimal | None] = mapped_column(
        Numeric(8, 2), nullable=True, default=0
    )
    cout_interne_est: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    def __repr__(self) -> str:
        return f"<CanonicalRecord {self.site_id} {self.date} {self.shift.value}>"


class CostParameter(TenantMixin, Base):
    """Versioned cost coefficients for scenario optimization.

    When site_id is NULL, the row serves as an org-wide default.
    Temporal versioning via effective_from/effective_until allows
    cost changes without mutating existing records.
    """

    __tablename__ = "cost_parameters"
    __table_args__ = (
        Index(
            "ix_cost_parameters_org_site_effective",
            "organization_id",
            "site_id",
            "effective_from",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    site_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    c_int: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    maj_hs: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    c_interim: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    premium_urgence: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), nullable=False, default=0.1000
    )
    c_backlog: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False, default=60.00
    )
    cap_hs_shift: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    cap_interim_site: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    lead_time_jours: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    effective_from: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    effective_until: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    def __repr__(self) -> str:
        return f"<CostParameter site={self.site_id} v{self.version}>"


class CoverageAlert(TenantMixin, Base):
    """Probabilistic understaffing alert from the forecast engine.

    Each alert represents a predicted coverage gap at a specific
    site-shift-horizon. The p_rupture field is the probability of
    the gap materializing (0-1), and gap_h is the estimated deficit
    in hours.

    drivers_json contains the model-generated explanation factors.
    """

    __tablename__ = "coverage_alerts"
    __table_args__ = (
        Index(
            "ix_coverage_alerts_org_status_severity",
            "organization_id",
            "status",
            "severity",
        ),
        Index(
            "ix_coverage_alerts_org_site_date",
            "organization_id",
            "site_id",
            "alert_date",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    site_id: Mapped[str] = mapped_column(String(50), nullable=False)
    alert_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    shift: Mapped[ShiftType] = mapped_column(sa_enum(ShiftType), nullable=False)
    horizon: Mapped[Horizon] = mapped_column(sa_enum(Horizon), nullable=False)
    p_rupture: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    gap_h: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    prediction_interval_low: Mapped[Decimal | None] = mapped_column(
        Numeric(8, 2), nullable=True
    )
    prediction_interval_high: Mapped[Decimal | None] = mapped_column(
        Numeric(8, 2), nullable=True
    )
    model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    calibration_bucket: Mapped[str | None] = mapped_column(String(30), nullable=True)
    impact_eur: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    severity: Mapped[CoverageAlertSeverity] = mapped_column(
        sa_enum(CoverageAlertSeverity), nullable=False
    )
    status: Mapped[CoverageAlertStatus] = mapped_column(
        sa_enum(CoverageAlertStatus),
        nullable=False,
        default=CoverageAlertStatus.OPEN,
    )
    drivers_json: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    acknowledged_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return (
            f"<CoverageAlert {self.site_id} {self.alert_date} "
            f"{self.severity.value}/{self.status.value}>"
        )


class ScenarioOption(TenantMixin, Base):
    """Pareto-optimal remediation option for a coverage alert.

    Each coverage alert can have multiple scenario options. The optimizer
    marks is_pareto_optimal=True for non-dominated solutions and
    is_recommended=True for the system suggestion.

    contraintes_json stores binding constraints (caps, lead-times) that
    shaped this option — computed server-side, never from client input.
    """

    __tablename__ = "scenario_options"
    __table_args__ = (
        Index(
            "ix_scenario_options_alert",
            "coverage_alert_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    coverage_alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("coverage_alerts.id", ondelete="CASCADE"),
        nullable=False,
    )
    cost_parameter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cost_parameters.id", ondelete="RESTRICT"),
        nullable=False,
    )
    option_type: Mapped[ScenarioOptionType] = mapped_column(
        sa_enum(ScenarioOptionType), nullable=False
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    cout_total_eur: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    service_attendu_pct: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    heures_couvertes: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    feasibility_score: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    risk_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    policy_compliance: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    dominance_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    recommendation_policy_version: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    is_pareto_optimal: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    is_recommended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    contraintes_json: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")

    def __repr__(self) -> str:
        return (
            f"<ScenarioOption {self.option_type.value} "
            f"cost={self.cout_total_eur} pareto={self.is_pareto_optimal}>"
        )


class OperationalDecision(TenantMixin, Base):
    """Manager decision on a coverage alert with outcome tracking.

    Links a coverage alert to the chosen scenario option. Supports
    override decisions (is_override=True) where the manager deviates
    from the system recommendation, with mandatory override_reason.

    cout_observe_eur and service_observe_pct are backfilled after the
    decision date to enable proof-of-value calculations.
    """

    __tablename__ = "operational_decisions"
    __table_args__ = (
        Index(
            "ix_operational_decisions_org_site_date",
            "organization_id",
            "site_id",
            "decision_date",
        ),
        Index(
            "ix_operational_decisions_org_override",
            "organization_id",
            "is_override",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    coverage_alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("coverage_alerts.id", ondelete="CASCADE"),
        nullable=False,
    )
    recommended_option_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scenario_options.id", ondelete="SET NULL"),
        nullable=True,
    )
    chosen_option_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scenario_options.id", ondelete="SET NULL"),
        nullable=True,
    )
    site_id: Mapped[str] = mapped_column(String(50), nullable=False)
    decision_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    shift: Mapped[ShiftType] = mapped_column(sa_enum(ShiftType), nullable=False)
    horizon: Mapped[Horizon] = mapped_column(sa_enum(Horizon), nullable=False)
    gap_h: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    is_override: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    override_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    override_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    exogenous_event_tag: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recommendation_policy_version: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    cout_attendu_eur: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    service_attendu_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    cout_observe_eur: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    service_observe_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    decided_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    comment: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    def __repr__(self) -> str:
        return (
            f"<OperationalDecision {self.site_id} {self.decision_date} "
            f"override={self.is_override}>"
        )


class ProofRecord(TenantMixin, Base):
    """Monthly aggregated ROI proof-of-value per site.

    Compares BAU (business-as-usual) costs against optimized costs to
    demonstrate the platform's value. Each record covers one site-month.

    The unique constraint prevents duplicate monthly records.
    details_json stores per-alert breakdowns for drill-down.
    """

    __tablename__ = "proof_records"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "site_id",
            "month",
            name="uq_proof_record",
        ),
        Index(
            "ix_proof_records_org_month",
            "organization_id",
            "month",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    site_id: Mapped[str] = mapped_column(String(50), nullable=False)
    month: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    cout_bau_eur: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    cout_100_eur: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    cout_reel_eur: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    gain_net_eur: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    service_bau_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    service_reel_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    capture_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    bau_method_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    attribution_confidence: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    adoption_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    alertes_emises: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    alertes_traitees: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    details_json: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")

    def __repr__(self) -> str:
        return f"<ProofRecord {self.site_id} {self.month} gain={self.gain_net_eur}>"
