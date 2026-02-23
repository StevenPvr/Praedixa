"""Analytics router — compatibility endpoints for legacy webapp clients."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.schemas.compat import (
    CostComparisonRead,
    CostImpactAnalysisRead,
    DateRangeRead,
    DirectCostsRead,
    IndirectCostsRead,
)
from app.schemas.responses import ApiResponse
from app.services.analytics import get_cost_impact_analysis

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.auth import JWTPayload
    from app.core.security import TenantFilter

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/costs")
async def get_costs_analysis(
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    department_id: str | None = Query(default=None, alias="departmentId"),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[CostImpactAnalysisRead]:
    """Return legacy-compatible cost impact analysis payload."""
    try:
        result = await get_cost_impact_analysis(
            session,
            tenant,
            start_date=start_date,
            end_date=end_date,
            department_id=department_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc

    data = CostImpactAnalysisRead(
        period=DateRangeRead(start_date=result.start_date, end_date=result.end_date),
        department_id=result.department_id,
        direct_costs=DirectCostsRead(
            replacement_costs=result.direct_replacement,
            overtime_costs=result.direct_overtime,
            external_contractor_costs=result.direct_external,
        ),
        indirect_costs=IndirectCostsRead(
            productivity_loss=result.indirect_productivity,
            management_overhead=result.indirect_management,
            training_costs=result.indirect_training,
        ),
        total_cost=result.total_cost,
        cost_per_absence_day=result.cost_per_absence_day,
        comparison=CostComparisonRead(
            previous_period_cost=result.previous_period_cost,
            percentage_change=result.percentage_change,
        ),
    )

    return ApiResponse(
        success=True,
        data=data,
        timestamp=datetime.now(UTC).isoformat(),
    )
