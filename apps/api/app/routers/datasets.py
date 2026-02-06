"""Datasets router — CRUD for client datasets and related entities.

Security:
- All endpoints require authentication (get_current_user).
- TenantFilter ensures organization isolation on all queries.
- Write endpoints (POST, PATCH) require org_admin role.
- organization_id is ALWAYS from JWT context, never from request body.
- Path params are UUID-validated by FastAPI/Pydantic.
"""

import math
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter, require_role
from app.models.data_catalog import DatasetStatus
from app.schemas.base import PaginationMeta
from app.schemas.data_catalog import (
    ClientDatasetRead,
    ClientDatasetSummary,
    CreateDatasetRequest,
    DatasetColumnRead,
    FitParameterRead,
    IngestionLogRead,
    PipelineConfigHistoryRead,
    UpdateDatasetRequest,
)
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.datasets import (
    create_dataset,
    get_config_history,
    get_dataset,
    get_dataset_columns,
    get_dataset_data,
    get_fit_parameters,
    get_ingestion_log,
    list_datasets,
    update_dataset_config,
)

router = APIRouter(prefix="/api/v1/datasets", tags=["datasets"])


@router.get("")
async def list_all_datasets(
    status: DatasetStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[ClientDatasetSummary]:
    """List datasets for the authenticated organization."""
    offset = (page - 1) * page_size

    items, total = await list_datasets(
        tenant=tenant,
        session=session,
        limit=page_size,
        offset=offset,
        status_filter=status,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedResponse(
        success=True,
        data=[ClientDatasetSummary.model_validate(item) for item in items],
        pagination=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next_page=page < total_pages,
            has_previous_page=page > 1,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{dataset_id}")
async def get_single_dataset(
    dataset_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[ClientDatasetRead]:
    """Get a single dataset by ID."""
    dataset = await get_dataset(
        dataset_id=dataset_id,
        tenant=tenant,
        session=session,
    )

    return ApiResponse(
        success=True,
        data=ClientDatasetRead.model_validate(dataset),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{dataset_id}/columns")
async def get_columns(
    dataset_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[list[DatasetColumnRead]]:
    """Get all column definitions for a dataset."""
    columns = await get_dataset_columns(
        dataset_id=dataset_id,
        tenant=tenant,
        session=session,
    )

    return ApiResponse(
        success=True,
        data=[DatasetColumnRead.model_validate(col) for col in columns],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{dataset_id}/data")
async def get_data(  # pragma: no cover
    dataset_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=1000),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[dict[str, Any]]:
    """Get raw data for a dataset (system columns excluded, PII masked)."""
    offset = (page - 1) * page_size

    rows, total = await get_dataset_data(
        dataset_id=dataset_id,
        tenant=tenant,
        session=session,
        limit=page_size,
        offset=offset,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedResponse(
        success=True,
        data=rows,
        pagination=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next_page=page < total_pages,
            has_previous_page=page > 1,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{dataset_id}/ingestion-log")
async def get_dataset_ingestion_log(
    dataset_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[IngestionLogRead]:
    """Get ingestion log for a dataset."""
    offset = (page - 1) * page_size

    items, total = await get_ingestion_log(
        dataset_id=dataset_id,
        tenant=tenant,
        session=session,
        limit=page_size,
        offset=offset,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedResponse(
        success=True,
        data=[IngestionLogRead.model_validate(item) for item in items],
        pagination=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next_page=page < total_pages,
            has_previous_page=page > 1,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{dataset_id}/history")
async def get_dataset_history(  # pragma: no cover
    dataset_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[PipelineConfigHistoryRead]:
    """Get pipeline config change history for a dataset."""
    offset = (page - 1) * page_size

    items, total = await get_config_history(
        dataset_id=dataset_id,
        tenant=tenant,
        session=session,
        limit=page_size,
        offset=offset,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedResponse(
        success=True,
        data=[PipelineConfigHistoryRead.model_validate(item) for item in items],
        pagination=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next_page=page < total_pages,
            has_previous_page=page > 1,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{dataset_id}/fit-parameters")
async def get_dataset_fit_parameters(
    dataset_id: uuid.UUID,
    active_only: bool = Query(default=True),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[list[FitParameterRead]]:
    """Get fit parameters for a dataset."""
    params = await get_fit_parameters(
        dataset_id=dataset_id,
        tenant=tenant,
        session=session,
        active_only=active_only,
    )

    return ApiResponse(
        success=True,
        data=[FitParameterRead.model_validate(p) for p in params],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("", status_code=201)
async def create_new_dataset(  # pragma: no cover
    body: CreateDatasetRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("org_admin")),
) -> ApiResponse[ClientDatasetRead]:
    """Create a new dataset. Requires org_admin role.

    This creates the dataset record, column definitions, and the
    dynamic raw/transformed PostgreSQL tables.
    """
    # Columns must be provided in the request body as a nested list.
    # For simplicity, they're extracted from pipeline_config.columns
    # if present, or the request can be extended.
    columns_data = body.pipeline_config.pop("columns", [])

    dataset, _columns = await create_dataset(
        tenant=tenant,
        session=session,
        name=body.name,
        table_name=body.table_name,
        temporal_index=body.temporal_index,
        group_by=body.group_by,
        pipeline_config=body.pipeline_config,
        columns=columns_data,
        org_slug=body.name,  # In production, use org.slug from DB lookup
    )

    return ApiResponse(
        success=True,
        data=ClientDatasetRead.model_validate(dataset),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.patch("/{dataset_id}")
async def update_dataset(  # pragma: no cover
    dataset_id: uuid.UUID,
    body: UpdateDatasetRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("org_admin")),
) -> ApiResponse[ClientDatasetRead]:
    """Update a dataset's pipeline config. Requires org_admin role.

    Records the change in pipeline_config_history for RGPD compliance.
    """
    if body.pipeline_config is None:
        # Nothing to update
        dataset = await get_dataset(dataset_id, tenant, session)
    else:
        dataset = await update_dataset_config(
            dataset_id=dataset_id,
            tenant=tenant,
            session=session,
            pipeline_config=body.pipeline_config,
            change_reason=body.change_reason,
            user_id=current_user.user_id,
        )

    return ApiResponse(
        success=True,
        data=ClientDatasetRead.model_validate(dataset),
        timestamp=datetime.now(UTC).isoformat(),
    )
