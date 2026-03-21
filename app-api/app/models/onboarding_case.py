"""Onboarding BPM domain models for admin control plane.

Security notes:
- workflow metadata is stored for orchestration/audit, but never secrets.
- task/blocker/event projections are append-only or controlled mutations from
  trusted server-side commands only.
- onboarding state remains organization-scoped and must stay within the
  authenticated admin boundary.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class OnboardingCase(TimestampMixin, Base):
    """Root onboarding case for an organization."""

    __tablename__ = "onboarding_cases"
    __table_args__ = (
        CheckConstraint(
            "status IN ("
            "'draft','in_progress','blocked','ready_limited','ready_full',"
            "'active_limited','active_full','completed','cancelled'"
            ")",
            name="ck_onboarding_cases_status",
        ),
        CheckConstraint(
            "phase IN ("
            "'intake','access_setup','source_activation','mapping_validation',"
            "'product_configuration','readiness_review','activation','hypercare'"
            ")",
            name="ck_onboarding_cases_phase",
        ),
        CheckConstraint(
            "activation_mode IN ('shadow','limited','full')",
            name="ck_onboarding_cases_activation_mode",
        ),
        CheckConstraint(
            "environment_target IN ('sandbox','production')",
            name="ck_onboarding_cases_environment_target",
        ),
        CheckConstraint(
            "last_readiness_status IN ("
            "'not_started','in_progress','ready','warning','blocked'"
            ")",
            name="ck_onboarding_cases_readiness_status",
        ),
        CheckConstraint(
            "workflow_provider = 'camunda'",
            name="ck_onboarding_cases_workflow_provider",
        ),
        Index(
            "ix_onboarding_cases_org_created",
            "organization_id",
            "created_at",
            postgresql_ops={"created_at": "DESC"},
        ),
        Index(
            "ix_onboarding_cases_status_created",
            "status",
            "created_at",
            postgresql_ops={"created_at": "DESC"},
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
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    sponsor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default=text("'draft'"),
    )
    phase: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        server_default=text("'intake'"),
    )
    activation_mode: Mapped[str] = mapped_column(String(16), nullable=False)
    environment_target: Mapped[str] = mapped_column(String(16), nullable=False)
    data_residency_region: Mapped[str] = mapped_column(String(32), nullable=False)
    workflow_provider: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default=text("'camunda'")
    )
    process_definition_key: Mapped[str] = mapped_column(String(80), nullable=False)
    process_definition_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    process_instance_key: Mapped[str] = mapped_column(String(80), nullable=False)
    subscription_modules: Mapped[list] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    selected_packs: Mapped[list] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    source_modes: Mapped[list] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    last_readiness_status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default=text("'not_started'")
    )
    last_readiness_score: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    target_go_live_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )


class OnboardingCaseTask(TimestampMixin, Base):
    """Projected onboarding work item tied to a case."""

    __tablename__ = "onboarding_case_tasks"
    __table_args__ = (
        CheckConstraint(
            "domain IN ('scope','access','sources','mapping','product','activation')",
            name="ck_onboarding_case_tasks_domain",
        ),
        CheckConstraint(
            "status IN ('todo','in_progress','done','blocked')",
            name="ck_onboarding_case_tasks_status",
        ),
        Index(
            "uq_onboarding_case_tasks_case_task_key",
            "case_id",
            "task_key",
            unique=True,
        ),
        Index(
            "ix_onboarding_case_tasks_case_status_sort",
            "case_id",
            "status",
            "sort_order",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    task_key: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    domain: Mapped[str] = mapped_column(String(24), nullable=False)
    task_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        server_default=text("'todo'"),
    )
    assignee_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    details_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )


class OnboardingCaseBlocker(Base):
    """Explicit blocker attached to an onboarding case."""

    __tablename__ = "onboarding_case_blockers"
    __table_args__ = (
        CheckConstraint(
            "domain IN ('scope','access','sources','mapping','product','activation')",
            name="ck_onboarding_case_blockers_domain",
        ),
        CheckConstraint(
            "severity IN ('info','warning','critical')",
            name="ck_onboarding_case_blockers_severity",
        ),
        CheckConstraint(
            "status IN ('open','resolved')",
            name="ck_onboarding_case_blockers_status",
        ),
        Index(
            "uq_onboarding_case_blockers_case_blocker_key",
            "case_id",
            "blocker_key",
            unique=True,
        ),
        Index(
            "ix_onboarding_case_blockers_case_status_severity",
            "case_id",
            "status",
            "severity",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    blocker_key: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    domain: Mapped[str] = mapped_column(String(24), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'open'"),
    )
    details_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class OnboardingCaseEvent(Base):
    """Timeline event for an onboarding case."""

    __tablename__ = "onboarding_case_events"
    __table_args__ = (
        Index(
            "ix_onboarding_case_events_case_occurred",
            "case_id",
            "occurred_at",
            postgresql_ops={"occurred_at": "DESC"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    payload_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
