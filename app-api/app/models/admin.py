"""Admin back-office models — audit log, plan changes, onboarding state.

These models are NOT tenant-scoped (no TenantMixin) because they track
cross-organization actions performed by super_admin users.

Security notes:
- AdminAuditLog is append-only by design. The table has no UPDATE or
  DELETE endpoints, and a DB trigger should enforce immutability in production.
- ip_address and user_agent are captured server-side from the request,
  never from client-supplied body fields.
- metadata_json stores server-computed context, not raw client input.
- PlanChangeHistory captures both old_plan and new_plan for audit trail.
- OnboardingState uses a unique constraint on organization_id to enforce
  one onboarding per org.
- All enums use sa_enum() to store lowercase .value in PostgreSQL.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, sa_enum
from app.models.organization import SubscriptionPlan

# ── Enums ────────────────────────────────────────────────


class AdminAuditAction(str, enum.Enum):
    """Actions tracked in the admin audit log.

    Each value corresponds to a specific admin operation.
    New actions must be added here AND to the Alembic migration enum.
    """

    VIEW_ORG = "view_org"
    UPDATE_ORG = "update_org"
    CREATE_ORG = "create_org"
    SUSPEND_ORG = "suspend_org"
    REACTIVATE_ORG = "reactivate_org"
    CHURN_ORG = "churn_org"
    VIEW_USERS = "view_users"
    INVITE_USER = "invite_user"
    CHANGE_ROLE = "change_role"
    DEACTIVATE_USER = "deactivate_user"
    REACTIVATE_USER = "reactivate_user"
    VIEW_DATASETS = "view_datasets"
    VIEW_DATA = "view_data"
    CHANGE_PLAN = "change_plan"
    VIEW_MONITORING = "view_monitoring"
    VIEW_MIRROR = "view_mirror"
    VIEW_FEATURES = "view_features"
    ONBOARDING_STEP = "onboarding_step"
    VIEW_CANONICAL = "view_canonical"
    VIEW_COST_PARAMS = "view_cost_params"
    VIEW_COVERAGE_ALERTS = "view_coverage_alerts"
    VIEW_PROOF_PACKS = "view_proof_packs"
    VIEW_INBOX = "view_inbox"
    VIEW_SITE_DETAIL = "view_site_detail"
    SEND_MESSAGE = "send_message"
    RESOLVE_CONVERSATION = "resolve_conversation"
    ERASURE_INITIATE = "erasure_initiate"
    ERASURE_APPROVE = "erasure_approve"
    ERASURE_EXECUTE = "erasure_execute"
    MODEL_REGISTER = "model_register"
    MODEL_ACTIVATE = "model_activate"
    MODEL_VIEW = "model_view"
    INFERENCE_JOB_CREATE = "inference_job_create"
    INFERENCE_JOB_RUN = "inference_job_run"
    INFERENCE_JOB_VIEW = "inference_job_view"


class OnboardingStatus(str, enum.Enum):
    """Status of an organization's onboarding process."""

    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class RgpdErasureStatus(str, enum.Enum):
    """Status of RGPD erasure requests."""

    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"


# ── Models ───────────────────────────────────────────────


class AdminAuditLog(TimestampMixin, Base):
    """Immutable audit trail for super_admin actions.

    NOT tenant-scoped: tracks cross-org admin actions.
    target_org_id is nullable because some actions are platform-wide
    (e.g., viewing monitoring dashboards).

    The ip_address and user_agent fields are extracted from the HTTP
    request server-side in the router — they are NEVER sourced from
    the request body to prevent spoofing.
    """

    __tablename__ = "admin_audit_log"
    __table_args__ = (
        Index(
            "ix_admin_audit_log_admin_created",
            "admin_user_id",
            "created_at",
            postgresql_ops={"created_at": "DESC"},
        ),
        Index(
            "ix_admin_audit_log_org_created",
            "target_org_id",
            "created_at",
            postgresql_ops={"created_at": "DESC"},
        ),
        Index(
            "ix_admin_audit_log_action_created",
            "action",
            "created_at",
            postgresql_ops={"created_at": "DESC"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )
    action: Mapped[AdminAuditAction] = mapped_column(
        sa_enum(AdminAuditAction),
        nullable=False,
    )
    resource_type: Mapped[str | None] = mapped_column(String(100))
    resource_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(200))
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )
    severity: Mapped[str] = mapped_column(String(10), nullable=False, default="INFO")

    def __repr__(self) -> str:
        return f"<AdminAuditLog {self.action.value} by={self.admin_user_id}>"


