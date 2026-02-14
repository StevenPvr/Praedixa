"""Admin scenarios router -- cross-org scenario stats and per-org scenarios.

Security:
- Cross-org endpoints require super_admin role.
- Per-org endpoints use get_admin_tenant_filter (super_admin + org scoping).
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_admin_tenant_filter,
    get_db_session,
    get_db_session_for_cross_org,
)
from app.core.security import TenantFilter, require_role
from app.models.admin import AdminAuditAction
from app.models.operational import ScenarioOption
from app.schemas.base import CamelModel
from app.schemas.operational import ScenarioOptionRead
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
)
from app.services.admin_audit import log_admin_action

router = APIRouter(tags=["admin-operational"])


class ScenarioTypeStat(CamelModel):
    """Count of scenarios per option type."""

    option_type: str
    count: int


class ScenarioSummaryResponse(CamelModel):
    """Cross-org scenario statistics summary."""

    total_scenarios: int
    pareto_optimal_count: int
    recommended_count: int
    by_type: list[ScenarioTypeStat]


@router.get("/monitoring/scenarios/summary")
async def scenarios_summary(
    request: Request,
    session: AsyncSession = Depends(get_db_session_for_cross_org),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ScenarioSummaryResponse]:
    """Cross-org scenario statistics."""
    total_q = select(func.count(ScenarioOption.id))
    total = (await session.execute(total_q)).scalar_one() or 0

    pareto_q = select(func.count(ScenarioOption.id)).where(
        ScenarioOption.is_pareto_optimal.is_(True)
    )
    pareto = (await session.execute(pareto_q)).scalar_one() or 0

    rec_q = select(func.count(ScenarioOption.id)).where(
        ScenarioOption.is_recommended.is_(True)
    )
    recommended = (await session.execute(rec_q)).scalar_one() or 0

    type_q = (
        select(ScenarioOption.option_type, func.count(ScenarioOption.id))
        .group_by(ScenarioOption.option_type)
        .order_by(func.count(ScenarioOption.id).desc())
    )
    type_result = await session.execute(type_q)
    by_type = [
        ScenarioTypeStat(option_type=row[0].value, count=row[1])
        for row in type_result.all()
    ]

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
        metadata={"view": "scenarios_summary"},
    )

    return ApiResponse(
        success=True,
        data=ScenarioSummaryResponse(
            total_scenarios=total,
            pareto_optimal_count=pareto,
            recommended_count=recommended,
            by_type=by_type,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{target_org_id}/scenarios")
async def org_scenarios(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[ScenarioOptionRead]:
    """Scenarios for a specific organization."""
    base = tenant.apply(select(ScenarioOption), ScenarioOption)
    count_q = tenant.apply(select(func.count(ScenarioOption.id)), ScenarioOption)

    total = (await session.execute(count_q)).scalar_one() or 0
    offset = (page - 1) * page_size
    query = (
        base.order_by(ScenarioOption.cout_total_eur.asc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ScenarioOption",
    )

    data = [ScenarioOptionRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)
