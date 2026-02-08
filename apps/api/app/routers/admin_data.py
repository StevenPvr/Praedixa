"""Admin data router — read-only access to client data across organizations.

Reuses existing service functions by passing an admin-scoped TenantFilter.
This avoids code duplication and ensures the same query patterns are used.

Security:
- All endpoints require super_admin role.
- Medical absence data is masked via mask_medical_reasons().
- TenantFilter is created from the path org_id parameter.
- Every endpoint logs an admin audit action.
"""

import math
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session
from app.core.security import TenantFilter, require_role
from app.models.absence import Absence
from app.models.admin import AdminAuditAction
from app.models.data_catalog import ClientDataset, IngestionLog
from app.schemas.base import PaginationMeta
from app.schemas.data_catalog import (
    AdminDatasetRead,
    IngestionLogRead,
)
from app.schemas.decision import DecisionRead
from app.schemas.forecast import ForecastRunRead
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.admin_audit import log_admin_action
from app.services.datasets import get_dataset, get_dataset_data, get_features_data
from app.services.decisions import list_decisions
from app.services.forecasts import list_forecasts
from app.services.medical_masking import mask_medical_reasons

router = APIRouter(tags=["admin-data"])


def _admin_tenant(org_id: uuid.UUID) -> TenantFilter:
    """Create a TenantFilter for admin cross-org access."""
    return TenantFilter(str(org_id))


