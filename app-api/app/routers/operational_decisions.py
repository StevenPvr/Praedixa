"""Operational decisions router - CRUD for manager decisions with outcome tracking.

Security:
- All endpoints require authentication (get_current_user).
- TenantFilter ensures organization isolation on all queries.
- Write endpoints (POST, PATCH) require org_admin or manager role.
- decided_by is ALWAYS taken from JWT, never from the request body.
- Pagination params are bounded (page_size max 100).
"""

import uuid
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING, cast

if TYPE_CHECKING:
    from decimal import Decimal

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
from app.core.pagination import calculate_total_pages
from app.core.security import SiteFilter, TenantFilter, require_role
from app.models.operational import CoverageAlert, Horizon
from app.schemas.base import PaginationMeta
from app.schemas.operational import (
    OperationalDecisionCreate,
    OperationalDecisionRead,
    OperationalDecisionUpdate,
    OverrideStatisticsResponse,
)
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.decision_log_service import (
    create_operational_decision,
    get_operational_decision,
    get_override_statistics,
    list_operational_decisions,
    update_operational_decision,
)

router = APIRouter(
    prefix="/api/v1/operational-decisions", tags=["operational-decisions"]
)


@router.get("")
async def list_decisions(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    is_override: bool | None = Query(default=None),
    horizon: Horizon | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[OperationalDecisionRead]:
    """List operational decisions with optional filters and pagination."""
    items, total = await list_operational_decisions(
        session,
        tenant,
        site_id=site_filter.site_id,
        date_from=date_from,
        date_to=date_to,
        is_override=is_override,
        horizon=horizon,
        page=page,
        page_size=page_size,
    )

    total_pages = calculate_total_pages(total, page_size)

    return PaginatedResponse(
        success=True,
        data=[OperationalDecisionRead.model_validate(item) for item in items],
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


@router.get("/override-stats")
async def override_stats(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[OverrideStatisticsResponse]:
    """Get override statistics for the organization."""
    raw = await get_override_statistics(session, tenant)

    data = OverrideStatisticsResponse(
        total_decisions=cast("int", raw["total"]),
        override_count=cast("int", raw["override_count"]),
        override_pct=cast("Decimal", raw["override_pct"]),
        top_override_reasons=cast("list[dict[str, str | int]]", raw["top_reasons"]),
        avg_cost_delta=cast("Decimal | None", raw["avg_cost_delta"]),
    )

    return ApiResponse(
        success=True,
        data=data,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{decision_id}")
async def get_decision(
    decision_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[OperationalDecisionRead]:
    """Get a single operational decision by ID."""
    decision = await get_operational_decision(session, tenant, decision_id)

    return ApiResponse(
        success=True,
        data=OperationalDecisionRead.model_validate(decision),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("", status_code=201)
async def create_decision(
    body: OperationalDecisionCreate,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    current_user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[OperationalDecisionRead]:
    """Create an operational decision. Requires org_admin or manager role.

    decided_by is always taken from the JWT - the client cannot
    impersonate another user.
    """
    # Fetch the alert to get site_id, decision_date, shift, horizon, gap_h.
    # Apply site filter to ensure site-scoped users can only create decisions
    # for alerts in their site.
    alert_q = site_filter.apply(
        tenant.apply(
            select(CoverageAlert).where(CoverageAlert.id == body.coverage_alert_id),
            CoverageAlert,
        ),
        CoverageAlert,
    )
    alert_result = await session.execute(alert_q)
    alert = alert_result.scalar_one_or_none()

    from app.core.exceptions import NotFoundError

    if alert is None:
        raise NotFoundError("CoverageAlert", str(body.coverage_alert_id))

    decision = await create_operational_decision(
        session,
        tenant,
        coverage_alert_id=body.coverage_alert_id,
        chosen_option_id=body.chosen_option_id,
        site_id=alert.site_id,
        decision_date=alert.alert_date,
        shift=alert.shift,
        horizon=alert.horizon,
        gap_h=alert.gap_h,
        decided_by=uuid.UUID(current_user.user_id),
        is_override=body.is_override,
        override_reason=body.override_reason,
        override_category=body.override_category,
        exogenous_event_tag=body.exogenous_event_tag,
        comment=body.comment,
    )

    return ApiResponse(
        success=True,
        data=OperationalDecisionRead.model_validate(decision),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.patch("/{decision_id}")
async def update_decision(
    decision_id: uuid.UUID,
    body: OperationalDecisionUpdate,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[OperationalDecisionRead]:
    """Update an operational decision (observed outcomes).

    Requires org_admin or manager role.
    """
    decision = await update_operational_decision(
        session,
        tenant,
        decision_id,
        cout_observe_eur=body.cout_observe_eur,
        service_observe_pct=body.service_observe_pct,
        exogenous_event_tag=body.exogenous_event_tag,
        comment=body.comment,
    )

    return ApiResponse(
        success=True,
        data=OperationalDecisionRead.model_validate(decision),
        timestamp=datetime.now(UTC).isoformat(),
    )
