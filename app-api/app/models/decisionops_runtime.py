"""DecisionOps runtime persistence models.

These tables persist the operational approval, action-dispatch, and ledger
artifacts emitted by the coverage runtime. They intentionally keep searchable
columns first-class while storing the full typed runtime payload as JSONB.

Security notes:
- All tables use TenantMixin for org isolation and inherit server-side
  timestamps from TimestampMixin.
- Full runtime payloads are stored in JSONB snapshots to preserve lineage.
- Ledger revisions are immutable per `(ledger_id, revision)` pair.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, sa_enum


class ApprovalRuntimeStatus(str, enum.Enum):
    REQUESTED = "requested"
    GRANTED = "granted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELED = "canceled"


class ActionDispatchRuntimeStatus(str, enum.Enum):
    DRY_RUN = "dry_run"
    PENDING = "pending"
    DISPATCHED = "dispatched"
    ACKNOWLEDGED = "acknowledged"
    FAILED = "failed"
    RETRIED = "retried"
    CANCELED = "canceled"


class ActionDispatchRuntimeMode(str, enum.Enum):
    DRY_RUN = "dry_run"
    LIVE = "live"
    SANDBOX = "sandbox"


class LedgerRuntimeStatus(str, enum.Enum):
    OPEN = "open"
    MEASURING = "measuring"
    CLOSED = "closed"
    RECALCULATED = "recalculated"
    DISPUTED = "disputed"


class LedgerRuntimeValidationStatus(str, enum.Enum):
    ESTIMATED = "estimated"
    VALIDATED = "validated"
    CONTESTED = "contested"


class DecisionApprovalRecord(TenantMixin, Base):
    """Persisted approval request for a recommendation."""

    __tablename__ = "decision_approvals"
    __table_args__ = (
        UniqueConstraint("approval_id", name="uq_decision_approval_business_id"),
        Index(
            "ix_decision_approvals_org_status_requested",
            "organization_id",
            "status",
            "requested_at",
        ),
        Index(
            "ix_decision_approvals_org_recommendation",
            "organization_id",
            "recommendation_id",
            "rule_step_order",
        ),
        Index(
            "ix_decision_approvals_org_site_requested",
            "organization_id",
            "site_id",
            "requested_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    approval_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operational_decisions.id", ondelete="CASCADE"),
        nullable=False,
    )
    site_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contract_id: Mapped[str] = mapped_column(String(100), nullable=False)
    contract_version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ApprovalRuntimeStatus] = mapped_column(
        sa_enum(ApprovalRuntimeStatus),
        nullable=False,
    )
    approver_role: Mapped[str] = mapped_column(String(80), nullable=False)
    rule_step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    deadline_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    record_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )


class ActionDispatchRuntimeRecord(TenantMixin, Base):
    """Persisted action-dispatch runtime for a recommendation."""

    __tablename__ = "action_dispatches"
    __table_args__ = (
        UniqueConstraint("action_id", name="uq_action_dispatch_business_id"),
        Index(
            "ix_action_dispatches_org_status_created",
            "organization_id",
            "status",
            "created_at",
        ),
        Index(
            "ix_action_dispatches_org_recommendation",
            "organization_id",
            "recommendation_id",
        ),
        Index(
            "ix_action_dispatches_org_approval",
            "organization_id",
            "approval_id",
        ),
        Index(
            "ix_action_dispatches_org_site_created",
            "organization_id",
            "site_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    action_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operational_decisions.id", ondelete="CASCADE"),
        nullable=False,
    )
    approval_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("decision_approvals.approval_id", ondelete="SET NULL"),
        nullable=True,
    )
    site_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contract_id: Mapped[str] = mapped_column(String(100), nullable=False)
    contract_version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ActionDispatchRuntimeStatus] = mapped_column(
        sa_enum(ActionDispatchRuntimeStatus),
        nullable=False,
    )
    dispatch_mode: Mapped[ActionDispatchRuntimeMode] = mapped_column(
        sa_enum(ActionDispatchRuntimeMode),
        nullable=False,
    )
    destination_system: Mapped[str] = mapped_column(String(80), nullable=False)
    destination_type: Mapped[str] = mapped_column(String(80), nullable=False)
    target_resource_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    record_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )


class DecisionLedgerRuntimeRecord(TenantMixin, Base):
    """Persisted ledger revision for a recommendation."""

    __tablename__ = "decision_ledger_entries"
    __table_args__ = (
        UniqueConstraint("ledger_id", "revision", name="uq_decision_ledger_revision"),
        Index(
            "ix_decision_ledger_entries_org_ledger_revision",
            "organization_id",
            "ledger_id",
            "revision",
        ),
        Index(
            "ix_decision_ledger_entries_org_recommendation",
            "organization_id",
            "recommendation_id",
        ),
        Index(
            "ix_decision_ledger_entries_org_action",
            "organization_id",
            "action_id",
        ),
        Index(
            "ix_decision_ledger_entries_org_site_opened",
            "organization_id",
            "site_id",
            "opened_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    ledger_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operational_decisions.id", ondelete="CASCADE"),
        nullable=False,
    )
    action_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("action_dispatches.action_id", ondelete="SET NULL"),
        nullable=True,
    )
    site_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contract_id: Mapped[str] = mapped_column(String(100), nullable=False)
    contract_version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[LedgerRuntimeStatus] = mapped_column(
        sa_enum(LedgerRuntimeStatus),
        nullable=False,
    )
    validation_status: Mapped[LedgerRuntimeValidationStatus] = mapped_column(
        sa_enum(LedgerRuntimeValidationStatus),
        nullable=False,
    )
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    record_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )
