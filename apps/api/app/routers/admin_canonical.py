"""Admin canonical data router."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_admin_tenant_filter, get_db_session
from app.core.security import TenantFilter, require_role
from app.models.admin import AdminAuditAction
from app.models.operational import CanonicalRecord
from app.schemas.base import CamelModel
from app.schemas.operational import CanonicalQualityDashboard
from app.schemas.responses import ApiResponse
from app.services.admin_audit import log_admin_action
from app.services.canonical_data_service import get_quality_dashboard

router = APIRouter(tags=["admin-operational"])


class OrgCoverageStat(CamelModel):
    organization_id: uuid.UUID
    total_records: int
    distinct_sites: int


class CanonicalCoverageResponse(CamelModel):
    total_orgs_with_data: int
    orgs: list[OrgCoverageStat]


@router.get("/organizations/{target_org_id}/canonical/quality")
async def org_canonical_quality(
    request: Request,
    target_org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[CanonicalQualityDashboard]:
    dashboard = await get_quality_dashboard(session, tenant)
    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_CANONICAL,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="CanonicalRecord",
        metadata={"view": "quality_dashboard"},
    )
    return ApiResponse(
        success=True,
        data=CanonicalQualityDashboard(**dashboard),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/monitoring/canonical-coverage")
async def canonical_coverage(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[CanonicalCoverageResponse]:
    query = (
        select(
            CanonicalRecord.organization_id,
            func.count(CanonicalRecord.id).label("total_records"),
            func.count(func.distinct(CanonicalRecord.site_id)).label("distinct_sites"),
        )
        .group_by(CanonicalRecord.organization_id)
        .order_by(func.count(CanonicalRecord.id).desc())
    )
    result = await session.execute(query)
    rows = result.all()
    orgs = [
        OrgCoverageStat(
            organization_id=row[0],
            total_records=row[1],
            distinct_sites=row[2],
        )
        for row in rows
    ]
    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_CANONICAL,
        request=request,
        metadata={"view": "cross_org_coverage"},
    )
    return ApiResponse(
        success=True,
        data=CanonicalCoverageResponse(
            total_orgs_with_data=len(orgs),
            orgs=orgs,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )
