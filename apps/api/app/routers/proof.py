"""Proof-of-value router - ROI calculation, summaries, and PDF generation.

Security:
- All endpoints require authentication (get_current_user).
- TenantFilter ensures organization isolation on all queries.
- Write endpoints (POST) require org_admin role.
- PDF is generated in-memory and streamed directly.
- Pagination params are bounded (page_size max 100).
"""

import math
from datetime import UTC, date, datetime
from io import BytesIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter, require_role
from app.models.operational import OperationalDecision
from app.schemas.base import CamelModel, PaginationMeta
from app.schemas.operational import ProofRecordRead, ProofSummaryResponse
from app.schemas.responses import ApiResponse, PaginatedResponse
from app.services.proof_pack_pdf_service import generate_proof_pack_pdf
from app.services.proof_service import (
    _DECEMBER,
    generate_proof_record,
    get_proof_summary,
    list_proof_records,
)


class ProofGenerateRequest(CamelModel):
    """Request to generate a proof record for a site+month."""

    model_config = ConfigDict(extra="forbid")

    site_id: str = Field(..., max_length=50)
    month: date


router = APIRouter(prefix="/api/v1/proof", tags=["proof"])


@router.get("")
async def list_records(
    site_id: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[ProofRecordRead]:
    """List proof records with optional site filter and pagination."""
    items, total = await list_proof_records(
        session,
        tenant,
        site_id=site_id,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

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


@router.get("/summary")
async def proof_summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[ProofSummaryResponse]:
    """Get aggregated proof-of-value summary across sites/months."""
    summary = await get_proof_summary(
        session,
        tenant,
        date_from=date_from,
        date_to=date_to,
    )
    records, _ = await list_proof_records(session, tenant, page=1, page_size=100)

    total_emises = sum(r.alertes_emises for r in records)
    total_traitees = sum(r.alertes_traitees for r in records)

    response_data = ProofSummaryResponse(
        total_gain_net_eur=summary["total_gain"],
        avg_adoption_pct=summary["avg_adoption"],
        total_alertes_emises=total_emises,
        total_alertes_traitees=total_traitees,
        records=[ProofRecordRead.model_validate(r) for r in records],
    )

    return ApiResponse(
        success=True,
        data=response_data,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/generate", status_code=201)
async def generate_proof(
    body: ProofGenerateRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(require_role("org_admin")),
) -> ApiResponse[ProofRecordRead]:
    """Generate proof record for a site+month. Requires org_admin role.

    Computes BAU vs optimized vs actual costs and creates/updates
    the proof record.
    """
    record = await generate_proof_record(
        session,
        tenant,
        site_id=body.site_id,
        month=body.month,
    )

    return ApiResponse(
        success=True,
        data=ProofRecordRead.model_validate(record),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/pdf")
async def generate_pdf(
    site_id: str = Query(..., max_length=50),
    month: date = Query(...),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> StreamingResponse:
    """Generate proof pack PDF for a site+month.

    Returns a StreamingResponse with application/pdf content type.
    """
    # Generate or get the proof record
    record = await generate_proof_record(
        session,
        tenant,
        site_id=site_id,
        month=month,
    )

    # Serialize proof record to dict for the PDF renderer
    proof_dict = {
        "gain_net_eur": record.gain_net_eur,
        "adoption_pct": record.adoption_pct,
        "service_reel_pct": record.service_reel_pct,
        "service_bau_pct": record.service_bau_pct,
        "alertes_emises": record.alertes_emises,
        "alertes_traitees": record.alertes_traitees,
        "cout_bau_eur": record.cout_bau_eur,
        "cout_100_eur": record.cout_100_eur,
        "cout_reel_eur": record.cout_reel_eur,
    }

    # Get decisions for this site+month for the PDF
    month_start = month.replace(day=1)
    if month.month == _DECEMBER:
        month_end = month.replace(year=month.year + 1, month=1, day=1)
    else:
        month_end = month.replace(month=month.month + 1, day=1)

    dec_q = (
        tenant.apply(
            select(OperationalDecision).where(
                OperationalDecision.site_id == site_id,
                OperationalDecision.decision_date >= month_start,
                OperationalDecision.decision_date < month_end,
            ),
            OperationalDecision,
        )
        .order_by(OperationalDecision.decision_date.desc())
        .limit(10)
    )

    dec_result = await session.execute(dec_q)
    decisions_orm = list(dec_result.scalars().all())

    decisions = [
        {
            "decision_date": str(d.decision_date),
            "shift": d.shift.value if hasattr(d.shift, "value") else str(d.shift),
            "gap_h": str(d.gap_h),
            "cout_observe_eur": d.cout_observe_eur,
            "is_override": d.is_override,
        }
        for d in decisions_orm
    ]

    # Generate PDF
    pdf_bytes = generate_proof_pack_pdf(
        org_name=tenant.organization_id,
        site_id=site_id,
        month=month_start.isoformat()[:7],
        proof_record=proof_dict,
        decisions=decisions,
    )

    buffer = BytesIO(pdf_bytes)
    filename = f"proof-pack-{site_id}-{month_start.isoformat()[:7]}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
