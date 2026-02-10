"""Admin cost params router -- cross-org missing config detection.

Security:
- All endpoints require super_admin role.
- Every endpoint logs an admin audit action.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session
from app.core.security import require_role
from app.models.admin import AdminAuditAction
from app.models.operational import CostParameter
from app.models.organization import Organization, OrganizationStatus
from app.schemas.base import CamelModel
from app.schemas.responses import ApiResponse
from app.services.admin_audit import log_admin_action

router = APIRouter(tags=["admin-operational"])

_REQUIRED_COST_PARAM_TYPES = [
    "c_int",
    "maj_hs",
    "c_interim",
    "premium_urgence",
    "c_backlog",
    "cap_hs_shift",
    "cap_interim_site",
    "lead_time_jours",
]


class OrgMissingConfig(CamelModel):
    """Organization without cost parameters configured."""

    organization_id: uuid.UUID
    name: str
    missing_types: list[str]
    total_missing: int


class MissingCostParamsResponse(CamelModel):
    """Organizations without cost parameters configured."""

    total_orgs_with_missing: int
    total_missing_params: int
    orgs: list[OrgMissingConfig]

    # Backward-compatible fields kept for existing consumers.
    total_orgs: int
    orgs_with_config: int
    orgs_without_config: int
    missing: list[OrgMissingConfig]


@router.get("/monitoring/cost-params/missing")
async def cost_params_missing(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[MissingCostParamsResponse]:
    """Organizations without cost parameters configured."""
    # All active orgs
    all_orgs_q = select(Organization.id, Organization.name).where(
        Organization.status == OrganizationStatus.ACTIVE
    )
    all_orgs_result = await session.execute(all_orgs_q)
    all_orgs = {row[0]: row[1] for row in all_orgs_result.all()}

    # Orgs with at least one cost parameter
    orgs_with_q = select(func.distinct(CostParameter.organization_id))
    orgs_with_result = await session.execute(orgs_with_q)
    orgs_with_config = {row[0] for row in orgs_with_result.all()}

    # Missing = active orgs without any cost parameter
    missing = [
        OrgMissingConfig(
            organization_id=org_id,
            name=name,
            missing_types=_REQUIRED_COST_PARAM_TYPES,
            total_missing=len(_REQUIRED_COST_PARAM_TYPES),
        )
        for org_id, name in all_orgs.items()
        if org_id not in orgs_with_config
    ]

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_COST_PARAMS,
        request=request,
        metadata={"view": "missing_cost_params"},
    )

    return ApiResponse(
        success=True,
        data=MissingCostParamsResponse(
            total_orgs_with_missing=len(missing),
            total_missing_params=len(missing) * len(_REQUIRED_COST_PARAM_TYPES),
            orgs=missing,
            total_orgs=len(all_orgs),
            orgs_with_config=len(orgs_with_config),
            orgs_without_config=len(missing),
            missing=missing,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )
