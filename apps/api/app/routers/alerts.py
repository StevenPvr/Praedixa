"""Alerts router — list active alerts and dismiss them.

Security:
- All endpoints require authentication.
- TenantFilter ensures organization isolation.
- dismiss endpoint uses PATCH (not DELETE) — the alert is soft-dismissed,
  not removed, preserving audit history.
- The alert_id path param is UUID-validated by FastAPI/Pydantic.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.schemas.dashboard import DashboardAlertRead
from app.schemas.responses import ApiResponse
from app.services.alerts import dismiss_alert, list_active_alerts

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


@router.get("")
async def get_active_alerts(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user=Depends(get_current_user),
) -> ApiResponse[list[DashboardAlertRead]]:
    """Return all active (non-dismissed, non-expired) alerts."""
    items = await list_active_alerts(tenant=tenant, session=session)

    return ApiResponse(
        success=True,
        data=[DashboardAlertRead.model_validate(item) for item in items],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.patch("/{alert_id}/dismiss")
async def dismiss_dashboard_alert(
    alert_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user=Depends(get_current_user),
) -> ApiResponse[DashboardAlertRead]:
    """Dismiss an alert. Idempotent — re-dismissing is a no-op."""
    alert = await dismiss_alert(
        alert_id=alert_id,
        tenant=tenant,
        session=session,
    )

    return ApiResponse(
        success=True,
        data=DashboardAlertRead.model_validate(alert),
        timestamp=datetime.now(UTC).isoformat(),
    )
