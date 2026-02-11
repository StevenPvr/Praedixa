"""Live client endpoints backed by medallion Gold + mock forecast signals."""
# ruff: noqa: TC001, TC002

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_site_filter,
    get_tenant_filter,
)
from app.core.pagination import calculate_total_pages
from app.core.security import SiteFilter, TenantFilter
from app.models.daily_forecast import ForecastDimension
from app.models.forecast_run import ForecastStatus
from app.models.operational import CoverageAlertSeverity, CoverageAlertStatus, Horizon
from app.schemas.base import PaginationMeta
from app.schemas.dashboard import DashboardSummaryResponse
from app.schemas.forecast import DailyForecastRead, ForecastRunSummary
from app.schemas.operational import (
    CanonicalQualityDashboard,
    CanonicalRecordRead,
    CoverageAlertRead,
    ProofRecordRead,
)
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.gold_live_data import (
    build_canonical_quality,
    build_canonical_records,
    build_coverage_alerts,
    build_daily_forecasts,
    build_dashboard_summary,
    build_forecast_runs,
    build_proof_records,
    filter_rows,
    get_gold_snapshot,
    resolve_client_slug_for_org,
    resolve_site_code_for_filter,
)

router = APIRouter(prefix="/api/v1/live", tags=["live-client"])


async def _scoped_rows(
    *,
    session: AsyncSession,
    tenant: TenantFilter,
    site_filter: SiteFilter,
    requested_site: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[uuid.UUID, list[dict[str, Any]]]:
    snapshot = get_gold_snapshot()
    org_id = uuid.UUID(tenant.organization_id)
    available_client_slugs: set[str] = set()
    client_site_codes: dict[str, set[str]] = {}
    for row in snapshot.rows:
        client_slug = str(row.get("client_slug") or "").strip()
        if not client_slug:
            continue
        available_client_slugs.add(client_slug)
        site_code = str(row.get("site_code") or "").strip().upper()
        if site_code:
            client_site_codes.setdefault(client_slug, set()).add(site_code)

    client_slug = await resolve_client_slug_for_org(
        session,
        org_id,
        available_client_slugs,
        client_site_codes,
    )
    if client_slug is None:
        return org_id, []

    site_code = await resolve_site_code_for_filter(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=requested_site,
    )
    rows = filter_rows(
        snapshot.rows,
        client_slug=client_slug,
        site_code=site_code,
        date_from=date_from,
        date_to=date_to,
    )
    return org_id, rows


def _paginate[T](items: list[T], page: int, page_size: int) -> tuple[list[T], int]:
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return items[start:end], total


@router.get("/dashboard/summary")
async def get_live_dashboard_summary(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[DashboardSummaryResponse]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
    )
    summary = build_dashboard_summary(rows)
    return ApiResponse(
        success=True,
        data=DashboardSummaryResponse.model_validate(summary),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/forecasts/latest/daily")
async def get_live_latest_daily_forecasts(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
    dimension: ForecastDimension | None = Query(default=None),
) -> ApiResponse[list[DailyForecastRead]]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
    )
    forecasts = build_daily_forecasts(
        rows=rows,
        organization_id=org_id,
        dimension=dimension,
    )
    return ApiResponse(
        success=True,
        data=[DailyForecastRead.model_validate(item) for item in forecasts],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/forecasts")
async def list_live_forecast_runs(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
    status: ForecastStatus | None = Query(default=None),
) -> ApiResponse[list[ForecastRunSummary]]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
    )
    runs = build_forecast_runs(rows)
    if status is not None:
        runs = [run for run in runs if run["status"] == status]
    return ApiResponse(
        success=True,
        data=[ForecastRunSummary.model_validate(item) for item in runs],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/canonical")
async def list_live_canonical_records(
    site_id: str | None = Query(default=None, max_length=80),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[CanonicalRecordRead]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
        date_from=date_from,
        date_to=date_to,
    )
    records = build_canonical_records(rows=rows, organization_id=org_id)
    page_items, total = _paginate(records, page, page_size)
    total_pages = calculate_total_pages(total, page_size)
    return PaginatedResponse(
        success=True,
        data=[CanonicalRecordRead.model_validate(item) for item in page_items],
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


@router.get("/canonical/quality")
async def get_live_canonical_quality(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[CanonicalQualityDashboard]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
    )
    quality = build_canonical_quality(rows)
    return ApiResponse(
        success=True,
        data=CanonicalQualityDashboard.model_validate(quality),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/coverage-alerts")
async def list_live_coverage_alerts(
    status: CoverageAlertStatus | None = Query(default=None),
    severity: CoverageAlertSeverity | None = Query(default=None),
    horizon: Horizon | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[CoverageAlertRead]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        date_from=date_from,
        date_to=date_to,
    )
    alerts = build_coverage_alerts(rows=rows, organization_id=org_id)
    if status is not None:
        alerts = [alert for alert in alerts if alert["status"] == status]
    if severity is not None:
        alerts = [alert for alert in alerts if alert["severity"] == severity]
    if horizon is not None:
        alerts = [alert for alert in alerts if alert["horizon"] == horizon]

    page_items, total = _paginate(alerts, page, page_size)
    total_pages = calculate_total_pages(total, page_size)
    return PaginatedResponse(
        success=True,
        data=[CoverageAlertRead.model_validate(item) for item in page_items],
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


@router.get("/proof")
async def list_live_proof_records(
    site_id: str | None = Query(default=None, max_length=80),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[ProofRecordRead]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    records = build_proof_records(rows=rows, organization_id=org_id)
    page_items, total = _paginate(records, page, page_size)
    total_pages = calculate_total_pages(total, page_size)
    return PaginatedResponse(
        success=True,
        data=[ProofRecordRead.model_validate(item) for item in page_items],
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