@router.get("/organizations/{org_id}/datasets")
async def list_org_datasets(
    request: Request,
    org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[AdminDatasetRead]:
    """List datasets for an organization."""
    tenant = _admin_tenant(org_id)

    base_query = tenant.apply(select(ClientDataset), ClientDataset)
    count_query = tenant.apply(
        select(func.count(ClientDataset.id)), ClientDataset
    )

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base_query
        .order_by(ClientDataset.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATASETS,
        request=request,
        target_org_id=str(org_id),
    )

    total_pages = max(1, math.ceil(total / page_size))
    data = [AdminDatasetRead.model_validate(d) for d in items]

    return PaginatedResponse(
        success=True,
        data=data,
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


@router.get("/organizations/{org_id}/ingestion-log")
async def list_org_ingestion_log(
    request: Request,
    org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[IngestionLogRead]:
    """List ingestion log entries for an organization's datasets."""
    # Join IngestionLog through ClientDataset to filter by org
    base_query = (
        select(IngestionLog)
        .join(ClientDataset, IngestionLog.dataset_id == ClientDataset.id)
        .where(ClientDataset.organization_id == str(org_id))
    )
    count_query = (
        select(func.count(IngestionLog.id))
        .join(ClientDataset, IngestionLog.dataset_id == ClientDataset.id)
        .where(ClientDataset.organization_id == str(org_id))
    )

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base_query
        .order_by(IngestionLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATA,
        request=request,
        target_org_id=str(org_id),
        resource_type="IngestionLog",
    )

    total_pages = max(1, math.ceil(total / page_size))
    data = [IngestionLogRead.model_validate(i) for i in items]

    return PaginatedResponse(
        success=True,
        data=data,
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


@router.get("/organizations/{org_id}/forecasts")
async def list_org_forecasts(
    request: Request,
    org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[ForecastRunRead]:
    """List forecast runs for an organization."""
    tenant = _admin_tenant(org_id)
    offset = (page - 1) * page_size

    items, total = await list_forecasts(
        tenant, session, limit=page_size, offset=offset
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATA,
        request=request,
        target_org_id=str(org_id),
        resource_type="ForecastRun",
    )

    total_pages = max(1, math.ceil(total / page_size))
    data = [ForecastRunRead.model_validate(f) for f in items]

    return PaginatedResponse(
        success=True,
        data=data,
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


@router.get("/organizations/{org_id}/decisions")
async def list_org_decisions(
    request: Request,
    org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[DecisionRead]:
    """List decisions for an organization."""
    tenant = _admin_tenant(org_id)
    offset = (page - 1) * page_size

    items, total = await list_decisions(
        tenant, session, limit=page_size, offset=offset
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATA,
        request=request,
        target_org_id=str(org_id),
        resource_type="Decision",
    )

    total_pages = max(1, math.ceil(total / page_size))
    data = [DecisionRead.model_validate(d) for d in items]

    return PaginatedResponse(
        success=True,
        data=data,
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


@router.get("/organizations/{org_id}/absences")
async def list_org_absences(
    request: Request,
    org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[list[dict]]:
    """List absences for an organization with medical masking.

    Medical reasons are replaced with "[MEDICAL]" to comply with
    GDPR Article 9 (health data is special category).
    """
    base_query = select(Absence).where(Absence.organization_id == str(org_id))
    count_query = select(func.count(Absence.id)).where(
        Absence.organization_id == str(org_id)
    )

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base_query
        .order_by(Absence.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATA,
        request=request,
        target_org_id=str(org_id),
        resource_type="Absence",
    )

    # Serialize to dicts, then apply medical masking
    raw_data = []
    for item in items:
        raw_data.append({
            "id": str(item.id),
            "type": item.type.value if hasattr(item.type, "value") else str(item.type),
            "reason": getattr(item, "reason", None),
            "start_date": str(item.start_date) if hasattr(item, "start_date") else None,
            "end_date": str(item.end_date) if hasattr(item, "end_date") else None,
            "status": item.status.value
            if hasattr(item.status, "value")
            else str(item.status),
            "employee_id": str(item.employee_id),
        })

    # Apply GDPR Article 9 masking on medical absence types
    masked_data = mask_medical_reasons(raw_data)

    return ApiResponse(
        success=True,
        data=masked_data,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{org_id}/datasets/{dataset_id}/data")
async def get_org_dataset_data(
    request: Request,
    org_id: uuid.UUID,
    dataset_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=1000),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[dict]:
    """Read cleaned data (schema_raw / DB1) for a dataset cross-org.

    Returns paginated rows from the raw/cleaned data table.
    Logs a VIEW_DATA audit action.
    """
    tenant = _admin_tenant(org_id)
    offset = (page - 1) * page_size

    rows, total, _columns = await get_dataset_data(
        dataset_id, tenant, session, limit=page_size, offset=offset
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATA,
        request=request,
        target_org_id=str(org_id),
        resource_type="DatasetData",
        resource_id=dataset_id,
    )

    total_pages = max(1, math.ceil(total / page_size))

    return ApiResponse(
        success=True,
        data={
            "rows": rows,
            "pagination": PaginationMeta(
                total=total,
                page=page,
                page_size=page_size,
                total_pages=total_pages,
                has_next_page=page < total_pages,
                has_previous_page=page > 1,
            ).model_dump(),
        },
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{org_id}/datasets/{dataset_id}/features")
async def get_org_dataset_features(
    request: Request,
    org_id: uuid.UUID,
    dataset_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=1000),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[dict]:
    """Read transformed features (schema_transformed / DB2) for a dataset.

    Super_admin only. Returns paginated rows from the features table.
    Logs a VIEW_FEATURES audit action for traceability.
    """
    tenant = _admin_tenant(org_id)
    offset = (page - 1) * page_size

    rows, total, _columns = await get_features_data(
        dataset_id, tenant, session, limit=page_size, offset=offset
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_FEATURES,
        request=request,
        target_org_id=str(org_id),
        resource_type="DatasetFeatures",
        resource_id=dataset_id,
    )

    total_pages = max(1, math.ceil(total / page_size))

    return ApiResponse(
        success=True,
        data={
            "rows": rows,
            "pagination": PaginationMeta(
                total=total,
                page=page,
                page_size=page_size,
                total_pages=total_pages,
                has_next_page=page < total_pages,
                has_previous_page=page > 1,
            ).model_dump(),
        },
        timestamp=datetime.now(UTC).isoformat(),
    )
