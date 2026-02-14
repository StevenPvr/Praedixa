"""Admin operational router - cross-org visibility for super_admin users.

Provides read-only access to operational data (canonical records, cost parameters,
coverage alerts, proof records) across organizations.

Security:
- All endpoints require super_admin role via get_admin_tenant_filter.
- Every endpoint logs an admin audit action.
- TenantFilter is created from the target_org_id path parameter.
- Pagination params are bounded (page_size max 100).
- site_id query param is validated against the target org to prevent cross-org
  data leakage. Invalid UUIDs return 422; site not in org returns 404.
"""

import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_admin_tenant_filter, get_db_session
from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter, require_role
from app.models.admin import AdminAuditAction
from app.models.operational import CoverageAlert
from app.models.site import Site
from app.schemas.operational import (
    CanonicalRecordRead,
    CostParameterRead,
    CoverageAlertRead,
    ProofRecordRead,
)
from app.schemas.responses import PaginatedResponse, make_paginated_response
from app.services.admin_audit import log_admin_action
from app.services.canonical_data_service import list_canonical_records
from app.services.cost_parameter_service import list_cost_parameters
from app.services.proof_service import list_proof_records

router = APIRouter(tags=["admin-operational"])


async def _validate_site_belongs_to_org(
    session: AsyncSession,
    target_org_id: uuid.UUID,
    site_id_str: str,
) -> uuid.UUID:
    """Validate that a site_id belongs to the target organization.

    Returns the parsed UUID on success. Raises NotFoundError if the site
    does not belong to the org or does not exist.

    Security: prevents cross-org data leakage by ensuring the admin
    can only filter by sites within the target organization.
    """
    try:
        site_uuid = uuid.UUID(site_id_str)
    except ValueError:
        raise NotFoundError("Site", site_id_str) from None

    site_exists = await session.execute(
        select(Site.id).where(
            Site.organization_id == target_org_id,
            Site.id == site_uuid,
        )
    )
    if not site_exists.scalar_one_or_none():
        raise NotFoundError("Site", site_id_str)
    return site_uuid


@router.get("/organizations/{target_org_id}/canonical")
async def list_org_canonical(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    site_id: str | None = Query(default=None, max_length=50),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[CanonicalRecordRead]:
    """List canonical records for an organization. Requires super_admin role."""
    # Validate site_id belongs to the target org if provided
    if site_id:
        await _validate_site_belongs_to_org(session, target_org_id, site_id)

    items, total = await list_canonical_records(
        session,
        tenant,
        page=page,
        page_size=page_size,
        site_id=site_id,
    )

    metadata: dict[str, object] = {}
    if site_id:
        metadata["site_id"] = site_id

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_CANONICAL,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="CanonicalRecord",
        metadata=metadata or None,
    )

    data = [CanonicalRecordRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/organizations/{target_org_id}/cost-params")
async def list_org_cost_params(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    site_id: str | None = Query(default=None, max_length=50),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[CostParameterRead]:
    """List cost parameters for an organization. Requires super_admin role."""
    if site_id:
        await _validate_site_belongs_to_org(session, target_org_id, site_id)

    items, total = await list_cost_parameters(
        session,
        tenant,
        page=page,
        page_size=page_size,
        site_id=site_id,
    )

    metadata: dict[str, object] = {}
    if site_id:
        metadata["site_id"] = site_id

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_COST_PARAMS,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="CostParameter",
        metadata=metadata or None,
    )

    data = [CostParameterRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/organizations/{target_org_id}/coverage-alerts")
async def list_org_coverage_alerts(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    site_id: str | None = Query(default=None, max_length=50),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[CoverageAlertRead]:
    """List coverage alerts for an organization. Requires super_admin role."""
    validated_site_uuid: uuid.UUID | None = None
    if site_id:
        validated_site_uuid = await _validate_site_belongs_to_org(
            session, target_org_id, site_id
        )

    base = tenant.apply(select(CoverageAlert), CoverageAlert)
    count_q = tenant.apply(select(func.count(CoverageAlert.id)), CoverageAlert)

    # Apply site_id filter if provided and validated
    if validated_site_uuid is not None:
        base = base.where(CoverageAlert.site_id == str(validated_site_uuid))
        count_q = count_q.where(CoverageAlert.site_id == str(validated_site_uuid))

    total = (await session.execute(count_q)).scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base.order_by(CoverageAlert.alert_date.desc()).offset(offset).limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    metadata: dict[str, object] = {}
    if site_id:
        metadata["site_id"] = site_id

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_COVERAGE_ALERTS,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="CoverageAlert",
        metadata=metadata or None,
    )

    data = [CoverageAlertRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/organizations/{target_org_id}/proof")
async def list_org_proof(
    request: Request,
    target_org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    site_id: str | None = Query(default=None, max_length=50),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[ProofRecordRead]:
    """List proof records for an organization. Requires super_admin role."""
    if site_id:
        await _validate_site_belongs_to_org(session, target_org_id, site_id)

    items, total = await list_proof_records(
        session,
        tenant,
        page=page,
        page_size=page_size,
        site_id=site_id,
    )

    metadata: dict[str, object] = {}
    if site_id:
        metadata["site_id"] = site_id

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_PROOF_PACKS,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ProofRecord",
        metadata=metadata or None,
    )

    data = [ProofRecordRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)
