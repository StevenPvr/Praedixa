"""Arbitrage router — scoring engine and option validation.

Security:
- GET options requires authentication only (any role can view).
- POST validate requires org_admin or manager role.
- TenantFilter ensures organization isolation.
- alert_id path param is UUID-validated by FastAPI/Pydantic.
- Validate internally creates a Decision via the decisions service,
  so all FK validation and tenant checks apply transitively.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter, require_role
from app.core.validation import sanitize_text
from app.models.decision import DecisionPriority, DecisionStatus, DecisionType
from app.schemas.arbitrage import (
    ArbitrageOptionRead,
    ArbitrageResultRead,
    ValidateArbitrageRequest,
)
from app.schemas.decision import DecisionRead
from app.schemas.responses import ApiResponse
from app.services.arbitrage import get_arbitrage_options
from app.services.decisions import create_decision

router = APIRouter(prefix="/api/v1/arbitrage", tags=["arbitrage"])

# Map arbitrage option types to Decision model types
_OPTION_TYPE_TO_DECISION_TYPE: dict[str, DecisionType] = {
    "overtime": DecisionType.OVERTIME,
    "external": DecisionType.EXTERNAL,
    "redistribution": DecisionType.REDISTRIBUTION,
    "no_action": DecisionType.NO_ACTION,
}


@router.get("/{alert_id}/options")
async def get_options(
    alert_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[ArbitrageResultRead]:
    """Get arbitrage options for an alert.

    Returns 4 scored options with a recommendation index.
    """
    result = await get_arbitrage_options(
        alert_id=alert_id,
        tenant=tenant,
        session=session,
    )

    # Convert value objects to Pydantic schemas
    options_read = [
        ArbitrageOptionRead(
            type=opt.type,
            label=opt.label,
            cost=opt.cost,
            delay_days=opt.delay_days,
            coverage_impact_pct=opt.coverage_impact_pct,
            risk_level=opt.risk_level,
            risk_details=opt.risk_details,
            pros=opt.pros,
            cons=opt.cons,
        )
        for opt in result.options
    ]

    data = ArbitrageResultRead(
        alert_id=result.alert_id,
        alert_title=result.alert_title,
        alert_severity=result.alert_severity,
        department_name=result.department_name,
        site_name=result.site_name,
        deficit_pct=result.deficit_pct,
        horizon_days=result.horizon_days,
        options=options_read,
        recommendation_index=result.recommendation_index,
    )

    return ApiResponse(
        success=True,
        data=data,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/{alert_id}/validate", status_code=201)
async def validate_option(
    alert_id: uuid.UUID,
    body: ValidateArbitrageRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[DecisionRead]:
    """Validate (accept) an arbitrage option, creating a Decision.

    Security:
    - Requires org_admin or manager role.
    - Re-fetches options server-side to prevent client-side tampering
      (the client only sends the index, not the option data).
    - The selected option data comes from the server-side scoring engine.
    """
    # Re-compute options server-side to prevent tampering
    result = await get_arbitrage_options(
        alert_id=alert_id,
        tenant=tenant,
        session=session,
    )

    # Validate index bounds (already validated by Pydantic ge=0 le=3,
    # but defense in depth against future changes)
    if body.selected_option_index >= len(result.options):
        from app.core.exceptions import PraedixaError

        raise PraedixaError(
            message="Invalid option index",
            code="VALIDATION_ERROR",
            status_code=422,
        )

    selected = result.options[body.selected_option_index]

    # Map option type to DecisionType
    decision_type = _OPTION_TYPE_TO_DECISION_TYPE.get(
        selected.type, DecisionType.NO_ACTION
    )

    # Build target_period from horizon
    today = datetime.now(UTC).date()
    from datetime import timedelta

    target_period = {
        "startDate": today.isoformat(),
        "endDate": (today + timedelta(days=max(1, result.horizon_days))).isoformat(),
    }

    # Determine priority from alert severity
    severity_to_priority: dict[str, DecisionPriority] = {
        "critical": DecisionPriority.CRITICAL,
        "error": DecisionPriority.HIGH,
        "warning": DecisionPriority.MEDIUM,
        "info": DecisionPriority.LOW,
    }
    priority = severity_to_priority.get(result.alert_severity, DecisionPriority.MEDIUM)

    # Build description and rationale from option data
    description = (
        f"Option selectionnee: {selected.label}. "
        f"Couverture estimee: {selected.coverage_impact_pct}% du deficit. "
        f"Delai: {selected.delay_days} jours. "
        f"Risque: {selected.risk_level}."
    )

    rationale = (
        f"Deficit de {result.deficit_pct}% detecte sur {result.department_name} "
        f"({result.site_name}). {selected.risk_details}"
    )

    # Append user notes if provided
    if body.notes:
        rationale += f" Notes: {sanitize_text(body.notes, max_length=2000)}"

    # Create the decision via the decisions service
    decision = await create_decision(
        tenant=tenant,
        session=session,
        department_id=result.department_id,
        type=decision_type,
        priority=priority,
        title=f"Arbitrage: {selected.label} - {result.department_name}",
        description=description,
        rationale=rationale,
        target_period=target_period,
        estimated_cost=selected.cost,
        cost_of_inaction=None,
        confidence_score=round(selected.coverage_impact_pct, 2),
        risk_indicators={
            "risk_level": selected.risk_level,
            "risk_details": selected.risk_details,
            "source_alert_id": str(result.alert_id),
        },
        user_id=current_user.user_id,
        status=DecisionStatus.PENDING_REVIEW,
    )

    return ApiResponse(
        success=True,
        data=DecisionRead.model_validate(decision),
        timestamp=datetime.now(UTC).isoformat(),
    )
