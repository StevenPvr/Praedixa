"""Forecasts router — list runs and daily forecast data.

Security:
- All endpoints require authentication.
- TenantFilter enforces org-scoped data access.
- Pagination limits enforced: page_size capped at 100.
- UUID path params are validated by Pydantic/FastAPI automatically.
- ForecastStatus and ForecastDimension are enum-validated (no freeform input).
- Date range validation: start_date must be <= end_date when both are provided.
"""

import uuid
from datetime import UTC, date, datetime
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.models.daily_forecast import ForecastDimension
from app.models.forecast_run import ForecastStatus
from app.schemas.base import PaginationMeta
from app.schemas.forecast import DailyForecastRead, ForecastRunSummary
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.forecasts import get_daily_forecasts, list_forecasts

router = APIRouter(prefix="/api/v1/forecasts", tags=["forecasts"])

# Hard cap to prevent resource exhaustion via large page_size
MAX_PAGE_SIZE = 100


@router.get("")
async def list_forecast_runs(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user=Depends(get_current_user),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(
        default=20, ge=1, le=MAX_PAGE_SIZE, description="Items per page"
    ),
    status: ForecastStatus | None = Query(default=None, description="Filter by status"),
) -> PaginatedResponse[ForecastRunSummary]:
    """Return paginated forecast runs for the current organization."""
    offset = (page - 1) * page_size

    items, total = await list_forecasts(
        tenant=tenant,
        session=session,
        limit=page_size,
        offset=offset,
        status_filter=status,
    )

    total_pages = ceil(total / page_size) if page_size > 0 else 0

    return PaginatedResponse(
        success=True,
        data=[ForecastRunSummary.model_validate(item) for item in items],
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


@router.get("/{run_id}/daily")
async def get_daily_forecast_data(
    run_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user=Depends(get_current_user),
    dimension: ForecastDimension | None = Query(
        default=None, description="Filter by dimension"
    ),
    start_date: date | None = Query(default=None, description="Start date (inclusive)"),
    end_date: date | None = Query(default=None, description="End date (inclusive)"),
) -> ApiResponse[list[DailyForecastRead]]:
    """Return daily forecasts for a specific run."""
    # Validate date range: start_date must be <= end_date
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )

    items = await get_daily_forecasts(
        run_id=run_id,
        tenant=tenant,
        session=session,
        dimension=dimension,
        date_from=start_date,
        date_to=end_date,
    )

    return ApiResponse(
        success=True,
        data=[DailyForecastRead.model_validate(item) for item in items],
        timestamp=datetime.now(UTC).isoformat(),
    )
