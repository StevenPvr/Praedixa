"""Append-only audit trail for super_admin actions."""

import uuid
from collections.abc import Mapping
from datetime import datetime

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.request_id import get_or_generate_request_id
from app.models.admin import AdminAuditAction, AdminAuditLog

_ALLOWED_SEVERITIES = frozenset({"INFO", "WARNING", "CRITICAL"})
_MAX_IP_LEN = 45
_MAX_UA_LEN = 200


def _extract_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        return ip[:_MAX_IP_LEN]
    if request.client:
        return (request.client.host or "unknown")[:_MAX_IP_LEN]
    return "unknown"


def _extract_user_agent(request: Request) -> str:
    ua = request.headers.get("User-Agent", "")
    return ua[:_MAX_UA_LEN]


async def log_admin_action(
    session: AsyncSession,
    *,
    admin_user_id: str,
    action: AdminAuditAction,
    request: Request,
    target_org_id: str | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    metadata: Mapping[str, object] | None = None,
    severity: str = "INFO",
) -> None:
    safe_severity = severity if severity in _ALLOWED_SEVERITIES else "INFO"
    safe_resource_type = resource_type[:100] if resource_type else None

    entry = AdminAuditLog(
        admin_user_id=uuid.UUID(admin_user_id),
        target_org_id=uuid.UUID(target_org_id) if target_org_id else None,
        action=action,
        resource_type=safe_resource_type,
        resource_id=resource_id,
        ip_address=_extract_ip(request),
        user_agent=_extract_user_agent(request),
        request_id=get_or_generate_request_id(request),
        metadata_json=dict(metadata) if metadata else {},
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
    base_query = select(AdminAuditLog)
    count_query = select(func.count(AdminAuditLog.id))

    if admin_user_id is not None:
        uid = uuid.UUID(admin_user_id)
        base_query = base_query.where(AdminAuditLog.admin_user_id == uid)
        count_query = count_query.where(AdminAuditLog.admin_user_id == uid)

    if target_org_id is not None:
        oid = uuid.UUID(target_org_id)
        base_query = base_query.where(AdminAuditLog.target_org_id == oid)
        count_query = count_query.where(AdminAuditLog.target_org_id == oid)

    if action is not None:
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

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0
    offset = (page - 1) * page_size
    query = (
        base_query.order_by(AdminAuditLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total
