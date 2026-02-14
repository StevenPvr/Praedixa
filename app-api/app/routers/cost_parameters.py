"""Cost parameters router - CRUD and temporal versioning for cost coefficients.

Security:
- All endpoints require authentication (get_current_user).
- TenantFilter ensures organization isolation on all queries.
- Write endpoints (POST) require org_admin role.
- organization_id is NEVER accepted from client - injected from JWT context.
- Pagination params are bounded (page_size max 100).
"""

from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_site_filter,
    get_tenant_filter,
)
from app.core.exceptions import ForbiddenError
from app.core.security import SiteFilter, TenantFilter, require_role
from app.schemas.operational import CostParameterCreate, CostParameterRead
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
)
from app.services.cost_parameter_service import (
    create_cost_parameter,
    get_cost_parameter_history,
    get_effective_cost_parameter,
    list_cost_parameters,
)

router = APIRouter(prefix="/api/v1/cost-parameters", tags=["cost-parameters"])


@router.get("")
async def list_params(
    site_id: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[CostParameterRead]:
    """List cost parameters with optional site filter and pagination."""
    effective_site_id = (
        site_filter.site_id if site_filter.site_id is not None else site_id
    )
    items, total = await list_cost_parameters(
        session,
        tenant,
        site_id=effective_site_id,
        page=page,
        page_size=page_size,
    )

    data = [CostParameterRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/effective")
async def get_effective(
    site_id: str | None = Query(default=None, max_length=50),
    date: date | None = Query(default=None, alias="date"),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[CostParameterRead]:
    """Get effective cost parameter for a site on a given date.

    Falls back to org-wide default if no site-specific parameter is found.
    """
    effective_site_id = (
        site_filter.site_id if site_filter.site_id is not None else site_id
    )
    param = await get_effective_cost_parameter(
        session,
        tenant,
        site_id=effective_site_id,
        target_date=date,
    )

    return ApiResponse(
        success=True,
        data=CostParameterRead.model_validate(param),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/history")
async def get_history(
    site_id: str | None = Query(default=None, max_length=50),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[list[CostParameterRead]]:
    """Get cost parameter version history for a site.

    If site_id is None, returns org-wide default history.
    Ordered by effective_from DESC.
    """
    effective_site_id = (
        site_filter.site_id if site_filter.site_id is not None else site_id
    )
    items = await get_cost_parameter_history(
        session,
        tenant,
        site_id=effective_site_id,
    )

    return ApiResponse(
        success=True,
        data=[CostParameterRead.model_validate(item) for item in items],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("", status_code=201)
async def create_param(
    body: CostParameterCreate,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(require_role("org_admin")),
) -> ApiResponse[CostParameterRead]:
    """Create a new cost parameter version. Requires org_admin role.

    Auto-closes the previous version and auto-increments the version number.
    """
    # Enforce site restriction on creation
    if site_filter.site_id is not None and body.site_id != site_filter.site_id:
        raise ForbiddenError("Cannot create cost parameter for a different site")
    param = await create_cost_parameter(
        session,
        tenant,
        c_int=body.c_int,
        maj_hs=body.maj_hs,
        c_interim=body.c_interim,
        premium_urgence=body.premium_urgence,
        c_backlog=body.c_backlog,
        cap_hs_shift=body.cap_hs_shift,
        cap_interim_site=body.cap_interim_site,
        lead_time_jours=body.lead_time_jours,
        effective_from=body.effective_from,
        site_id=body.site_id,
    )

    return ApiResponse(
        success=True,
        data=CostParameterRead.model_validate(param),
        timestamp=datetime.now(UTC).isoformat(),
    )
