"""Forecast service — list runs and daily forecast data.

Security:
- All queries scoped by TenantFilter (organization_id isolation).
- Dimension is validated via the ForecastDimension enum — no freeform input.
- Pagination uses LIMIT/OFFSET with enforced max page_size at the router layer.
"""

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.pagination import normalize_limit_offset
from app.core.security import TenantFilter
from app.models.daily_forecast import DailyForecast, ForecastDimension
from app.models.forecast_run import ForecastRun, ForecastStatus


async def list_forecasts(
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    limit: int = 20,
    offset: int = 0,
    status_filter: ForecastStatus | None = None,
) -> tuple[list[ForecastRun], int]:
    """Return paginated forecast runs for the organization.

    Results are ordered by completed_at DESC (most recent first),
    with PENDING/RUNNING runs (null completed_at) sorted last.

    Returns (items, total_count) for pagination metadata.
    """
    base_query = tenant.apply(select(ForecastRun), ForecastRun)

    if status_filter is not None:
        base_query = base_query.where(ForecastRun.status == status_filter)

    # Total count (before pagination)
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await session.execute(count_query)).scalar_one()

    # Paginated results — completed_at DESC, nulls last
    limit, offset = normalize_limit_offset(limit, offset)
    items_query = (
        base_query.order_by(ForecastRun.completed_at.desc().nulls_last())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(items_query)
    items = list(result.scalars().all())

    return items, total


async def get_daily_forecasts(
    run_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    dimension: ForecastDimension | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[DailyForecast]:
    """Return daily forecasts for a specific run.

    Security: The run_id is validated to belong to the tenant's org
    before querying daily forecasts. This prevents IDOR where a user
    guesses another org's run_id.

    Filters:
    - dimension: filter by human or merchandise
    - date_from / date_to: inclusive date range filter
    """
    # Verify the run belongs to this organization (IDOR prevention)
    run_check = tenant.apply(
        select(ForecastRun.id).where(ForecastRun.id == run_id),
        ForecastRun,
    )
    run_exists = (await session.execute(run_check)).scalar_one_or_none()
    if run_exists is None:
        raise NotFoundError("ForecastRun", str(run_id))

    # Build daily forecast query — also tenant-scoped
    query = tenant.apply(
        select(DailyForecast).where(
            DailyForecast.forecast_run_id == run_id,
        ),
        DailyForecast,
    )

    if dimension is not None:
        query = query.where(DailyForecast.dimension == dimension)

    if date_from is not None:
        query = query.where(DailyForecast.forecast_date >= date_from)

    if date_to is not None:
        query = query.where(DailyForecast.forecast_date <= date_to)

    query = query.order_by(DailyForecast.forecast_date.asc())

    result = await session.execute(query)
    return list(result.scalars().all())


async def get_latest_daily_forecasts(
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    dimension: ForecastDimension | None = None,
) -> list[DailyForecast]:
    """Return daily forecasts for the latest completed run in this organization."""
    latest_run_query = tenant.apply(
        select(ForecastRun.id)
        .where(ForecastRun.status == ForecastStatus.COMPLETED)
        .order_by(ForecastRun.completed_at.desc().nulls_last())
        .limit(1),
        ForecastRun,
    )
    latest_run_id = (await session.execute(latest_run_query)).scalar_one_or_none()
    if latest_run_id is None:
        return []

    query = tenant.apply(
        select(DailyForecast).where(DailyForecast.forecast_run_id == latest_run_id),
        DailyForecast,
    )
    if dimension is not None:
        query = query.where(DailyForecast.dimension == dimension)

    query = query.order_by(DailyForecast.forecast_date.asc())
    result = await session.execute(query)
    return list(result.scalars().all())
