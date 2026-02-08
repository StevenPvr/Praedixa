"""Scenarios router - Pareto-optimal remediation option generation.

Security:
- All endpoints require authentication (get_current_user).
- TenantFilter ensures organization isolation on all queries.
- Scenario generation requires org_admin or manager role.
- ScenarioOption data is server-computed, never from client input.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter, require_role
from app.schemas.operational import ParetoFrontierResponse, ScenarioOptionRead
from app.schemas.responses import ApiResponse
from app.services.scenario_engine_service import (
    compute_pareto_frontier,
    generate_scenarios,
    get_scenarios_for_alert,
    select_recommendation,
)

router = APIRouter(prefix="/api/v1/scenarios", tags=["scenarios"])


@router.get("/alert/{alert_id}")
async def get_alert_scenarios(
    alert_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[ParetoFrontierResponse]:
    """Get scenarios and Pareto frontier for a coverage alert."""
    options = await get_scenarios_for_alert(session, tenant, alert_id)

    pareto = compute_pareto_frontier(options)
    recommended = select_recommendation(pareto)

    return ApiResponse(
        success=True,
        data=ParetoFrontierResponse(
            alert_id=alert_id,
            options=[ScenarioOptionRead.model_validate(opt) for opt in options],
            pareto_frontier=[ScenarioOptionRead.model_validate(opt) for opt in pareto],
            recommended=(
                ScenarioOptionRead.model_validate(recommended)
                if recommended
                else None
            ),
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/generate/{alert_id}", status_code=201)
async def generate_alert_scenarios(
    alert_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[ParetoFrontierResponse]:
    """Generate scenarios for a coverage alert. Requires org_admin or manager role.

    Creates 6 scenario options, computes the Pareto frontier, and selects
    the recommended option.
    """
    options = await generate_scenarios(session, tenant, alert_id)

    pareto = [opt for opt in options if opt.is_pareto_optimal]
    recommended = next((opt for opt in options if opt.is_recommended), None)

    return ApiResponse(
        success=True,
        data=ParetoFrontierResponse(
            alert_id=alert_id,
            options=[ScenarioOptionRead.model_validate(opt) for opt in options],
            pareto_frontier=[ScenarioOptionRead.model_validate(opt) for opt in pareto],
            recommended=(
                ScenarioOptionRead.model_validate(recommended)
                if recommended
                else None
            ),
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )
