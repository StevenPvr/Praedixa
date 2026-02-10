"""Data Catalog schemas — request/response models for datasets and columns.

Maps to ORM models in app.models.data_catalog.

Security notes:
- Create/Update requests use extra='forbid' to prevent mass assignment.
- organization_id is NEVER accepted from client — injected from JWT context.
- status transitions are controlled server-side.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import ConfigDict, Field

from app.models.data_catalog import (
    ColumnDtype,
    ColumnRole,
    DatasetStatus,
    IngestionMode,
    RunStatus,
)
from app.schemas.base import CamelModel, TenantEntitySchema

# ── ClientDataset schemas ────────────────────────────────


class ClientDatasetRead(TenantEntitySchema):
    """Full dataset response for regular client users.

    Security: schema_data is intentionally excluded — clients must
    not know internal schema naming.
    """

    name: str
    table_name: str
    temporal_index: str
    group_by: list[str]
    pipeline_config: dict[str, Any]
    status: DatasetStatus
    metadata_hash: str | None = None


class AdminDatasetRead(TenantEntitySchema):
    """Full dataset response for super_admin back-office.

    Includes schema_data for admin visibility into the data schema.
    """

    name: str
    schema_data: str
    table_name: str
    temporal_index: str
    group_by: list[str]
    pipeline_config: dict[str, Any]
    status: DatasetStatus
    metadata_hash: str | None = None


class ClientDatasetSummary(CamelModel):
    """Lightweight dataset for listings.

    row_count, column_count, and last_ingestion_at are computed via
    correlated subqueries in list_datasets() and set as transient
    attributes on the ORM object before model_validate().
    """

    id: uuid.UUID
    name: str
    table_name: str
    status: DatasetStatus
    temporal_index: str
    created_at: datetime
    updated_at: datetime
    row_count: int = 0
    column_count: int = 0
    last_ingestion_at: datetime | None = None


class CreateDatasetRequest(CamelModel):
    """Create a new dataset registration.

    Validation:
    - name must be identifier-like (lowercase, underscores, digits).
    - table_name follows the same pattern.
    - group_by items follow the same pattern.
    - extra='forbid' rejects unknown fields (prevents org_id injection).
    """

    model_config = ConfigDict(extra="forbid")

    name: str = Field(
        max_length=255,
        pattern=r"^[a-z][a-z0-9_]*$",
    )
    table_name: str = Field(
        max_length=255,
        pattern=r"^[a-z][a-z0-9_]*$",
    )
    temporal_index: str = Field(max_length=255)
    group_by: list[str] = Field(default_factory=list)
    pipeline_config: dict[str, Any] = Field(default_factory=dict)


class UpdateDatasetRequest(CamelModel):
    """Update dataset pipeline config or status.

    Only pipeline_config and change_reason are updatable from client.
    Status and schema names are managed server-side.
    """

    model_config = ConfigDict(extra="forbid")

    pipeline_config: dict[str, Any] | None = None
    change_reason: str | None = Field(default=None, max_length=1000)


# ── DatasetColumn schemas ────────────────────────────────


class DatasetColumnRead(CamelModel):
    """Full column definition response."""

    id: uuid.UUID
    dataset_id: uuid.UUID
    name: str
    dtype: ColumnDtype
    role: ColumnRole
    nullable: bool
    rules_override: dict[str, Any] | None = None
    ordinal_position: int
    created_at: datetime
    updated_at: datetime


class CreateColumnRequest(CamelModel):
    """Create a column definition.

    Validation:
    - name must be identifier-like.
    - ordinal_position must be >= 0.
    - extra='forbid' prevents injection of dataset_id from body.
    """

    model_config = ConfigDict(extra="forbid")

    name: str = Field(
        max_length=255,
        pattern=r"^[a-z][a-z0-9_]*$",
    )
    dtype: ColumnDtype
    role: ColumnRole
    nullable: bool = True
    rules_override: dict[str, Any] | None = None
    ordinal_position: int = Field(ge=0)


class UpdateColumnRequest(CamelModel):
    """Update a column's rules override.

    Only rules_override is updatable from client.
    dtype, role, name changes require a new dataset version.
    """

    model_config = ConfigDict(extra="forbid")

    rules_override: dict[str, Any] | None = None


# ── FitParameter schemas ─────────────────────────────────


class FitParameterRead(CamelModel):
    """Fit parameter response (read-only from API perspective)."""

    id: uuid.UUID
    dataset_id: uuid.UUID
    column_name: str
    transform_type: str
    parameters: dict[str, Any]
    hmac_sha256: str | None = None
    fitted_at: datetime
    row_count: int
    version: int
    is_active: bool
    created_at: datetime


# ── IngestionLog schemas ─────────────────────────────────


class IngestionLogRead(CamelModel):
    """Ingestion log entry response."""

    id: uuid.UUID
    dataset_id: uuid.UUID
    mode: IngestionMode
    rows_received: int
    rows_transformed: int
    started_at: datetime
    completed_at: datetime | None = None
    status: RunStatus
    error_message: str | None = None
    triggered_by: str | None = None
    request_id: str | None = None
    file_name: str | None = None
    file_size: int | None = None
    created_at: datetime
    updated_at: datetime


# ── PipelineConfigHistory schemas ────────────────────────


class PipelineConfigHistoryRead(CamelModel):
    """Pipeline config history entry response."""

    id: uuid.UUID
    dataset_id: uuid.UUID
    config_snapshot: dict[str, Any]
    columns_snapshot: list[dict[str, Any]]
    changed_by: uuid.UUID
    change_reason: str | None = None
    created_at: datetime


# ── Webapp-aligned response schemas ────────────────────────


class DatasetDetailResponseSchema(CamelModel):
    """Detail response for a single dataset, matching frontend DatasetDetailResponse."""

    id: uuid.UUID
    name: str
    status: DatasetStatus
    table_name: str
    temporal_index: str
    group_by: list[str]
    row_count: int
    last_ingestion_at: datetime | None = None
    columns: list[DatasetColumnRead]


class DatasetDataPreviewResponseSchema(CamelModel):
    """Data preview response matching frontend DatasetDataPreviewResponse."""

    columns: list[str]
    rows: list[dict[str, Any]]
    masked_columns: list[str] = Field(default_factory=list)
    total: int


class IngestionHistoryResponseSchema(CamelModel):
    """Ingestion history response matching frontend IngestionHistoryResponse."""

    entries: list[IngestionLogRead]
    total: int
