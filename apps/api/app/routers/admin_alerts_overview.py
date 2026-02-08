"""Admin alerts overview router -- cross-org alert stats and per-org alerts.

Security:
- Cross-org endpoints require super_admin role.
- Per-org endpoints use get_admin_tenant_filter (super_admin + org scoping).
- Every endpoint logs an admin audit action.
"""

import math
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_admin_tenant_filter, get_db_session
from app.core.security import TenantFilter, require_role
from app.models.admin import AdminAuditAction
from app.models.operational import (
    CoverageAlert,
    CoverageAlertStatus,
)
from app.schemas.base import CamelModel, PaginationMeta
from app.schemas.operational import CoverageAlertRead
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.admin_audit import log_admin_action

router = APIRouter(tags=["admin-operational"])


class SeverityCount(CamelModel):
    """Count of alerts per severity level."""

    low: int = 0
    medium: int = 0
    high: int = 0
    critical: int = 0


class StatusCount(CamelModel):
    """Count of alerts per status."""

    open: int = 0
    acknowledged: int = 0
    resolved: int = 0
    expired: int = 0


class AlertSummaryResponse(CamelModel):
    """Cross-org alert statistics summary."""

    total: int
    by_severity: SeverityCount
    by_status: StatusCount


class OrgAlertStat(CamelModel):
    """Per-org alert count."""

    organization_id: uuid.UUID
    total_alerts: int
    open_alerts: int


class AlertsByOrgResponse(CamelModel):
    """Alerts grouped by organization."""

    orgs: list[OrgAlertStat]
    total_orgs: int


@router.get("/monitoring/alerts/summary")
async def alerts_summary(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AlertSummaryResponse]:
    """Cross-org alert stats (total, by severity, by status)."""
    # Total
    total_q = select(func.count(CoverageAlert.id))
    total = (await session.execute(total_q)).scalar_one() or 0

    # By severity
    sev_q = select(CoverageAlert.severity, func.count(CoverageAlert.id)).group_by(
        CoverageAlert.severity
    )
    sev_result = await session.execute(sev_q)
    sev_counts = {row[0].value: row[1] for row in sev_result.all()}

    # By status
    status_q = select(CoverageAlert.status, func.count(CoverageAlert.id)).group_by(
        CoverageAlert.status
    )
    status_result = await session.execute(status_q)
    status_counts = {row[0].value: row[1] for row in status_result.all()}

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_COVERAGE_ALERTS,
        request=request,
        metadata={"view": "cross_org_summary"},
    )

    return ApiResponse(
        success=True,
        data=AlertSummaryResponse(
            total=total,
            by_severity=SeverityCount(
                low=sev_counts.get("low", 0),
                medium=sev_counts.get("medium", 0),
                high=sev_counts.get("high", 0),
                critical=sev_counts.get("critical", 0),
            ),
            by_status=StatusCount(
                open=status_counts.get("open", 0),
                acknowledged=status_counts.get("acknowledged", 0),
                resolved=status_counts.get("resolved", 0),
                expired=status_counts.get("expired", 0),
            ),
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/monitoring/alerts/by-org")
async def alerts_by_org(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AlertsByOrgResponse]:
    """Alerts grouped by organization (paginated)."""
    query = (
        select(
            CoverageAlert.organization_id,
            func.count(CoverageAlert.id).label("total_alerts"),
            func.count(CoverageAlert.id)
            .filter(CoverageAlert.status == CoverageAlertStatus.OPEN)
            .label("open_alerts"),
        )
        .group_by(CoverageAlert.organization_id)
        .order_by(func.count(CoverageAlert.id).desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(query)
    rows = result.all()

    orgs = [
        OrgAlertStat(
            organization_id=row[0],
            total_alerts=row[1],
            open_alerts=row[2],
        )
        for row in rows
    ]

    return ApiResponse(
        success=True,
        data=AlertsByOrgResponse(orgs=orgs, total_orgs=len(orgs)),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{target_org_id}/alerts")
async def org_alerts(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[CoverageAlertRead]:
    """Alerts for a specific organization."""
    base = tenant.apply(select(CoverageAlert), CoverageAlert)
    count_q = tenant.apply(select(func.count(CoverageAlert.id)), CoverageAlert)

    total = (await session.execute(count_q)).scalar_one() or 0
    offset = (page - 1) * page_size
    query = (
        base.order_by(CoverageAlert.alert_date.desc()).offset(offset).limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_COVERAGE_ALERTS,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="CoverageAlert",
    )

    total_pages = max(1, math.ceil(total / page_size))

    return PaginatedResponse(
        success=True,
        data=[CoverageAlertRead.model_validate(item) for item in items],
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
