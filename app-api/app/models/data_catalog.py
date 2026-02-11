"""Data Catalog models — platform schema tables for the Data Foundation.

These tables track datasets, columns, fit parameters, ingestion runs,
and pipeline config history per organization.

Security notes:
- ClientDataset and PipelineConfigHistory use TenantMixin (org_id isolation).
- DatasetColumn uses TimestampMixin (scoped by dataset_id FK CASCADE).
- FitParameter is INSERT-only (no updated_at); immutability enforced by DB trigger.
- IngestionLog uses TimestampMixin (scoped by dataset_id FK CASCADE).
- All enums use sa_enum() to store lowercase .value in PostgreSQL.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, sa_enum

# ── Enums ────────────────────────────────────────────────


class DatasetStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    MIGRATING = "migrating"
    ARCHIVED = "archived"


class IngestionMode(str, enum.Enum):
    INCREMENTAL = "incremental"
    FULL_REFIT = "full_refit"
    FILE_UPLOAD = "file_upload"


class RunStatus(str, enum.Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class ColumnDtype(str, enum.Enum):
    FLOAT = "float"
    INTEGER = "integer"
    DATE = "date"
    CATEGORY = "category"
    BOOLEAN = "boolean"
    TEXT = "text"


class ColumnRole(str, enum.Enum):
    TARGET = "target"
    FEATURE = "feature"
    TEMPORAL_INDEX = "temporal_index"
    GROUP_BY = "group_by"
    ID = "id"
    META = "meta"


# ── Models ───────────────────────────────────────────────


class ClientDataset(TenantMixin, Base):
    """Registry of all datasets per organization.

    Each dataset maps to a pair of dynamic tables in a single schema:
    - {schema_data}.{table_name} — original client data
    - {schema_data}.{table_name}_transformed — ML-ready features
    """

    __tablename__ = "client_datasets"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_client_datasets_org_name"),
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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    schema_data: Mapped[str] = mapped_column(String(255), nullable=False)
    table_name: Mapped[str] = mapped_column(String(255), nullable=False)
    temporal_index: Mapped[str] = mapped_column(String(255), nullable=False)
    group_by: Mapped[list[str]] = mapped_column(
        ARRAY(String(255)), nullable=False, server_default="{}"
    )
    pipeline_config: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )
    status: Mapped[DatasetStatus] = mapped_column(
        sa_enum(DatasetStatus),
        default=DatasetStatus.PENDING,
    )
    metadata_hash: Mapped[str | None] = mapped_column(String(64))

    def __repr__(self) -> str:
        return f"<ClientDataset {self.name} ({self.status.value})>"


class DatasetColumn(TimestampMixin, Base):
    """Column definitions with fine-grained rule overrides.

    Scoped by dataset_id (not TenantMixin). Cascades on dataset deletion.
    """

    __tablename__ = "dataset_columns"
    __table_args__ = (
        UniqueConstraint("dataset_id", "name", name="uq_dataset_columns_dataset_name"),
        UniqueConstraint(
            "dataset_id",
            "ordinal_position",
            name="uq_dataset_columns_dataset_ordinal",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dtype: Mapped[ColumnDtype] = mapped_column(sa_enum(ColumnDtype), nullable=False)
    role: Mapped[ColumnRole] = mapped_column(sa_enum(ColumnRole), nullable=False)
    nullable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    rules_override: Mapped[dict | None] = mapped_column(JSONB)  # type: ignore[type-arg]
    ordinal_position: Mapped[int] = mapped_column(Integer, nullable=False)

    def __repr__(self) -> str:
        return f"<DatasetColumn {self.name} ({self.dtype.value}/{self.role.value})>"


class FitParameter(Base):
    """Saved transformation parameters for incremental mode.

    INSERT-only: no updated_at column. Immutability enforced by DB trigger.
    Versions are monotonically increasing per (dataset_id, column_name, transform_type).
    """

    __tablename__ = "fit_parameters"
    __table_args__ = (
        UniqueConstraint(
            "dataset_id",
            "column_name",
            "transform_type",
            "version",
            name="uq_fit_params_dataset_col_transform_ver",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    column_name: Mapped[str] = mapped_column(String(255), nullable=False)
    transform_type: Mapped[str] = mapped_column(String(100), nullable=False)
    parameters: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False
    )
    hmac_sha256: Mapped[str | None] = mapped_column(String(128))
    fitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<FitParameter {self.column_name}/{self.transform_type} v{self.version}>"
        )


class IngestionLog(TimestampMixin, Base):
    """Audit trail for all transformation runs.

    Scoped by dataset_id (not TenantMixin). Cascades on dataset deletion.
    """

    __tablename__ = "ingestion_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mode: Mapped[IngestionMode] = mapped_column(sa_enum(IngestionMode), nullable=False)
    rows_received: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_transformed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[RunStatus] = mapped_column(sa_enum(RunStatus), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)
    triggered_by: Mapped[str | None] = mapped_column(String(100))
    request_id: Mapped[str | None] = mapped_column(String(255))
    file_name: Mapped[str | None] = mapped_column(String(255))
    file_size: Mapped[int | None] = mapped_column(Integer)
    ingested_watermark_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    def __repr__(self) -> str:
        return f"<IngestionLog {self.mode.value} {self.status.value}>"


class QualityReport(TimestampMixin, Base):
    """Quality analysis report for an ingestion run.

    Created after each successful file ingestion that includes quality checks.
    Stores aggregate metrics and per-column detail in JSONB for flexible querying.
    """

    __tablename__ = "quality_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ingestion_log_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ingestion_log.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rows_received: Mapped[int] = mapped_column(Integer, nullable=False)
    rows_after_dedup: Mapped[int] = mapped_column(Integer, nullable=False)
    rows_after_quality: Mapped[int] = mapped_column(Integer, nullable=False)
    duplicates_found: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    missing_values_found: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    missing_values_imputed: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    outliers_found: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    outliers_clamped: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    column_details: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False
    )
    strategy_config: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False
    )

    def __repr__(self) -> str:
        return f"<QualityReport dataset={self.dataset_id} rows={self.rows_received}>"


class PipelineConfigHistory(Base):
    """RGPD Article 30 compliance: tracks every pipeline config change.

    Uses TenantMixin indirectly via dataset FK. Only has created_at
    (append-only log, no updates).
    """

    __tablename__ = "pipeline_config_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    config_snapshot: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False
    )
    columns_snapshot: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False
    )
    changed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    change_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<PipelineConfigHistory dataset={self.dataset_id}>"
