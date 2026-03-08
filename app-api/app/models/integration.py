"""Integration platform models for connector onboarding and sync orchestration."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, sa_enum


class IntegrationVendor(str, enum.Enum):
    SALESFORCE = "salesforce"
    UKG = "ukg"
    TOAST = "toast"
    OLO = "olo"
    CDK = "cdk"
    REYNOLDS = "reynolds"
    GEOTAB = "geotab"
    FOURTH = "fourth"
    ORACLE_TM = "oracle_tm"
    SAP_TM = "sap_tm"
    BLUE_YONDER = "blue_yonder"
    MANHATTAN = "manhattan"
    NCR_ALOHA = "ncr_aloha"


class IntegrationAuthMode(str, enum.Enum):
    OAUTH2 = "oauth2"
    API_KEY = "api_key"
    SERVICE_ACCOUNT = "service_account"
    SFTP = "sftp"


class IntegrationConnectionStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DISABLED = "disabled"
    NEEDS_ATTENTION = "needs_attention"


class IntegrationSyncTriggerType(str, enum.Enum):
    SCHEDULE = "schedule"
    MANUAL = "manual"
    WEBHOOK = "webhook"
    BACKFILL = "backfill"
    REPLAY = "replay"


class IntegrationSyncStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELED = "canceled"


class IntegrationErrorClass(str, enum.Enum):
    AUTH = "auth"
    RATE_LIMIT = "rate_limit"
    TRANSIENT = "transient"
    PERMANENT = "permanent"
    MAPPING = "mapping"
    VALIDATION = "validation"
    PROVIDER = "provider"
    SYSTEM = "system"


class DeadLetterStatus(str, enum.Enum):
    PENDING = "pending"
    REQUEUED = "requeued"
    DISCARDED = "discarded"


class IntegrationConnection(TenantMixin, Base):
    __tablename__ = "integration_connections"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "vendor",
            "display_name",
            name="uq_integration_conn_org_vendor_name",
        ),
        Index(
            "ix_integration_conn_org_vendor_status",
            "organization_id",
            "vendor",
            "status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vendor: Mapped[IntegrationVendor] = mapped_column(
        sa_enum(IntegrationVendor),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[IntegrationConnectionStatus] = mapped_column(
        sa_enum(IntegrationConnectionStatus),
        nullable=False,
        default=IntegrationConnectionStatus.PENDING,
    )
    auth_mode: Mapped[IntegrationAuthMode] = mapped_column(
        sa_enum(IntegrationAuthMode),
        nullable=False,
    )
    config_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )
    secret_ref: Mapped[str | None] = mapped_column(String(255))
    secret_version: Mapped[int | None] = mapped_column(Integer)
    oauth_scopes: Mapped[str | None] = mapped_column(Text)
    base_url: Mapped[str | None] = mapped_column(Text)
    external_account_id: Mapped[str | None] = mapped_column(String(255))
    sync_interval_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=30,
        server_default=text("30"),
    )
    webhook_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    next_scheduled_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    last_successful_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    last_tested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    disabled_reason: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class IntegrationSyncRun(TenantMixin, Base):
    __tablename__ = "integration_sync_runs"
    __table_args__ = (
        UniqueConstraint(
            "connection_id",
            "idempotency_key",
            name="uq_integration_sync_runs_idempotency",
        ),
        Index(
            "ix_integration_sync_runs_queue",
            "status",
            "available_at",
            "priority",
        ),
        Index(
            "ix_integration_sync_runs_org_status_created",
            "organization_id",
            "status",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    trigger_type: Mapped[IntegrationSyncTriggerType] = mapped_column(
        sa_enum(IntegrationSyncTriggerType),
        nullable=False,
    )
    status: Mapped[IntegrationSyncStatus] = mapped_column(
        sa_enum(IntegrationSyncStatus),
        nullable=False,
        default=IntegrationSyncStatus.QUEUED,
    )
    priority: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        default=50,
        server_default=text("50"),
    )
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    max_attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=8,
        server_default=text("8"),
    )
    idempotency_key: Mapped[str] = mapped_column(String(120), nullable=False)
    locked_by: Mapped[str | None] = mapped_column(String(120))
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_window_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    source_window_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    records_fetched: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    records_written: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    error_class: Mapped[IntegrationErrorClass | None] = mapped_column(
        sa_enum(IntegrationErrorClass),
    )
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message_redacted: Mapped[str | None] = mapped_column(String(400))
    request_id: Mapped[str | None] = mapped_column(String(64))
    scope_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class IntegrationSyncState(TenantMixin, Base):
    __tablename__ = "integration_sync_state"
    __table_args__ = (
        UniqueConstraint(
            "connection_id",
            "source_object",
            name="uq_integration_sync_state_conn_object",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_object: Mapped[str] = mapped_column(String(120), nullable=False)
    watermark_text: Mapped[str | None] = mapped_column(String(255))
    watermark_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cursor_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )
    last_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_sync_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by_worker: Mapped[str | None] = mapped_column(String(80))


class IntegrationRawEvent(TenantMixin, Base):
    __tablename__ = "integration_raw_events"
    __table_args__ = (
        UniqueConstraint(
            "connection_id",
            "event_id",
            name="uq_integration_raw_events_conn_event",
        ),
        Index(
            "ix_integration_raw_events_conn_object_updated",
            "connection_id",
            "source_object",
            "source_updated_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sync_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_sync_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_object: Mapped[str] = mapped_column(String(120), nullable=False)
    source_record_id: Mapped[str] = mapped_column(String(255), nullable=False)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    event_id: Mapped[str] = mapped_column(String(128), nullable=False)
    payload_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    object_store_key: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(100))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    replayed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )


class IntegrationFieldMapping(TenantMixin, Base):
    __tablename__ = "integration_field_mappings"
    __table_args__ = (
        UniqueConstraint(
            "connection_id",
            "source_object",
            "mapping_version",
            name="uq_integration_field_map_version",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_object: Mapped[str] = mapped_column(String(120), nullable=False)
    mapping_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default=text("1"),
    )
    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    fields_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class IntegrationErrorEvent(TenantMixin, Base):
    __tablename__ = "integration_error_events"
    __table_args__ = (
        Index(
            "ix_integration_error_events_conn_occurred",
            "connection_id",
            "occurred_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sync_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_sync_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    error_class: Mapped[IntegrationErrorClass] = mapped_column(
        sa_enum(IntegrationErrorClass),
        nullable=False,
    )
    error_code: Mapped[str | None] = mapped_column(String(80))
    message_redacted: Mapped[str] = mapped_column(Text, nullable=False)
    details_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    resolved: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class IntegrationDeadLetter(TenantMixin, Base):
    __tablename__ = "integration_dead_letter_queue"
    __table_args__ = (
        Index(
            "ix_integration_dlq_conn_status_created",
            "connection_id",
            "status",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sync_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_sync_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_id: Mapped[str | None] = mapped_column(String(128))
    reason_code: Mapped[str] = mapped_column(String(80), nullable=False)
    payload_ref: Mapped[str | None] = mapped_column(Text)
    snapshot_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )
    status: Mapped[DeadLetterStatus] = mapped_column(
        sa_enum(DeadLetterStatus),
        nullable=False,
        default=DeadLetterStatus.PENDING,
    )
    requeue_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class IntegrationWebhookReceipt(TenantMixin, Base):
    __tablename__ = "integration_webhook_receipts"
    __table_args__ = (
        UniqueConstraint(
            "connection_id",
            "signature_id",
            name="uq_integration_webhook_signature_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vendor: Mapped[IntegrationVendor] = mapped_column(
        sa_enum(IntegrationVendor),
        nullable=False,
    )
    signature_id: Mapped[str] = mapped_column(String(255), nullable=False)
    signature_valid: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    payload_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    response_code: Mapped[int] = mapped_column(Integer, nullable=False)
    processed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    sync_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_sync_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )


class IntegrationAuditEvent(TenantMixin, Base):
    __tablename__ = "integration_audit_events"
    __table_args__ = (
        Index(
            "ix_integration_audit_conn_created",
            "connection_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integration_connections.id", ondelete="SET NULL"),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_service: Mapped[str | None] = mapped_column(String(80))
    request_id: Mapped[str | None] = mapped_column(String(64))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(200))
    metadata_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        server_default="{}",
    )
