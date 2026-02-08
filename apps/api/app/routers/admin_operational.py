"""Admin operational router - cross-org visibility for super_admin users.

Provides read-only access to operational data (canonical records, cost parameters,
coverage alerts, proof records) across organizations.

Security:
- All endpoints require super_admin role via get_admin_tenant_filter.
- Every endpoint logs an admin audit action.
- TenantFilter is created from the target_org_id path parameter.
- Pagination params are bounded (page_size max 100).
"""

import math
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_admin_tenant_filter, get_db_session
from app.core.security import TenantFilter, require_role
from app.models.admin import AdminAuditAction
from app.schemas.base import PaginationMeta
from app.schemas.operational import (
    CanonicalRecordRead,
    CostParameterRead,
    CoverageAlertRead,
    ProofRecordRead,
)
from app.schemas.responses import PaginatedResponse
from app.services.admin_audit import log_admin_action
from app.services.canonical_data_service import list_canonical_records
from app.services.cost_parameter_service import list_cost_parameters
from app.services.proof_service import list_proof_records

router = APIRouter(tags=["admin-operational"])


@router.get("/organizations/{target_org_id}/canonical")
async def list_org_canonical(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[CanonicalRecordRead]:
    """List canonical records for an organization. Requires super_admin role."""
    items, total = await list_canonical_records(
        session,
        tenant,
        page=page,
        page_size=page_size,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_CANONICAL,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="CanonicalRecord",
    )

    total_pages = max(1, math.ceil(total / page_size))

    return PaginatedResponse(
        success=True,
        data=[CanonicalRecordRead.model_validate(item) for item in items],
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


@router.get("/organizations/{target_org_id}/cost-params")
async def list_org_cost_params(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[CostParameterRead]:
    """List cost parameters for an organization. Requires super_admin role."""
    items, total = await list_cost_parameters(
        session,
        tenant,
        page=page,
        page_size=page_size,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_COST_PARAMS,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="CostParameter",
    )

    total_pages = max(1, math.ceil(total / page_size))

    return PaginatedResponse(
        success=True,
        data=[CostParameterRead.model_validate(item) for item in items],
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


@router.get("/organizations/{target_org_id}/coverage-alerts")
async def list_org_coverage_alerts(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[CoverageAlertRead]:
    """List coverage alerts for an organization. Requires super_admin role."""
    from sqlalchemy import func, select

    from app.models.operational import CoverageAlert

    base = tenant.apply(select(CoverageAlert), CoverageAlert)
    count_q = tenant.apply(select(func.count(CoverageAlert.id)), CoverageAlert)

    total = (await session.execute(count_q)).scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base.order_by(CoverageAlert.alert_date.desc()).offset(offset).limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_COVERAGE_ALERTS,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="CoverageAlert",
    )

    total_pages = max(1, math.ceil(total / page_size))

    return PaginatedResponse(
        success=True,
        data=[CoverageAlertRead.model_validate(item) for item in items],
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


@router.get("/organizations/{target_org_id}/proof")
async def list_org_proof(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[ProofRecordRead]:
    """List proof records for an organization. Requires super_admin role."""
    items, total = await list_proof_records(
        session,
        tenant,
        page=page,
        page_size=page_size,
    )

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
