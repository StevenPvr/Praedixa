"""Service layer for public/admin contact request workflows."""

import hashlib
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PraedixaError
from app.models.contact_request import (
    ContactRequest,
    ContactRequestStatus,
    ContactRequestType,
)
from app.schemas.contact_requests import ContactRequestCreate

_STATUS_TRANSITIONS: dict[str, set[str]] = {
    ContactRequestStatus.NEW.value: {
        ContactRequestStatus.IN_PROGRESS.value,
        ContactRequestStatus.CLOSED.value,
    },
    ContactRequestStatus.IN_PROGRESS.value: {ContactRequestStatus.CLOSED.value},
    ContactRequestStatus.CLOSED.value: set(),
}


def _hash_ip(raw_ip: str | None) -> str:
    candidate = (raw_ip or "unknown").strip().encode("utf-8")
    return hashlib.sha256(candidate).hexdigest()


async def create_contact_request(
    session: AsyncSession,
    payload: ContactRequestCreate,
) -> ContactRequest:
    """Persist a contact request from a trusted server-side ingestion source."""
    row = ContactRequest(
        locale=payload.locale,
        request_type=payload.request_type.value,
        company_name=payload.company_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
        email=payload.email,
        phone=payload.phone,
        subject=payload.subject,
        message=payload.message,
        source_ip_hash=_hash_ip(payload.source_ip),
        status=ContactRequestStatus.NEW.value,
        consent=payload.consent,
        metadata_json=payload.metadata_json,
    )
    session.add(row)
    await session.flush()
    return row


async def list_contact_requests(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    status_filter: ContactRequestStatus | None = None,
    type_filter: ContactRequestType | None = None,
    search: str | None = None,
) -> tuple[list[ContactRequest], int]:
    """List contact requests with optional filtering for admin operations."""
    base_query = select(ContactRequest)
    count_query = select(func.count(ContactRequest.id))

    if status_filter is not None:
        base_query = base_query.where(ContactRequest.status == status_filter.value)
        count_query = count_query.where(ContactRequest.status == status_filter.value)

    if type_filter is not None:
        base_query = base_query.where(
            ContactRequest.request_type == type_filter.value,
        )
        count_query = count_query.where(
            ContactRequest.request_type == type_filter.value,
        )

    normalized_search = search.strip() if search else ""
    if normalized_search:
        pattern = f"%{normalized_search}%"
        conditions = or_(
            ContactRequest.company_name.ilike(pattern),
            ContactRequest.subject.ilike(pattern),
            ContactRequest.email.ilike(pattern),
            ContactRequest.first_name.ilike(pattern),
            ContactRequest.last_name.ilike(pattern),
        )
        base_query = base_query.where(conditions)
        count_query = count_query.where(conditions)

    offset = (page - 1) * page_size
    query = (
        base_query.order_by(ContactRequest.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )

    total = (await session.execute(count_query)).scalar_one() or 0
    rows = list((await session.execute(query)).scalars().all())
    return rows, int(total)


async def update_contact_request_status(
    session: AsyncSession,
    *,
    request_id: uuid.UUID,
    next_status: ContactRequestStatus,
) -> ContactRequest:
    """Update lifecycle status with guarded transitions."""
    row = await session.get(ContactRequest, request_id)
    if row is None:
        raise NotFoundError("ContactRequest", str(request_id))

    if row.status == next_status.value:
        return row

    allowed = _STATUS_TRANSITIONS.get(row.status, set())
    if next_status.value not in allowed:
        raise PraedixaError(
            message="Invalid status transition",
            code="INVALID_STATUS_TRANSITION",
            status_code=409,
            details={
                "from": row.status,
                "to": next_status.value,
            },
        )

    row.status = next_status.value
    await session.flush()
    return row
