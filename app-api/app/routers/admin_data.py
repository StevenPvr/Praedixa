"""Admin data router — read-only access to client data across organizations.

Reuses existing service functions by passing an admin-scoped TenantFilter.
This avoids code duplication and ensures the same query patterns are used.

Security:
- All endpoints require super_admin role.
- Medical absence data is masked via mask_medical_reasons().
- TenantFilter is created from the path org_id parameter.
- Every endpoint logs an admin audit action.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_admin_tenant_filter, get_db_session
from app.core.security import TenantFilter, require_role
from app.models.admin import AdminAuditAction
from app.models.data_catalog import ClientDataset, IngestionLog
from app.schemas.data_catalog import (
    AdminDatasetRead,
    IngestionLogRead,
)
from app.schemas.decision import DecisionRead
from app.schemas.forecast import ForecastRunRead
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
    pagination_meta_dict,
)
from app.services.admin_audit import log_admin_action
from app.services.datasets import get_dataset_data, get_features_data
from app.services.decisions import list_decisions
from app.services.forecasts import list_forecasts
from app.services.gold_live_data import (
    get_gold_snapshot,
    load_live_quality_reports,
    resolve_client_slug_for_org,
)

router = APIRouter(tags=["admin-data"])


@router.get("/organizations/{target_org_id}/datasets")
async def list_org_datasets(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[AdminDatasetRead]:
    """List datasets for an organization."""
    base_query = tenant.apply(select(ClientDataset), ClientDataset)
    count_query = tenant.apply(select(func.count(ClientDataset.id)), ClientDataset)

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base_query.order_by(ClientDataset.created_at.desc())
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
        target_org_id=str(target_org_id),
    )

    data = [AdminDatasetRead.model_validate(d) for d in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/organizations/{target_org_id}/ingestion-log")
async def list_org_ingestion_log(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[IngestionLogRead]:
    """List ingestion log entries for an organization's datasets."""
    # Join IngestionLog through ClientDataset and apply the admin tenant filter.
    # This keeps SQL-level tenant filtering aligned with RLS context.
    base_query = tenant.apply(
        select(IngestionLog).join(
            ClientDataset,
            IngestionLog.dataset_id == ClientDataset.id,
        ),
        ClientDataset,
    )
    count_query = tenant.apply(
        select(func.count(IngestionLog.id)).join(
            ClientDataset, IngestionLog.dataset_id == ClientDataset.id
        ),
        ClientDataset,
    )

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base_query.order_by(IngestionLog.created_at.desc())
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
        target_org_id=str(target_org_id),
        resource_type="IngestionLog",
    )

    data = [IngestionLogRead.model_validate(i) for i in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/organizations/{target_org_id}/forecasts")
async def list_org_forecasts(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[ForecastRunRead]:
    """List forecast runs for an organization."""
    offset = (page - 1) * page_size

    items, total = await list_forecasts(tenant, session, limit=page_size, offset=offset)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATA,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ForecastRun",
    )

    data = [ForecastRunRead.model_validate(f) for f in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/organizations/{target_org_id}/decisions")
async def list_org_decisions(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[DecisionRead]:
    """List decisions for an organization."""
    offset = (page - 1) * page_size

    items, total = await list_decisions(tenant, session, limit=page_size, offset=offset)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATA,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="Decision",
    )

    data = [DecisionRead.model_validate(d) for d in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/organizations/{target_org_id}/datasets/{dataset_id}/data")
async def get_org_dataset_data(
    request: Request,
    target_org_id: uuid.UUID,
    dataset_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=1000),
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[dict[str, object]]:
    """Read cleaned data from a dataset cross-org.

    Returns paginated rows from the raw/cleaned data table.
    Logs a VIEW_DATA audit action.
    """
    offset = (page - 1) * page_size

    rows, total, _columns = await get_dataset_data(
        dataset_id, tenant, session, limit=page_size, offset=offset
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATA,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="DatasetData",
        resource_id=dataset_id,
    )

    return ApiResponse(
        success=True,
        data={"rows": rows, "pagination": pagination_meta_dict(total, page, page_size)},
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{target_org_id}/datasets/{dataset_id}/features")
async def get_org_dataset_features(
    request: Request,
    target_org_id: uuid.UUID,
    dataset_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=1000),
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[dict[str, object]]:
    """Read transformed features for a dataset.

    Super_admin only. Returns paginated rows from the features table.
    Logs a VIEW_FEATURES audit action for traceability.
    """
    offset = (page - 1) * page_size

    rows, total, _columns = await get_features_data(
        dataset_id, tenant, session, limit=page_size, offset=offset
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_FEATURES,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="DatasetFeatures",
        resource_id=dataset_id,
    )

    return ApiResponse(
        success=True,
        data={"rows": rows, "pagination": pagination_meta_dict(total, page, page_size)},
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{target_org_id}/medallion-quality-report")
async def get_org_medallion_quality_report(
    request: Request,
    target_org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[dict[str, object]]:
    """Return medallion quality/imputation report for admin visibility only."""
    snapshot = get_gold_snapshot()
    client_slug = await resolve_client_slug_for_org(
        session,
        target_org_id,
        {
            str(row.get("client_slug") or "")
            for row in snapshot.rows
            if str(row.get("client_slug") or "")
        },
    )
    reports = load_live_quality_reports()
    silver_quality = reports.get("silver_quality", {})
    gold_feature_quality = reports.get("gold_feature_quality", {})
    last_run_summary = reports.get("last_run_summary", {})

    if isinstance(gold_feature_quality, dict):
        if "removedFromGoldColumnsCount" not in gold_feature_quality:
            value = gold_feature_quality.get("removed_from_gold_columns_count")
            gold_feature_quality["removedFromGoldColumnsCount"] = value
        if "removedFromGoldColumns" not in gold_feature_quality:
            gold_feature_quality["removedFromGoldColumns"] = gold_feature_quality.get(
                "removed_from_gold_columns"
            )

    if isinstance(last_run_summary, dict):
        if "runAt" not in last_run_summary:
            last_run_summary["runAt"] = last_run_summary.get("run_at")
        if "silverRows" not in last_run_summary:
            last_run_summary["silverRows"] = last_run_summary.get("silver_rows")
        if "goldRows" not in last_run_summary:
            last_run_summary["goldRows"] = last_run_summary.get("gold_rows")

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_DATA,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="MedallionQualityReport",
    )

    return ApiResponse(
        success=True,
        data={
            "clientSlug": client_slug,
            "goldRevision": snapshot.revision,
            "silverQuality": silver_quality,
            "goldFeatureQuality": gold_feature_quality,
            "lastRunSummary": last_run_summary,
        },
        timestamp=datetime.now(UTC).isoformat(),
    )
