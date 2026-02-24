"""MLOps models — model registry, inference jobs, artifact access, lineage.

Security notes:
- All tables are tenant-scoped via TenantMixin (organization_id NOT NULL).
- Model artifacts are referenced by URI only (no binary blob in DB).
- metadata_hmac provides tamper-evidence for critical registry fields.
- Inference job errors are stored in redacted form.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin


class ModelRegistryStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"
    FAILED = "failed"


class InferenceJobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ModelRegistry(TenantMixin, Base):
    """Per-organization model registry entry."""

    __tablename__ = "model_registry"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "model_family",
            "version",
            name="uq_model_registry_org_family_version",
        ),
        Index(
            "ix_model_registry_org_family_status",
            "organization_id",
            "model_family",
            "status",
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
        index=True,
    )
    model_family: Mapped[str] = mapped_column(String(80), nullable=False)
    version: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    artifact_uri: Mapped[str] = mapped_column(Text, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_hmac: Mapped[str] = mapped_column(String(64), nullable=False)
    onnx_opset: Mapped[int | None] = mapped_column(Integer)
    features_schema_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )
    metrics_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"<ModelRegistry org={self.organization_id} family={self.model_family} "
            f"version={self.version} status={self.status}>"
        )


class ModelInferenceJob(TenantMixin, Base):
    """Inference execution job tracked per organization."""

    __tablename__ = "model_inference_jobs"
    __table_args__ = (
        Index(
            "ix_model_inference_jobs_org_status_created",
            "organization_id",
            "status",
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
        index=True,
    )
    model_registry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("model_registry.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    scope_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message_redacted: Mapped[str | None] = mapped_column(String(400))
    rows_in: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_out: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    forecast_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forecast_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    requested_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"<ModelInferenceJob org={self.organization_id} id={self.id} "
            f"status={self.status}>"
        )


class ModelArtifactAccessLog(TenantMixin, Base):
    """Append-only log of model artifact access/operations."""

    __tablename__ = "model_artifact_access_log"
    __table_args__ = (
        Index(
            "ix_model_artifact_access_org_model_created",
            "organization_id",
            "model_registry_id",
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
        index=True,
    )
    model_registry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("model_registry.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_service: Mapped[str] = mapped_column(String(80), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    request_id: Mapped[str | None] = mapped_column(String(64))
    ip_hash: Mapped[str | None] = mapped_column(String(64))
    metadata_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )

    def __repr__(self) -> str:
        return (
            f"<ModelArtifactAccessLog model={self.model_registry_id} "
            f"action={self.action}>"
        )


class DataLineageEvent(TenantMixin, Base):
    """Lineage event linking source data, model, and output artifacts."""

    __tablename__ = "data_lineage_events"
    __table_args__ = (
        Index(
            "ix_data_lineage_org_created",
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
        index=True,
    )
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    source_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    target_type: Mapped[str] = mapped_column(String(40), nullable=False)
    target_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"<DataLineageEvent org={self.organization_id} "
            f"{self.source_type}->{self.target_type}>"
        )
