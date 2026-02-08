"""Admin proof packs router -- cross-org proof summary and per-org proof packs.

Security:
- Cross-org endpoint requires super_admin role.
- Per-org endpoint uses get_admin_tenant_filter (super_admin + org scoping).
- Every endpoint logs an admin audit action.
"""

import math
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_admin_tenant_filter, get_db_session
from app.core.security import TenantFilter, require_role
from app.models.admin import AdminAuditAction
from app.models.operational import ProofRecord
from app.schemas.base import CamelModel, PaginationMeta
from app.schemas.operational import ProofRecordRead
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.admin_audit import log_admin_action

router = APIRouter(tags=["admin-operational"])


class OrgProofStat(CamelModel):
    """Per-org proof pack statistic."""

    organization_id: uuid.UUID
    total_records: int
    total_gain_net_eur: float
    avg_adoption_pct: float | None


class ProofPacksSummaryResponse(CamelModel):
    """Cross-org proof pack summary."""

    total_proof_records: int
    total_gain_net_eur: float
    avg_adoption_pct: float | None
    orgs_with_proof: int
    orgs: list[OrgProofStat]


@router.get("/monitoring/proof-packs/summary")
async def proof_packs_summary(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ProofPacksSummaryResponse]:
    """Cross-org proof pack summary."""
    total_q = select(func.count(ProofRecord.id))
    total = (await session.execute(total_q)).scalar_one() or 0

    gain_q = select(func.coalesce(func.sum(ProofRecord.gain_net_eur), 0))
    total_gain = float((await session.execute(gain_q)).scalar_one() or 0)

    adoption_q = select(func.avg(ProofRecord.adoption_pct))
    avg_adoption_raw = (await session.execute(adoption_q)).scalar_one()
    avg_adoption = round(float(avg_adoption_raw) * 100, 2) if avg_adoption_raw else None

    # Per-org breakdown
    org_q = (
        select(
            ProofRecord.organization_id,
            func.count(ProofRecord.id).label("total_records"),
            func.coalesce(func.sum(ProofRecord.gain_net_eur), 0).label("total_gain"),
            func.avg(ProofRecord.adoption_pct).label("avg_adoption"),
        )
        .group_by(ProofRecord.organization_id)
        .order_by(func.sum(ProofRecord.gain_net_eur).desc())
    )
    org_result = await session.execute(org_q)
    org_rows = org_result.all()

    orgs = [
        OrgProofStat(
            organization_id=row[0],
            total_records=row[1],
            total_gain_net_eur=float(row[2]),
            avg_adoption_pct=round(float(row[3]) * 100, 2) if row[3] else None,
        )
        for row in org_rows
    ]

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_PROOF_PACKS,
        request=request,
        metadata={"view": "cross_org_summary"},
    )

    return ApiResponse(
        success=True,
        data=ProofPacksSummaryResponse(
            total_proof_records=total,
            total_gain_net_eur=total_gain,
            avg_adoption_pct=avg_adoption,
            orgs_with_proof=len(orgs),
            orgs=orgs,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{target_org_id}/proof-packs")
async def org_proof_packs(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[ProofRecordRead]:
    """Proof packs for a specific organization."""
    base = tenant.apply(select(ProofRecord), ProofRecord)
    count_q = tenant.apply(select(func.count(ProofRecord.id)), ProofRecord)

    total = (await session.execute(count_q)).scalar_one() or 0
    offset = (page - 1) * page_size
    query = (
        base.order_by(ProofRecord.month.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_PROOF_PACKS,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ProofRecord",
    )

    total_pages = max(1, math.ceil(total / page_size))

    return PaginatedResponse(
        success=True,
        data=[ProofRecordRead.model_validate(item) for item in items],
        pagination=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next_page=page < total_pages,
            has_previous_page=page > 1,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )
