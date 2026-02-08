"""Cost parameter service — CRUD and temporal versioning for cost coefficients.

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- Version auto-increment and effective_until closing prevent
  client-side manipulation of cost parameter history.
- No raw SQL — SQLAlchemy ORM queries only.
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import func, select, update

from app.core.exceptions import NotFoundError
from app.models.operational import CostParameter

if TYPE_CHECKING:
    from datetime import date

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter


async def list_cost_parameters(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    site_id: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[CostParameter], int]:
    """List cost parameters with optional site filter and pagination.

    Tenant isolation: mandatory WHERE on organization_id via TenantFilter.
    Returns (items, total_count). Ordered by effective_from DESC.
    """
    base = tenant.apply(select(CostParameter), CostParameter)
    count_q = tenant.apply(select(func.count(CostParameter.id)), CostParameter)

    if site_id is not None:
        base = base.where(CostParameter.site_id == site_id)
        count_q = count_q.where(CostParameter.site_id == site_id)

    total = (await session.execute(count_q)).scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base.order_by(CostParameter.effective_from.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_effective_cost_parameter(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    site_id: str | None = None,
    target_date: date | None = None,
) -> CostParameter:
    """Get the effective cost parameter for a site on a given date.

    Tenant isolation: TenantFilter on query.
    Fallback: site-specific -> org-wide default (site_id IS NULL).
    Raises NotFoundError if no matching parameter exists.

    A parameter is effective if:
    - effective_from <= target_date
    - effective_until is NULL or effective_until >= target_date
    """
    from datetime import UTC, datetime

    ref_date = target_date or datetime.now(tz=UTC).date()

    # Try site-specific first
    if site_id is not None:
        query = (
            tenant.apply(
                select(CostParameter).where(
                    CostParameter.site_id == site_id,
                    CostParameter.effective_from <= ref_date,
                    (CostParameter.effective_until.is_(None))
                    | (CostParameter.effective_until >= ref_date),
                ),
                CostParameter,
            )
            .order_by(CostParameter.effective_from.desc())
            .limit(1)
        )

        result = await session.execute(query)
        param = result.scalar_one_or_none()
        if param is not None:
            return param

    # Fallback to org-wide default (site_id IS NULL)
    default_query = (
        tenant.apply(
            select(CostParameter).where(
                CostParameter.site_id.is_(None),
                CostParameter.effective_from <= ref_date,
                (CostParameter.effective_until.is_(None))
                | (CostParameter.effective_until >= ref_date),
            ),
            CostParameter,
        )
        .order_by(CostParameter.effective_from.desc())
        .limit(1)
    )

    result = await session.execute(default_query)
    param = result.scalar_one_or_none()

    if param is None:
        raise NotFoundError("CostParameter", site_id or "default")

    return param


async def create_cost_parameter(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    c_int: Decimal,
    maj_hs: Decimal,
    c_interim: Decimal,
    premium_urgence: Decimal = Decimal("0.1000"),
    c_backlog: Decimal = Decimal("60.00"),
    cap_hs_shift: int = 30,
    cap_interim_site: int = 50,
    lead_time_jours: int = 2,
    effective_from: date,
    site_id: str | None = None,
) -> CostParameter:
    """Create a new cost parameter version.

    Tenant isolation: organization_id from TenantFilter, never from client.
    Auto-close previous version's effective_until to the day before the new
    effective_from, maintaining a clean temporal chain.
    Auto-increment version based on existing versions for the same site.
    """
    org_id = uuid.UUID(tenant.organization_id)

    # Find max version for this site
    version_q = tenant.apply(
        select(func.coalesce(func.max(CostParameter.version), 0)),
        CostParameter,
    )
    if site_id is not None:
        version_q = version_q.where(CostParameter.site_id == site_id)
    else:
        version_q = version_q.where(CostParameter.site_id.is_(None))

    max_version = (await session.execute(version_q)).scalar_one() or 0
    new_version = max_version + 1

    # Close previous open version (effective_until IS NULL)
    close_stmt = tenant.apply(
        select(CostParameter).where(CostParameter.effective_until.is_(None)),
        CostParameter,
    )
    if site_id is not None:
        close_stmt = close_stmt.where(CostParameter.site_id == site_id)
    else:
        close_stmt = close_stmt.where(CostParameter.site_id.is_(None))

    prev_result = await session.execute(close_stmt)
    prev = prev_result.scalar_one_or_none()

    if prev is not None:
        from datetime import timedelta

        close_date = effective_from - timedelta(days=1)
        await session.execute(
            update(CostParameter)
            .where(
                CostParameter.id == prev.id,
                CostParameter.organization_id == org_id,
            )
            .values(effective_until=close_date)
        )

    param = CostParameter(
        organization_id=org_id,
        site_id=site_id,
        version=new_version,
        c_int=c_int,
        maj_hs=maj_hs,
        c_interim=c_interim,
        premium_urgence=premium_urgence,
        c_backlog=c_backlog,
        cap_hs_shift=cap_hs_shift,
        cap_interim_site=cap_interim_site,
        lead_time_jours=lead_time_jours,
        effective_from=effective_from,
        effective_until=None,
    )
    session.add(param)
    await session.flush()
    return param


async def get_cost_parameter_history(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    site_id: str | None = None,
) -> list[CostParameter]:
    """Get all cost parameter versions for a site, ordered by effective_from DESC.

    Tenant isolation: mandatory WHERE on organization_id via TenantFilter.
    If site_id is None, returns org-wide defaults.
    """
    query = tenant.apply(select(CostParameter), CostParameter)

    if site_id is not None:
        query = query.where(CostParameter.site_id == site_id)
    else:
        query = query.where(CostParameter.site_id.is_(None))

    query = query.order_by(CostParameter.effective_from.desc())
    result = await session.execute(query)
    return list(result.scalars().all())
