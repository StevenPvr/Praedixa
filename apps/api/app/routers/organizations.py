"""Organizations router — org info, sites, and departments.

Security:
- All endpoints require authentication.
- get_organization_me uses the org_id from the JWT — a user can only see
  their own organization (no path param to manipulate).
- Sites and departments are filtered by TenantFilter.
- The optional site_id query param is UUID-validated and further checked
  by the service layer for org membership (IDOR prevention).
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.schemas.department import DepartmentRead
from app.schemas.organization import OrganizationRead
from app.schemas.responses import ApiResponse
from app.schemas.site import SiteRead
from app.services.organizations import (
    get_organization,
    list_departments,
    list_sites,
)

router = APIRouter(prefix="/api/v1", tags=["organizations"])


@router.get("/organizations/me")
async def get_organization_me(
    current_user: JWTPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ApiResponse[OrganizationRead]:
    """Return the authenticated user's organization.

    The org_id is extracted from the verified JWT — no user-supplied
    org identifier, eliminating any possibility of accessing another org.
    """
    org = await get_organization(
        org_id=uuid.UUID(current_user.organization_id),
        session=session,
    )

    return ApiResponse(
        success=True,
        data=OrganizationRead.model_validate(org),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/sites")
async def get_sites(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[list[SiteRead]]:
    """Return all sites for the current organization."""
    items = await list_sites(tenant=tenant, session=session)

    return ApiResponse(
        success=True,
        data=[SiteRead.model_validate(item) for item in items],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/departments")
async def get_departments(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
    site_id: uuid.UUID | None = Query(default=None, description="Filter by site UUID"),
) -> ApiResponse[list[DepartmentRead]]:
    """Return all departments, optionally filtered by site."""
    items = await list_departments(
        tenant=tenant,
        session=session,
        site_id=site_id,
    )

    return ApiResponse(
        success=True,
        data=[DepartmentRead.model_validate(item) for item in items],
        timestamp=datetime.now(UTC).isoformat(),
    )
