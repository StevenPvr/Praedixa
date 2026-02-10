"""Admin decisions enhanced router -- cross-org decision stats, overrides, adoption.

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
from app.models.operational import OperationalDecision, ProofRecord
from app.schemas.base import CamelModel
from app.schemas.responses import ApiResponse
from app.services.admin_audit import log_admin_action

router = APIRouter(tags=["admin-operational"])


class DecisionSummaryResponse(CamelModel):
    """Cross-org decision statistics summary."""

    total_decisions: int
    override_count: int
    override_rate_pct: float
    with_observed_outcomes: int


class OverrideAnalysisResponse(CamelModel):
    """Override analysis across organizations."""

    total_overrides: int
    override_rate_pct: float
    avg_cost_delta: float | None
    top_reasons: list[dict[str, object]]


class OrgAdoptionStat(CamelModel):
    """Per-org adoption metric."""

    organization_id: uuid.UUID
    avg_adoption_pct: float | None
    total_decisions: int = 0
    adopted_count: int = 0
    overridden_count: int = 0


class AdoptionMetricsResponse(CamelModel):
    """Adoption metrics across organizations."""

    avg_adoption_pct: float | None
    orgs_with_data: int
    overall_adoption_pct: float
    total_decisions: int
    adopted_count: int
    overridden_count: int
    orgs: list[OrgAdoptionStat]


@router.get("/monitoring/decisions/summary")
async def decisions_summary(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[DecisionSummaryResponse]:
    """Cross-org decision statistics."""
    total_q = select(func.count(OperationalDecision.id))
    total = (await session.execute(total_q)).scalar_one() or 0

    override_q = select(func.count(OperationalDecision.id)).where(
        OperationalDecision.is_override.is_(True)
    )
    override_count = (await session.execute(override_q)).scalar_one() or 0

    observed_q = select(func.count(OperationalDecision.id)).where(
        OperationalDecision.cout_observe_eur.isnot(None)
    )
    observed = (await session.execute(observed_q)).scalar_one() or 0

    override_rate = round(override_count / total * 100, 2) if total > 0 else 0.0

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
        metadata={"view": "decisions_summary"},
    )

    return ApiResponse(
        success=True,
        data=DecisionSummaryResponse(
            total_decisions=total,
            override_count=override_count,
            override_rate_pct=override_rate,
            with_observed_outcomes=observed,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/monitoring/decisions/overrides")
async def decisions_overrides(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[OverrideAnalysisResponse]:
    """Override analysis across organizations."""
    total_q = select(func.count(OperationalDecision.id))
    total = (await session.execute(total_q)).scalar_one() or 0

    override_q = select(func.count(OperationalDecision.id)).where(
        OperationalDecision.is_override.is_(True)
    )
    override_count = (await session.execute(override_q)).scalar_one() or 0

    override_rate = round(override_count / total * 100, 2) if total > 0 else 0.0

    # Average cost delta for overrides
    delta_q = select(
        func.avg(
            OperationalDecision.cout_observe_eur - OperationalDecision.cout_attendu_eur
        )
    ).where(
        OperationalDecision.is_override.is_(True),
        OperationalDecision.cout_observe_eur.isnot(None),
        OperationalDecision.cout_attendu_eur.isnot(None),
    )
    avg_delta_raw = (await session.execute(delta_q)).scalar_one()
    avg_cost_delta = round(float(avg_delta_raw), 2) if avg_delta_raw else None

    # Top reasons
    reasons_q = (
        select(
            OperationalDecision.override_reason,
            func.count(OperationalDecision.id).label("cnt"),
        )
        .where(
            OperationalDecision.is_override.is_(True),
            OperationalDecision.override_reason.isnot(None),
        )
        .group_by(OperationalDecision.override_reason)
        .order_by(func.count(OperationalDecision.id).desc())
        .limit(10)
    )
    reasons_result = await session.execute(reasons_q)
    top_reasons = [{"reason": row[0], "count": row[1]} for row in reasons_result.all()]

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
        metadata={"view": "decisions_overrides"},
    )

    return ApiResponse(
        success=True,
        data=OverrideAnalysisResponse(
            total_overrides=override_count,
            override_rate_pct=override_rate,
            avg_cost_delta=avg_cost_delta,
            top_reasons=top_reasons,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/monitoring/decisions/adoption")
async def decisions_adoption(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdoptionMetricsResponse]:
    """Adoption metrics across organizations."""
    # Per-org average adoption from proof records (percentage 0-100).
    org_q = select(
        ProofRecord.organization_id,
        func.avg(ProofRecord.adoption_pct).label("avg_adoption"),
    ).group_by(ProofRecord.organization_id)
    org_result = await session.execute(org_q)
    org_rows = org_result.all()

    # Per-org decision adoption (recommended action followed vs override).
    decisions_by_org_q = select(
        OperationalDecision.organization_id,
        func.count(OperationalDecision.id).label("total"),
        func.count(OperationalDecision.id)
        .filter(OperationalDecision.is_override.is_(True))
        .label("overrides"),
    ).group_by(OperationalDecision.organization_id)
    decisions_by_org_result = await session.execute(decisions_by_org_q)
    decisions_by_org_rows = decisions_by_org_result.all()

    proof_by_org: dict[uuid.UUID, float | None] = {
        row[0]: (round(float(row[1]) * 100, 2) if row[1] is not None else None)
        for row in org_rows
    }
    decisions_by_org: dict[uuid.UUID, tuple[int, int]] = {
        row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in decisions_by_org_rows
    }

    all_org_ids = set(proof_by_org.keys()) | set(decisions_by_org.keys())
    orgs: list[OrgAdoptionStat] = []
    for org_id in sorted(all_org_ids, key=str):
        total, overridden = decisions_by_org.get(org_id, (0, 0))
        adopted = max(total - overridden, 0)
        orgs.append(
            OrgAdoptionStat(
                organization_id=org_id,
                avg_adoption_pct=proof_by_org.get(org_id),
                total_decisions=total,
                adopted_count=adopted,
                overridden_count=overridden,
            )
        )
    orgs.sort(key=lambda row: row.total_decisions, reverse=True)

    # Overall proof-based average adoption (percentage 0-100).
    overall_q = select(func.avg(ProofRecord.adoption_pct))
    overall_raw = (await session.execute(overall_q)).scalar_one()
    avg_adoption = round(float(overall_raw) * 100, 2) if overall_raw else None

    # Overall decision adoption.
    total_q = select(func.count(OperationalDecision.id))
    total_decisions = int((await session.execute(total_q)).scalar_one() or 0)
    overrides_q = select(func.count(OperationalDecision.id)).where(
        OperationalDecision.is_override.is_(True)
    )
    overridden_count = int((await session.execute(overrides_q)).scalar_one() or 0)
    adopted_count = max(total_decisions - overridden_count, 0)
    overall_adoption_pct = (
        round(adopted_count / total_decisions * 100, 2) if total_decisions > 0 else 0.0
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_MONITORING,
        request=request,
        metadata={"view": "decisions_adoption"},
    )

    return ApiResponse(
        success=True,
        data=AdoptionMetricsResponse(
            avg_adoption_pct=avg_adoption,
            orgs_with_data=len(orgs),
            overall_adoption_pct=overall_adoption_pct,
            total_decisions=total_decisions,
            adopted_count=adopted_count,
            overridden_count=overridden_count,
            orgs=orgs,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )
