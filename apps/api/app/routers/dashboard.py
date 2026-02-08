"""Dashboard router — aggregate KPIs endpoint.

Security:
- Requires authentication via get_current_user dependency.
- Data is scoped to the authenticated user's organization via TenantFilter.
- Response uses a dedicated schema — no raw ORM objects leak to the client.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.schemas.dashboard import DashboardSummaryResponse
from app.schemas.responses import ApiResponse
from app.services.dashboard import get_dashboard_summary

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[DashboardSummaryResponse]:
    """Return aggregated dashboard KPIs for the current organization."""
    summary = await get_dashboard_summary(tenant=tenant, session=session)

    data = DashboardSummaryResponse(
        coverage_human=summary.coverage_human,
        coverage_merchandise=summary.coverage_merchandise,
        active_alerts_count=summary.active_alerts_count,
        forecast_accuracy=summary.forecast_accuracy,
        last_forecast_date=summary.last_forecast_date,
    )

    return ApiResponse(
        success=True,
        data=data,
        timestamp=datetime.now(UTC).isoformat(),
    )
