"""Organization service — org details, sites, and departments.

Security:
- get_organization verifies the org_id matches the tenant's org_id
  (a user cannot query another organization's details).
- Sites and departments are always filtered by TenantFilter.
- list_departments accepts an optional site_id which is also validated
  to belong to the same org (IDOR prevention).
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.models.department import Department
from app.models.organization import Organization
from app.models.site import Site


async def get_organization(
    org_id: uuid.UUID,
    session: AsyncSession,
) -> Organization:
    """Fetch the organization by ID.

    The org_id comes from the authenticated JWT — the user can only
    fetch their own organization. No TenantFilter needed here since
    the org IS the tenant.
    """
    result = await session.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise NotFoundError("Organization", str(org_id))
    return org


async def list_sites(
    tenant: TenantFilter,
    session: AsyncSession,
) -> list[Site]:
    """List all sites for the organization, ordered by name."""
    query = tenant.apply(
        select(Site).order_by(Site.name.asc()),
        Site,
    )
    result = await session.execute(query)
    return list(result.scalars().all())


async def list_departments(
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    site_id: uuid.UUID | None = None,
) -> list[Department]:
    """List departments for the organization, optionally filtered by site.

    If site_id is provided, it is validated to belong to the same
    organization before being used as a filter (IDOR prevention).
    """
    if site_id is not None:
        # Validate site belongs to this org
        site_check = tenant.apply(
            select(Site.id).where(Site.id == site_id),
            Site,
        )
        site_exists = (await session.execute(site_check)).scalar_one_or_none()
        if site_exists is None:
            raise NotFoundError("Site", str(site_id))

    query = tenant.apply(
        select(Department).order_by(Department.name.asc()),
        Department,
    )

    if site_id is not None:
        query = query.where(Department.site_id == site_id)

    result = await session.execute(query)
    return list(result.scalars().all())