class RgpdErasureRequest(TimestampMixin, Base):
    """Persistent RGPD erasure workflow state.

    organization_id is intentionally not a foreign key: the target organization
    may be deleted as part of erasure while this record must remain for audit.
    """

    __tablename__ = "rgpd_erasure_requests"
    __table_args__ = (
        Index(
            "ix_rgpd_erasure_requests_org_created",
            "organization_id",
            "created_at",
            postgresql_ops={"created_at": "DESC"},
        ),
        Index(
            "uq_rgpd_erasure_active_per_org",
            "organization_id",
            unique=True,
            postgresql_where=text(
                "status IN ('pending_approval','approved','executing')"
            ),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    org_slug: Mapped[str] = mapped_column(String(100), nullable=False)
    initiated_by: Mapped[str] = mapped_column(String(64), nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[RgpdErasureStatus] = mapped_column(
        sa_enum(RgpdErasureStatus),
        nullable=False,
        default=RgpdErasureStatus.PENDING_APPROVAL,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return (
            f"<RgpdErasureRequest id={self.id} "
            f"org={self.organization_id} status={self.status.value}>"
        )


class RgpdErasureAuditEvent(Base):
    """Append-only audit entries for RGPD erasure requests."""

    __tablename__ = "rgpd_erasure_audit_events"
    __table_args__ = (
        Index(
            "uq_rgpd_erasure_audit_seq",
            "erasure_request_id",
            "sequence_no",
            unique=True,
        ),
        Index(
            "ix_rgpd_erasure_audit_request_created",
            "erasure_request_id",
            "created_at",
            postgresql_ops={"created_at": "DESC"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    erasure_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rgpd_erasure_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )


class PlanChangeHistory(TimestampMixin, Base):
    """Audit trail for subscription plan changes.

    Records every plan transition for billing compliance and dispute resolution.
    Both old_plan and new_plan are stored to enable full audit reconstruction.
    """

    __tablename__ = "plan_change_history"
    __table_args__ = (
        Index(
            "ix_plan_change_history_org_created",
            "organization_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    changed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    old_plan: Mapped[SubscriptionPlan] = mapped_column(
        sa_enum(SubscriptionPlan),
        nullable=False,
    )
    new_plan: Mapped[SubscriptionPlan] = mapped_column(
        sa_enum(SubscriptionPlan),
        nullable=False,
    )
    reason: Mapped[str | None] = mapped_column(String(1000))
    effective_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<PlanChangeHistory org={self.organization_id} "
            f"{self.old_plan.value}->{self.new_plan.value}>"
        )


class OnboardingState(TimestampMixin, Base):
    """Tracks organization onboarding progress.

    One onboarding per organization (enforced by unique constraint).
    steps_completed is a JSONB array tracking which steps are done.
    """

    __tablename__ = "onboarding_states"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    initiated_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[OnboardingStatus] = mapped_column(
        sa_enum(OnboardingStatus),
        default=OnboardingStatus.IN_PROGRESS,
    )
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    steps_completed: Mapped[list] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="[]"
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    def __repr__(self) -> str:
        return (
            f"<OnboardingState org={self.organization_id} "
            f"step={self.current_step} ({self.status.value})>"
        )
