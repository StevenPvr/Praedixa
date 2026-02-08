"""Canonical records router - CRUD for unified charge/capacity data.

Security:
- All endpoints require authentication (get_current_user).
- TenantFilter ensures organization isolation on all queries.
- Write endpoints (POST) require org_admin or manager role.
- organization_id is NEVER accepted from client - injected from JWT context.
- Pagination params are bounded (page_size max 100).
"""

import math
import uuid
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter, require_role
from app.models.operational import ShiftType
from app.schemas.base import PaginationMeta
from app.schemas.operational import (
    CanonicalQualityDashboard,
    CanonicalRecordBulkCreate,
    CanonicalRecordCreate,
    CanonicalRecordRead,
)
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.canonical_data_service import (
    bulk_import_canonical,
    create_canonical_record,
    get_canonical_record,
    get_quality_dashboard,
    list_canonical_records,
)

router = APIRouter(prefix="/api/v1/canonical", tags=["canonical"])


@router.get("")
async def list_records(
    site_id: str | None = Query(default=None, max_length=50),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    shift: ShiftType | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[CanonicalRecordRead]:
    """List canonical records with optional filters and pagination."""
    items, total = await list_canonical_records(
        session,
        tenant,
        site_id=site_id,
        date_from=date_from,
        date_to=date_to,
        shift=shift,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

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


@router.get("/quality")
async def quality_dashboard(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[CanonicalQualityDashboard]:
    """Get quality dashboard for canonical data coverage."""
    result = await get_quality_dashboard(session, tenant)

    return ApiResponse(
        success=True,
        data=CanonicalQualityDashboard.model_validate(result),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{record_id}")
async def get_record(
    record_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[CanonicalRecordRead]:
    """Get a single canonical record by ID."""
    record = await get_canonical_record(session, tenant, record_id)

    return ApiResponse(
        success=True,
        data=CanonicalRecordRead.model_validate(record),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("", status_code=201)
async def create_record(
    body: CanonicalRecordCreate,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(require_role("org_admin", "manager")),
) -> ApiResponse[CanonicalRecordRead]:
    """Create a single canonical record. Requires org_admin or manager role."""
    record = await create_canonical_record(
        session,
        tenant,
        site_id=body.site_id,
        date=body.date,
        shift=body.shift,
        capacite_plan_h=body.capacite_plan_h,
        competence=body.competence,
        charge_units=body.charge_units,
        realise_h=body.realise_h,
        abs_h=body.abs_h if body.abs_h is not None else 0,
        hs_h=body.hs_h if body.hs_h is not None else 0,
        interim_h=body.interim_h if body.interim_h is not None else 0,
        cout_interne_est=body.cout_interne_est,
    )

    return ApiResponse(
        success=True,
        data=CanonicalRecordRead.model_validate(record),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/bulk", status_code=201)
async def bulk_import(
    body: CanonicalRecordBulkCreate,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(require_role("org_admin")),
) -> ApiResponse[dict]:
    """Bulk import canonical records. Requires org_admin role.

    Deduplication by unique constraint (org_id, site_id, date, shift, competence).
    Duplicates are silently skipped.
    """
    records_data = [rec.model_dump() for rec in body.records]
    inserted, skipped = await bulk_import_canonical(session, tenant, records_data)

    return ApiResponse(
        success=True,
        data={"inserted": inserted, "skipped": skipped},
        timestamp=datetime.now(UTC).isoformat(),
    )
