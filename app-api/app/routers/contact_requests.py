"""Public/admin contact requests router."""

import secrets
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.config import settings
from app.core.dependencies import get_db_session
from app.core.security import require_role
from app.models.contact_request import ContactRequestStatus, ContactRequestType
from app.schemas.contact_requests import (
    ContactRequestCreate,
    ContactRequestIngestAck,
    ContactRequestRead,
    ContactRequestStatusUpdate,
)
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
)
from app.services.contact_requests import (
    create_contact_request,
    list_contact_requests,
    update_contact_request_status,
)

public_router = APIRouter(
    prefix="/api/v1/public/contact-requests",
    tags=["public-contact-requests"],
)
admin_router = APIRouter(tags=["admin-contact-requests"])


def _require_ingest_token(token: str | None) -> None:
    configured_token = settings.CONTACT_API_INGEST_TOKEN.strip()
    if not configured_token:
        raise HTTPException(
            status_code=503,
            detail="Contact ingestion is not configured",
        )
    if token is None or not secrets.compare_digest(token.strip(), configured_token):
        raise HTTPException(status_code=401, detail="Invalid ingestion token")


@public_router.post("")
async def ingest_contact_request(
    body: ContactRequestCreate,
    x_contact_ingest_token: str | None = Header(
        default=None,
        alias="X-Contact-Ingest-Token",
    ),
    session: AsyncSession = Depends(get_db_session),
) -> ApiResponse[ContactRequestIngestAck]:
    """Persist one contact request from a trusted server-side source."""
    _require_ingest_token(x_contact_ingest_token)

    row = await create_contact_request(session, body)
    return ApiResponse(
        success=True,
        data=ContactRequestIngestAck.model_validate(row),
        timestamp=datetime.now(UTC).isoformat(),
    )


@admin_router.get("/contact-requests")
async def admin_list_contact_requests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: ContactRequestStatus | None = Query(default=None),
    request_type: ContactRequestType | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    session: AsyncSession = Depends(get_db_session),
    _current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[ContactRequestRead]:
    """List persisted contact requests for super-admin triage."""
    normalized_search = search.strip() if search else None

    items, total = await list_contact_requests(
        session,
        page=page,
        page_size=page_size,
        status_filter=status,
        type_filter=request_type,
        search=normalized_search if normalized_search else None,
    )
    data = [ContactRequestRead.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@admin_router.patch("/contact-requests/{request_id}/status")
async def admin_update_contact_request_status(
    request_id: uuid.UUID,
    body: ContactRequestStatusUpdate,
    session: AsyncSession = Depends(get_db_session),
    _current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ContactRequestRead]:
    """Update contact request triage status."""
    row = await update_contact_request_status(
        session,
        request_id=request_id,
        next_status=body.status,
    )
    return ApiResponse(
        success=True,
        data=ContactRequestRead.model_validate(row),
        timestamp=datetime.now(UTC).isoformat(),
    )
