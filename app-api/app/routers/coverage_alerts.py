"""Coverage alerts router - list, acknowledge, and resolve coverage alerts.

Security:
- All endpoints require authentication (get_current_user).
- TenantFilter ensures organization isolation on all queries.
- Status mutation (acknowledge, resolve) requires org_admin or manager role.
- Alert status transitions are validated server-side.
- Pagination params are bounded (page_size max 100).
"""

import math
import uuid
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_site_filter,
    get_tenant_filter,
)
from app.core.exceptions import NotFoundError
from app.core.security import SiteFilter, TenantFilter, require_role
from app.models.operational import (
    CoverageAlert,
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
)
from app.schemas.base import PaginationMeta
from app.schemas.operational import (
    CoverageAlertAcknowledge,
    CoverageAlertRead,
    CoverageAlertResolve,
)
from app.schemas.responses import ApiResponse, PaginatedResponse

router = APIRouter(prefix="/api/v1/coverage-alerts", tags=["coverage-alerts"])


async def _list_alerts(
    session: AsyncSession,
    tenant: TenantFilter,
    site_filter: SiteFilter,
    *,
    status: CoverageAlertStatus | None = None,
    severity: CoverageAlertSeverity | None = None,
    horizon: Horizon | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[CoverageAlert], int]:
    """List coverage alerts with filters and pagination."""
    from sqlalchemy import func

    base = tenant.apply(select(CoverageAlert), CoverageAlert)
    count_q = tenant.apply(select(func.count(CoverageAlert.id)), CoverageAlert)

    # Apply site filter from JWT (authoritative, cannot be bypassed).
    base = site_filter.apply(base, CoverageAlert)
    count_q = site_filter.apply(count_q, CoverageAlert)

    if status is not None:
        base = base.where(CoverageAlert.status == status)
        count_q = count_q.where(CoverageAlert.status == status)

    if severity is not None:
        base = base.where(CoverageAlert.severity == severity)
        count_q = count_q.where(CoverageAlert.severity == severity)

    if horizon is not None:
        base = base.where(CoverageAlert.horizon == horizon)
        count_q = count_q.where(CoverageAlert.horizon == horizon)

    if date_from is not None:
        base = base.where(CoverageAlert.alert_date >= date_from)
        count_q = count_q.where(CoverageAlert.alert_date >= date_from)

    if date_to is not None:
        base = base.where(CoverageAlert.alert_date <= date_to)
        count_q = count_q.where(CoverageAlert.alert_date <= date_to)

    total = (await session.execute(count_q)).scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base.order_by(CoverageAlert.alert_date.desc(), CoverageAlert.severity.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def _get_alert(
    session: AsyncSession,
    tenant: TenantFilter,
    alert_id: uuid.UUID,
    site_filter: SiteFilter | None = None,
) -> CoverageAlert:
    """Get a single alert with tenant and site isolation."""
    query = tenant.apply(
        select(CoverageAlert).where(CoverageAlert.id == alert_id),
        CoverageAlert,
    )
    if site_filter is not None:
        query = site_filter.apply(query, CoverageAlert)
    result = await session.execute(query)
    alert: CoverageAlert | None = result.scalar_one_or_none()

    if alert is None:
        raise NotFoundError("CoverageAlert", str(alert_id))

    return alert


@router.get("")
async def list_alerts(
    status: CoverageAlertStatus | None = Query(default=None),
    severity: CoverageAlertSeverity | None = Query(default=None),
    horizon: Horizon | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[CoverageAlertRead]:
    """List coverage alerts with optional filters and pagination."""
    items, total = await _list_alerts(
        session,
        tenant,
        site_filter,
        status=status,
        severity=severity,
        horizon=horizon,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

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


@router.get("/{alert_id}")
async def get_single_alert(
    alert_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[CoverageAlertRead]:
    """Get a single coverage alert by ID."""
    alert = await _get_alert(session, tenant, alert_id, site_filter=site_filter)

    return ApiResponse(
        success=True,
        data=CoverageAlertRead.model_validate(alert),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: uuid.UUID,
    _body: CoverageAlertAcknowledge,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[CoverageAlertRead]:
    """Acknowledge a coverage alert. Requires org_admin or manager role.

    Sets status to ACKNOWLEDGED and records the timestamp.
    """
    alert = await _get_alert(session, tenant, alert_id, site_filter=site_filter)

    alert.status = CoverageAlertStatus.ACKNOWLEDGED
    alert.acknowledged_at = datetime.now(UTC)
    await session.flush()

    return ApiResponse(
        success=True,
        data=CoverageAlertRead.model_validate(alert),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: uuid.UUID,
    _body: CoverageAlertResolve,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[CoverageAlertRead]:
    """Resolve a coverage alert. Requires org_admin or manager role.

    Sets status to RESOLVED and records the timestamp.
    """
    alert = await _get_alert(session, tenant, alert_id, site_filter=site_filter)

    alert.status = CoverageAlertStatus.RESOLVED
    alert.resolved_at = datetime.now(UTC)
    await session.flush()

    return ApiResponse(
        success=True,
        data=CoverageAlertRead.model_validate(alert),
        timestamp=datetime.now(UTC).isoformat(),
    )
