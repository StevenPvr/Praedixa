"""Dataset Management service — CRUD for datasets and related entities.

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- Dataset creation validates identifiers via DDL validation.
- Config updates write PipelineConfigHistory for RGPD Article 30 compliance.
- Dynamic data queries use psycopg.sql for safe identifier interpolation.
- PII masking happens at service layer before data reaches the router.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import TYPE_CHECKING, Any

from psycopg import sql as psql
from sqlalchemy import func, select

from app.core.config import settings
from app.core.ddl_connection import ddl_connection
from app.core.ddl_validation import (
    DDLValidationError,
    validate_identifier,
    validate_schema_name,
)
from app.core.exceptions import NotFoundError, PraedixaError
from app.core.validation import sanitize_text

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter
from app.models.data_catalog import (
    ClientDataset,
    DatasetColumn,
    DatasetStatus,
    FitParameter,
    IngestionLog,
    PipelineConfigHistory,
)
from app.services.schema_manager import create_client_schemas, create_dataset_tables


class DatasetLimitError(PraedixaError):
    """Raised when the organization exceeds its dataset limit."""

    def __init__(self, max_datasets: int) -> None:
        super().__init__(
            message=(f"Maximum datasets per organization ({max_datasets}) reached"),
            code="DATASET_LIMIT_EXCEEDED",
            status_code=409,
        )


# ── Dataset CRUD ─────────────────────────────────────────


async def list_datasets(
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    limit: int = 20,
    offset: int = 0,
    status_filter: DatasetStatus | None = None,
) -> tuple[list[ClientDataset], int]:
    """List datasets for the organization with pagination."""
    base_query = tenant.apply(select(ClientDataset), ClientDataset)

    if status_filter is not None:
        base_query = base_query.where(ClientDataset.status == status_filter)

    count_query = tenant.apply(select(func.count(ClientDataset.id)), ClientDataset)
    if status_filter is not None:
        count_query = count_query.where(ClientDataset.status == status_filter)

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    query = (
        base_query.order_by(ClientDataset.created_at.desc()).offset(offset).limit(limit)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_dataset(
    dataset_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
) -> ClientDataset:
    """Fetch a single dataset by ID with tenant isolation."""
    query = tenant.apply(
        select(ClientDataset).where(ClientDataset.id == dataset_id),
        ClientDataset,
    )
    result = await session.execute(query)
    dataset = result.scalar_one_or_none()

    if dataset is None:
        raise NotFoundError("Dataset", str(dataset_id))

    return dataset


async def create_dataset(
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    name: str,
    table_name: str,
    temporal_index: str,
    group_by: list[str],
    pipeline_config: dict[str, Any],
    columns: list[dict[str, Any]],
    org_slug: str,
) -> tuple[ClientDataset, list[DatasetColumn]]:
    """Create a new dataset with schemas and tables.

    Steps:
    1. Validate limits (max datasets per org).
    2. Create raw + transformed schemas if not exists.
    3. Create ClientDataset record.
    4. Create DatasetColumn records.
    5. Create dynamic raw + transformed tables.
    """
    org_id = uuid.UUID(tenant.organization_id)

    # Check dataset limit
    count_query = tenant.apply(select(func.count(ClientDataset.id)), ClientDataset)
    count_result = await session.execute(count_query)
    current_count = count_result.scalar_one() or 0

    if current_count >= settings.MAX_DATASETS_PER_ORG:
        raise DatasetLimitError(settings.MAX_DATASETS_PER_ORG)

    # Validate column count
    if len(columns) > settings.MAX_COLUMNS_PER_TABLE:
        msg = f"Maximum {settings.MAX_COLUMNS_PER_TABLE} columns per table exceeded"
        raise DDLValidationError(msg, field="columns")

    # Create schemas
    raw_schema, transformed_schema = await create_client_schemas(org_slug)

    # Create dataset record
    sanitized_name = sanitize_text(name, max_length=255)
    dataset = ClientDataset(
        organization_id=org_id,
        name=sanitized_name,
        schema_raw=raw_schema,
        schema_transformed=transformed_schema,
        table_name=table_name,
        temporal_index=temporal_index,
        group_by=group_by,
        pipeline_config=pipeline_config,
        status=DatasetStatus.PENDING,
    )
    session.add(dataset)
    await session.flush()

    # Create column records
    column_models: list[DatasetColumn] = []
    for i, col_def in enumerate(columns):
        col = DatasetColumn(
            dataset_id=dataset.id,
            name=col_def["name"],
            dtype=col_def["dtype"],
            role=col_def["role"],
            nullable=col_def.get("nullable", True),
            rules_override=col_def.get("rules_override"),
            ordinal_position=col_def.get("ordinal_position", i),
        )
        session.add(col)
        column_models.append(col)

    await session.flush()

    # Create dynamic tables
    await create_dataset_tables(dataset, column_models)

    # Mark as active
    dataset.status = DatasetStatus.ACTIVE
    await session.flush()

    return dataset, column_models


async def update_dataset_config(
    dataset_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    pipeline_config: dict[str, Any],
    change_reason: str | None,
    user_id: str,
) -> ClientDataset:
    """Update dataset pipeline config and record change history."""
    dataset = await get_dataset(dataset_id, tenant, session)

    # Load current columns for snapshot
    columns = await get_dataset_columns(dataset_id, tenant, session)
    columns_snapshot = [
        {"name": c.name, "rules_override": c.rules_override} for c in columns
    ]

    # Record history
    history = PipelineConfigHistory(
        dataset_id=dataset_id,
        config_snapshot=dataset.pipeline_config,
        columns_snapshot=columns_snapshot,
        changed_by=uuid.UUID(user_id),
        change_reason=(
            sanitize_text(change_reason, max_length=1000) if change_reason else None
        ),
    )
    session.add(history)

    # Update config
    dataset.pipeline_config = pipeline_config
    await session.flush()

    return dataset


# ── Column queries ───────────────────────────────────────


async def get_dataset_columns(
    dataset_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
) -> list[DatasetColumn]:
    """Get all columns for a dataset (validates tenant ownership first)."""
    # Verify dataset belongs to tenant
    await get_dataset(dataset_id, tenant, session)

    result = await session.execute(
        select(DatasetColumn)
        .where(DatasetColumn.dataset_id == dataset_id)
        .order_by(DatasetColumn.ordinal_position)
    )
    return list(result.scalars().all())


# ── Dynamic data queries ─────────────────────────────────


async def get_dataset_data(
    dataset_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    """Query raw data from the dynamic client table.

    System columns (prefixed with _) are excluded from the response.
    PII columns would be masked here at the service layer.

    Returns (rows, total_count).
    """
    dataset = await get_dataset(dataset_id, tenant, session)

    raw_schema = validate_schema_name(dataset.schema_raw)
    table_name = validate_identifier(dataset.table_name, field="table_name")
    temporal_index = validate_identifier(dataset.temporal_index, field="temporal_index")

    def _sync_query() -> tuple[list[dict[str, Any]], int]:
        with ddl_connection() as conn, conn.cursor() as cur:
            # Count total rows
            cur.execute(
                psql.SQL("SELECT COUNT(*) FROM {}.{}").format(
                    psql.Identifier(raw_schema),
                    psql.Identifier(table_name),
                )
            )
            total = cur.fetchone()[0]  # type: ignore[index]

            # Fetch page ordered by temporal index
            cur.execute(
                psql.SQL(
                    "SELECT * FROM {}.{} ORDER BY {} DESC LIMIT %s OFFSET %s"
                ).format(
                    psql.Identifier(raw_schema),
                    psql.Identifier(table_name),
                    psql.Identifier(temporal_index),
                ),
                (limit, offset),
            )
            rows = cur.fetchall()
            col_names = [desc.name for desc in cur.description or []]

            # Convert to dicts, excluding system columns
            result_rows: list[dict[str, Any]] = []
            for row in rows:
                row_dict = {}
                for col_name, value in zip(col_names, row, strict=False):
                    if col_name.startswith("_"):
                        continue
                    row_dict[col_name] = value
                result_rows.append(row_dict)

            return result_rows, total

    return await asyncio.to_thread(_sync_query)


# ── Audit log queries ────────────────────────────────────


async def get_ingestion_log(
    dataset_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[IngestionLog], int]:
    """Get ingestion log entries for a dataset."""
    # Verify dataset belongs to tenant
    await get_dataset(dataset_id, tenant, session)

    count_result = await session.execute(
        select(func.count(IngestionLog.id)).where(IngestionLog.dataset_id == dataset_id)
    )
    total = count_result.scalar_one() or 0

    result = await session.execute(
        select(IngestionLog)
        .where(IngestionLog.dataset_id == dataset_id)
        .order_by(IngestionLog.started_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = list(result.scalars().all())

    return items, total


async def get_config_history(
    dataset_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[PipelineConfigHistory], int]:
    """Get pipeline config change history for a dataset."""
    # Verify dataset belongs to tenant
    await get_dataset(dataset_id, tenant, session)

    count_result = await session.execute(
        select(func.count(PipelineConfigHistory.id)).where(
            PipelineConfigHistory.dataset_id == dataset_id
        )
    )
    total = count_result.scalar_one() or 0

    result = await session.execute(
        select(PipelineConfigHistory)
        .where(PipelineConfigHistory.dataset_id == dataset_id)
        .order_by(PipelineConfigHistory.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = list(result.scalars().all())

    return items, total


# ── Fit parameter queries ────────────────────────────────


async def get_fit_parameters(
    dataset_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    active_only: bool = True,
) -> list[FitParameter]:
    """Get fit parameters for a dataset."""
    await get_dataset(dataset_id, tenant, session)

    query = select(FitParameter).where(FitParameter.dataset_id == dataset_id)
    if active_only:
        query = query.where(FitParameter.is_active.is_(True))

    result = await session.execute(
        query.order_by(FitParameter.column_name, FitParameter.version.desc())
    )
    return list(result.scalars().all())
