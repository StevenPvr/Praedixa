"""Admin monitoring router — platform KPIs, org metrics, trends, errors.

Security:
- All endpoints require super_admin role.
- period query param validated against allowlist in service layer.
- days param bounded (1-365) to prevent unbounded queries.
"""

import uuid
from datetime import UTC, datetime
from typing import Any, Literal, cast

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session
from app.core.security import require_role
from app.models.admin import AdminAuditAction
from app.schemas.admin import ErrorMetrics, OrgMetrics, PlatformKPIs, UsageTrend
from app.schemas.base import CamelModel
from app.schemas.dashboard import DashboardSummaryResponse
from app.schemas.responses import ApiResponse
from app.services.admin_audit import log_admin_action
from app.services.admin_monitoring import (
    get_error_metrics,
    get_org_metrics,
    get_org_mirror,
    get_platform_kpis,
    get_roi_by_org,
    get_usage_trends,
)

router = APIRouter(tags=["admin-monitoring"])


class RoiByOrgRow(CamelModel):
    """Per-organization ROI and operational adoption metrics."""

    organization_id: uuid.UUID
    organization_name: str
    proof_records: int
    total_gain_net_eur: float
    avg_proof_adoption_pct: float | None
    total_decisions: int
    adopted_count: int
    overridden_count: int
    decision_adoption_pct: float
    active_alerts: int
    failed_ingestions: int
    last_ingestion_failure_at: datetime | None


class RoiByOrgResponse(CamelModel):
    """ROI and MLOps metrics grouped by organization."""

    total_orgs: int
    rows: list[RoiByOrgRow]


@router.get("/monitoring/platform")
async def platform_kpis(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[PlatformKPIs]:
    """Get platform-wide KPIs."""
    kpis = await get_platform_kpis(session)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
    )

    return ApiResponse(
        success=True,
        data=PlatformKPIs(**cast("dict[str, Any]", kpis)),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/monitoring/organizations/{org_id}")
async def org_metrics_endpoint(
    request: Request,
    org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[OrgMetrics]:
    """Get metrics for a specific organization."""
    metrics = await get_org_metrics(session, org_id)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
        target_org_id=str(org_id),
    )

    return ApiResponse(
        success=True,
        data=OrgMetrics(**cast("dict[str, Any]", metrics)),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/monitoring/trends")
async def usage_trends(
    request: Request,
    period: Literal["daily", "weekly", "monthly"] = Query(default="daily"),
    days: int = Query(default=90, ge=1, le=365),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[list[UsageTrend]]:
    """Get usage trends over time."""
    # Map API period names to SQL date_trunc values
    period_map = {"daily": "day", "weekly": "week", "monthly": "month"}
    sql_period = period_map.get(period, "day")

    trends = await get_usage_trends(session, period=sql_period, days=days)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
        metadata={"period": period, "days": days},
    )

    data = [UsageTrend(**cast("dict[str, Any]", t)) for t in trends]
    return ApiResponse(
        success=True,
        data=data,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/monitoring/errors")
async def error_metrics_endpoint(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ErrorMetrics]:
    """Get error rate metrics."""
    metrics = await get_error_metrics(session)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
    )

    return ApiResponse(
        success=True,
        data=ErrorMetrics(**cast("dict[str, Any]", metrics)),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/monitoring/roi/by-org")
async def roi_by_org_endpoint(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[RoiByOrgResponse]:
    """ROI + adoption + overrides + alerts + ingestion failures by org."""
    rows = await get_roi_by_org(session)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
        metadata={"view": "roi_by_org"},
    )

    return ApiResponse(
        success=True,
        data=RoiByOrgResponse(
            total_orgs=len(rows),
            rows=[RoiByOrgRow(**cast("dict[str, Any]", row)) for row in rows],
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/monitoring/organizations/{org_id}/mirror")
async def org_mirror(
    request: Request,
    org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[DashboardSummaryResponse]:
    """Mirror a client's dashboard (read-only admin view)."""
    summary = await get_org_mirror(session, org_id)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MIRROR,
        request=request,
        target_org_id=str(org_id),
    )

    return ApiResponse(
        success=True,
        data=DashboardSummaryResponse(
            coverage_human=summary.coverage_human,
            coverage_merchandise=summary.coverage_merchandise,
            active_alerts_count=summary.active_alerts_count,
            forecast_accuracy=summary.forecast_accuracy,
            last_forecast_date=summary.last_forecast_date,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )
