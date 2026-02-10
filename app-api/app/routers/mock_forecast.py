"""Mock forecast router - trigger mock forecast generation.

Security:
- Requires org_admin role (demo/staging feature).
- TenantFilter ensures organization isolation.
- Mock forecasts are deterministic per (org_id + date).
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session, get_tenant_filter
from app.core.security import TenantFilter, require_role
from app.schemas.operational import (
    MockForecastTriggerRequest,
    MockForecastTriggerResponse,
)
from app.schemas.responses import ApiResponse
from app.services.mock_forecast_service import generate_mock_forecasts

router = APIRouter(prefix="/api/v1/mock-forecast", tags=["mock-forecast"])


@router.post("", status_code=201)
async def trigger_mock_forecast(
    body: MockForecastTriggerRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(require_role("org_admin")),
) -> ApiResponse[MockForecastTriggerResponse]:
    """Trigger mock forecast generation. Requires org_admin role.

    Generates probabilistic coverage alerts from canonical data patterns.
    Used in demo/staging environments.
    """
    alerts_generated = await generate_mock_forecasts(
        session,
        tenant,
        days_lookback=body.days_lookback,
    )

    return ApiResponse(
        success=True,
        data=MockForecastTriggerResponse(
            alerts_generated=alerts_generated,
            message=f"Generated {alerts_generated} coverage alerts from mock forecast",
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )
