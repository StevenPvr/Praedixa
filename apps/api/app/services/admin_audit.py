"""Admin audit log service — append-only audit trail for super_admin actions.

Security notes:
- log_admin_action is fire-and-forget: it inserts a row and flushes.
  It must be called in every admin endpoint (enforced by security tests).
- IP address extraction prefers X-Forwarded-For (reverse proxy scenario),
  falls back to request.client.host. Both are truncated to 45 chars (IPv6 max).
- User-Agent is truncated to 200 chars to prevent storage abuse.
- Request-ID is validated for length and ASCII printability (same rules
  as the middleware X-Request-ID validator).
- severity is validated against an allowlist to prevent log injection.
- get_audit_log supports pagination and filtering for the admin UI.
"""

import uuid
from datetime import datetime

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import AdminAuditAction, AdminAuditLog

_ALLOWED_SEVERITIES = frozenset({"INFO", "WARNING", "CRITICAL"})
_MAX_IP_LEN = 45
_MAX_UA_LEN = 200
_MAX_REQUEST_ID_LEN = 64


def _extract_ip(request: Request) -> str:
    """Extract client IP from request, preferring X-Forwarded-For.

    In production behind a reverse proxy, X-Forwarded-For contains the
    real client IP as the first entry. We take only that first IP.
    Falls back to request.client.host for direct connections.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP (client), ignore proxy chain
        ip = forwarded.split(",")[0].strip()
        return ip[:_MAX_IP_LEN]
    if request.client:
        return (request.client.host or "unknown")[:_MAX_IP_LEN]
    return "unknown"


def _extract_user_agent(request: Request) -> str:
    """Extract and truncate User-Agent header."""
    ua = request.headers.get("User-Agent", "")
    return ua[:_MAX_UA_LEN]


def _extract_request_id(request: Request) -> str:
    """Extract and validate X-Request-ID from request."""
    raw = request.headers.get("X-Request-ID", "")
    if raw and len(raw) <= _MAX_REQUEST_ID_LEN and raw.isascii() and raw.isprintable():
        return raw
    return str(uuid.uuid4())


async def log_admin_action(
    session: AsyncSession,
    *,
    admin_user_id: str,
    action: AdminAuditAction,
    request: Request,
    target_org_id: str | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    metadata: dict | None = None,
    severity: str = "INFO",
) -> None:
    """Insert an audit log entry. Called in every admin endpoint.

    Fire-and-forget: no return value. The caller should not depend
    on the audit log entry for business logic.

    Security:
    - admin_user_id comes from JWT (never from request body).
    - IP and User-Agent are extracted server-side from the HTTP request.
    - severity is validated against an allowlist.
    - metadata is stored as-is (server-computed, not client input).
    """
    # Validate severity to prevent log injection
    safe_severity = severity if severity in _ALLOWED_SEVERITIES else "INFO"

    # Truncate resource_type if provided
    safe_resource_type = resource_type[:100] if resource_type else None

    entry = AdminAuditLog(
        admin_user_id=uuid.UUID(admin_user_id),
        target_org_id=uuid.UUID(target_org_id) if target_org_id else None,
        action=action,
        resource_type=safe_resource_type,
        resource_id=resource_id,
        ip_address=_extract_ip(request),
        user_agent=_extract_user_agent(request),
        request_id=_extract_request_id(request),
        metadata_json=metadata or {},
        severity=safe_severity,
    )
    session.add(entry)
    await session.flush()


async def get_audit_log(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    admin_user_id: str | None = None,
    target_org_id: str | None = None,
    action: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> tuple[list[AdminAuditLog], int]:
    """Query the admin audit log with pagination and filters.

    Returns (items, total_count). Ordered by created_at DESC (newest first).

    All filters are optional and combined with AND logic.
    """
    base_query = select(AdminAuditLog)
    count_query = select(func.count(AdminAuditLog.id))

    # Apply filters
    if admin_user_id is not None:
        uid = uuid.UUID(admin_user_id)
        base_query = base_query.where(AdminAuditLog.admin_user_id == uid)
        count_query = count_query.where(AdminAuditLog.admin_user_id == uid)

    if target_org_id is not None:
        oid = uuid.UUID(target_org_id)
        base_query = base_query.where(AdminAuditLog.target_org_id == oid)
        count_query = count_query.where(AdminAuditLog.target_org_id == oid)

    if action is not None:
        # Validate action against known enum values
        valid_actions = {a.value for a in AdminAuditAction}
        if action in valid_actions:
            base_query = base_query.where(
                AdminAuditLog.action == AdminAuditAction(action)
            )
            count_query = count_query.where(
                AdminAuditLog.action == AdminAuditAction(action)
            )

    if date_from is not None:
        base_query = base_query.where(AdminAuditLog.created_at >= date_from)
        count_query = count_query.where(AdminAuditLog.created_at >= date_from)

    if date_to is not None:
        base_query = base_query.where(AdminAuditLog.created_at <= date_to)
        count_query = count_query.where(AdminAuditLog.created_at <= date_to)

    # Get total count
    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    # Paginate and order
    offset = (page - 1) * page_size
    query = (
        base_query.order_by(AdminAuditLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total
