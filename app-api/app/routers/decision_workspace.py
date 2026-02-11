"""Decision workspace router for split-view operational triage.

Security:
- Requires authentication on all endpoints.
- TenantFilter and SiteFilter enforce org/site isolation.
- Returns server-computed diagnostics from trusted model outputs.
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_site_filter,
    get_tenant_filter,
)
from app.core.exceptions import NotFoundError
from app.core.security import SiteFilter, TenantFilter
from app.models.operational import CoverageAlert
from app.schemas.operational import CoverageAlertRead, ScenarioOptionRead
from app.schemas.responses import ApiResponse
from app.schemas.ux import DecisionDiagnosticRead, DecisionWorkspaceRead
from app.services.scenario_engine_service import (
    compute_pareto_frontier,
    get_scenarios_for_alert,
    select_recommendation,
)

router = APIRouter(prefix="/api/v1/decision-workspace", tags=["decision-workspace"])
_MAX_TOP_DRIVERS = 5
_RISK_WORSENING_THRESHOLD = 0.65
_RISK_IMPROVING_THRESHOLD = 0.35


def _as_float(value: Decimal | float | int | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _build_diagnostic(alert: CoverageAlert) -> DecisionDiagnosticRead:
    top_drivers: list[str] = []
    for item in alert.drivers_json:
        if not isinstance(item, str):
            continue
        normalized = item.strip()
        if not normalized:
            continue
        top_drivers.append(normalized[:120])
        if len(top_drivers) >= _MAX_TOP_DRIVERS:
            break

    rupture = _as_float(alert.p_rupture)
    confidence_pct = None
    risk_trend: str | None = None
    note: str | None = None

    if rupture is not None:
        rupture = max(0.0, min(1.0, rupture))
        confidence_pct = round(rupture * 100.0, 1)
        if rupture >= _RISK_WORSENING_THRESHOLD:
            risk_trend = "worsening"
            note = "High rupture probability. Prioritize action today."
        elif rupture <= _RISK_IMPROVING_THRESHOLD:
            risk_trend = "improving"
            note = "Risk is relatively contained but should be monitored."
        else:
            risk_trend = "stable"
            note = "Risk remains material. Keep monitoring this alert."

    return DecisionDiagnosticRead(
        top_drivers=top_drivers,
        confidence_pct=confidence_pct,
        risk_trend=risk_trend,
        note=note,
    )


@router.get("/{alert_id}")
async def get_decision_workspace(
    alert_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[DecisionWorkspaceRead]:
    """Return alert context + scenarios + recommendation for one alert."""
    alert_query = tenant.apply(
        select(CoverageAlert).where(CoverageAlert.id == alert_id),
        CoverageAlert,
    )
    alert_query = site_filter.apply(alert_query, CoverageAlert)
    alert_result = await session.execute(alert_query)
    alert = alert_result.scalar_one_or_none()
    if alert is None:
        raise NotFoundError("CoverageAlert", str(alert_id))

    options = await get_scenarios_for_alert(session, tenant, alert_id)

    recommended = next((opt for opt in options if opt.is_recommended), None)
    if recommended is None and options:
        recommended = select_recommendation(compute_pareto_frontier(options))

    workspace = DecisionWorkspaceRead(
        alert=CoverageAlertRead.model_validate(alert),
        options=[ScenarioOptionRead.model_validate(opt) for opt in options],
        recommended_option_id=(recommended.id if recommended else None),
        diagnostic=_build_diagnostic(alert),
    )

    return ApiResponse(
        success=True,
        data=workspace,
        timestamp=datetime.now(UTC).isoformat(),
    )
