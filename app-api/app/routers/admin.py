"""Admin router -- RGPD erasure endpoints with dual-approval workflow.

Security:
- All endpoints require super_admin role (highest privilege level).
  This is enforced via require_role("super_admin") dependency on every
  endpoint -- no endpoint is accessible to lesser roles.
- Dual-approval: initiation and approval MUST come from different admins.
  The approver's user_id is always sourced from the JWT (never from the
  request body), preventing impersonation.
- Path parameters (request_id) are UUID-validated by FastAPI/Pydantic,
  preventing path traversal or injection in URL segments.
- Request body schemas use extra="forbid" to reject mass-assignment
  of unexpected fields (e.g., injecting status, approved_by).
- Erasure is irreversible -- crypto-shredding destroys keys before any
  other deletion step, ensuring backup data is irrecoverable.
- Every erasure operation is logged to the admin audit trail for CNIL
  compliance and incident response traceability.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.config import settings
from app.core.dependencies import get_db_session
from app.core.exceptions import NotFoundError
from app.core.key_management import KeyProvider, get_key_provider
from app.core.security import require_role
from app.models.admin import AdminAuditAction
from app.schemas.responses import ApiResponse
from app.services.admin_audit import log_admin_action
from app.services.rgpd_erasure import (
    ErasureRequest,
    ErasureStatus,
    approve_erasure,
    execute_erasure,
    get_erasure_request,
    initiate_erasure,
    verify_erasure,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# -- Request / Response schemas -----------------------------------------------


class InitiateErasureBody(BaseModel):
    """Request body for erasure initiation.

    extra="forbid" prevents injection of fields like status or approved_by.
    """

    model_config = ConfigDict(extra="forbid")

    organization_id: uuid.UUID
    org_slug: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z][a-z0-9_-]*$",
        description="Organization slug for schema name resolution",
    )


class ErasureRequestResponse(BaseModel):
    """Response schema for erasure request operations.

    Mirrors the ErasureRequest Pydantic model but is explicitly defined
    as a response schema to decouple internal storage from API contract.
    """

    id: uuid.UUID
    organization_id: uuid.UUID
    org_slug: str
    initiated_by: str
    approved_by: str | None = None
    status: ErasureStatus
    created_at: datetime
    completed_at: datetime | None = None
    audit_log: list[str] = []


class VerificationResponse(BaseModel):
    """Response for post-erasure verification.

    Maps table names to remaining row counts. All should be 0.
    """

    counts: dict[str, int]
    all_erased: bool


def _to_response(req: ErasureRequest) -> ErasureRequestResponse:
    """Convert an internal ErasureRequest to the API response schema."""
    return ErasureRequestResponse(
        id=req.id,
        organization_id=req.organization_id,
        org_slug=req.org_slug,
        initiated_by=req.initiated_by,
        approved_by=req.approved_by,
        status=req.status,
        created_at=req.created_at,
        completed_at=req.completed_at,
        audit_log=req.audit_log,
    )


def _get_key_provider() -> KeyProvider:  # pragma: no cover
    """Create a KeyProvider instance from current settings.

    Factored out for testability -- tests can mock this at the router level.
    """
    return get_key_provider(settings)


# -- Endpoints ----------------------------------------------------------------


@router.post("/erasure/initiate", status_code=201)
async def initiate_erasure_endpoint(
    request: Request,
    body: InitiateErasureBody,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ErasureRequestResponse]:
    """Initiate an RGPD Article 17 erasure request.

    Creates a new erasure request in pending_approval status.
    A different super_admin must approve before execution.

    Requires: super_admin role.
    """
    erasure_req = await initiate_erasure(
        org_id=body.organization_id,
        org_slug=body.org_slug,
        initiated_by=current_user.user_id,
    )

    # Audit trail: CRITICAL severity for data destruction initiation
    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.ERASURE_INITIATE,
        request=request,
        target_org_id=str(body.organization_id),
        resource_type="ErasureRequest",
        resource_id=erasure_req.id,
        severity="CRITICAL",
    )

    return ApiResponse(
        success=True,
        data=_to_response(erasure_req),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/erasure/{request_id}/approve")
async def approve_erasure_endpoint(
    request: Request,
    request_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ErasureRequestResponse]:
    """Approve an RGPD erasure request.

    The approver MUST be a different admin from the one who initiated
    the request (separation of duties / dual-approval enforcement).

    Requires: super_admin role.
    """
    erasure_req = await approve_erasure(
        request_id=request_id,
        approved_by=current_user.user_id,
    )

    # Audit trail: CRITICAL severity for data destruction approval
    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.ERASURE_APPROVE,
        request=request,
        target_org_id=str(erasure_req.organization_id),
        resource_type="ErasureRequest",
        resource_id=request_id,
        severity="CRITICAL",
    )

    return ApiResponse(
        success=True,
        data=_to_response(erasure_req),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/erasure/{request_id}/execute")
async def execute_erasure_endpoint(
    request: Request,
    request_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ErasureRequestResponse]:
    """Execute an approved RGPD erasure request.

    WARNING: This operation is IRREVERSIBLE. It will:
    1. Destroy all encryption keys (crypto-shredding)
    2. Drop the organization's raw and transformed schemas
    3. Delete all platform data for the organization
    4. Delete the organization record itself

    The request must be in 'approved' status. Key destruction happens
    FIRST to ensure backup data is irrecoverable regardless of whether
    subsequent steps succeed.

    Requires: super_admin role.
    """
    key_provider = _get_key_provider()

    erasure_req = await execute_erasure(
        request_id=request_id,
        db=session,
        key_provider=key_provider,
    )

    # Audit trail: CRITICAL severity for data destruction execution
    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.ERASURE_EXECUTE,
        request=request,
        target_org_id=str(erasure_req.organization_id),
        resource_type="ErasureRequest",
        resource_id=request_id,
        severity="CRITICAL",
        metadata={"final_status": erasure_req.status.value},
    )

    return ApiResponse(
        success=True,
        data=_to_response(erasure_req),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/erasure/{request_id}/verify")
async def verify_erasure_endpoint(
    request: Request,
    request_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[VerificationResponse]:
    """Post-erasure verification: confirm zero rows remain.

    Queries all platform tables for residual data belonging to the
    erased organization. Returns row counts per table -- all should
    be 0 after a successful erasure.

    Requires: super_admin role.
    """
    erasure_req = get_erasure_request(request_id)
    if erasure_req is None:
        raise NotFoundError("ErasureRequest", str(request_id))

    counts = await verify_erasure(
        org_id=erasure_req.organization_id,
        db=session,
    )

    # Audit trail for verification (read operation, INFO severity)
    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_ORG,
        request=request,
        target_org_id=str(erasure_req.organization_id),
        resource_type="ErasureVerification",
        resource_id=request_id,
        metadata={"all_erased": all(v == 0 for v in counts.values())},
    )

    return ApiResponse(
        success=True,
        data=VerificationResponse(
            counts=counts,
            all_erased=all(v == 0 for v in counts.values()),
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/erasure/{request_id}")
async def get_erasure_request_endpoint(
    request: Request,
    request_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ErasureRequestResponse]:
    """Get an erasure request by ID.

    Returns the full erasure request including status and audit log.

    Requires: super_admin role.
    """
    erasure_req = get_erasure_request(request_id)
    if erasure_req is None:
        raise NotFoundError("ErasureRequest", str(request_id))

    # Audit trail for read access (INFO severity)
    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_ORG,
        request=request,
        target_org_id=str(erasure_req.organization_id),
        resource_type="ErasureRequest",
        resource_id=request_id,
    )

    return ApiResponse(
        success=True,
        data=_to_response(erasure_req),
        timestamp=datetime.now(UTC).isoformat(),
    )
