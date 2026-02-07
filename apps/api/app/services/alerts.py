"""Alerts service — list and dismiss dashboard alerts.

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- dismiss_alert validates the alert belongs to the tenant BEFORE updating
  (IDOR prevention — a user cannot dismiss another org's alerts).
- The audit middleware logs the user_id + action for traceability.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.models.dashboard_alert import DashboardAlert


async def list_active_alerts(
    tenant: TenantFilter,
    session: AsyncSession,
) -> list[DashboardAlert]:
    """Return all active (non-dismissed) alerts for the organization.

    Ordered by severity (critical first) then by creation date (newest first).
    Expired alerts are excluded.
    """
    now = datetime.now(UTC)

    query = tenant.apply(
        select(DashboardAlert).where(
            DashboardAlert.dismissed_at.is_(None),
        ),
        DashboardAlert,
    )

    # Exclude expired alerts — only show alerts with no expiry or future expiry
    query = query.where(
        (DashboardAlert.expires_at.is_(None)) | (DashboardAlert.expires_at > now)
    )

    # Order: severity priority (critical > error > warning > info), then newest
    query = query.order_by(
        DashboardAlert.severity.desc(),
        DashboardAlert.created_at.desc(),
    )

    result = await session.execute(query)
    return list(result.scalars().all())


async def dismiss_alert(
    alert_id: uuid.UUID,
    tenant: TenantFilter,
    session: AsyncSession,
) -> DashboardAlert:
    """Dismiss a specific alert.

    Security flow:
    1. Verify the alert exists AND belongs to this tenant (IDOR prevention).
    2. Check it hasn't already been dismissed (idempotency).
    3. Set dismissed_at timestamp using server clock (not client).

    Note: We do not store dismissed_by in a column (the model doesn't have
    one), but the audit middleware logs the user_id + action for traceability.
    """
    # Step 1: Fetch alert with tenant filter
    query = tenant.apply(
        select(DashboardAlert).where(DashboardAlert.id == alert_id),
        DashboardAlert,
    )
    result = await session.execute(query)
    alert = result.scalar_one_or_none()

    if alert is None:
        raise NotFoundError("DashboardAlert", str(alert_id))

    # Step 2: Idempotent — if already dismissed, return as-is
    if alert.dismissed_at is not None:
        return alert

    # Step 3: Dismiss with server-side timestamp
    # Defense in depth: the UPDATE includes organization_id in its WHERE
    # clause even though the SELECT already verified ownership. This
    # prevents TOCTOU races and ensures writes are always org-scoped.
    now = datetime.now(UTC)
    stmt = (
        update(DashboardAlert)
        .where(
            DashboardAlert.id == alert_id,
            DashboardAlert.organization_id == tenant.organization_id,
        )
        .values(dismissed_at=now)
    )
    await session.execute(stmt)
    await session.flush()

    # Refresh the object to reflect the update
    alert.dismissed_at = now
    return alert
