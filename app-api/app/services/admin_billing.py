"""Admin billing service — plan management and usage tracking.

Security notes:
- Plan changes are logged in PlanChangeHistory for audit compliance.
- changed_by always comes from JWT (never from request body).
- Same-plan change is rejected to prevent empty audit records.
- Plan limits are server-side constants (not configurable via API).
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import normalize_page_window
from app.core.validation import sanitize_text
from app.models.admin import PlanChangeHistory
from app.models.data_catalog import ClientDataset
from app.models.forecast_run import ForecastRun
from app.models.organization import Organization, SubscriptionPlan
from app.models.site import Site
from app.models.user import User

# Plan limits — None means unlimited.
# These are authoritative server-side constants.
PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "free": {
        "users": 3,
        "datasets": 2,
        "sites": 1,
        "forecasts_per_month": 5,
    },
    "starter": {
        "users": 10,
        "datasets": 10,
        "sites": 3,
        "forecasts_per_month": 50,
    },
    "professional": {
        "users": 50,
        "datasets": 50,
        "sites": 20,
        "forecasts_per_month": 500,
    },
    "enterprise": {
        "users": None,
        "datasets": 200,
        "sites": None,
        "forecasts_per_month": None,
    },
}


async def get_billing_info(
    session: AsyncSession,
    org_id: uuid.UUID,
) -> dict[str, object]:
    """Get billing info for an organization: plan, limits, usage.

    Returns a dict with plan name, limit definitions, and current usage counts.
    """
    # Get org
    result = await session.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise NotFoundError("Organization", str(org_id))

    plan_value = org.plan.value

    # Count usage
    user_count = await session.execute(
        select(func.count(User.id)).where(User.organization_id == org_id)
    )
    site_count = await session.execute(
        select(func.count(Site.id)).where(Site.organization_id == org_id)
    )
    dataset_count = await session.execute(
        select(func.count(ClientDataset.id)).where(
            ClientDataset.organization_id == org_id
        )
    )
    # Forecast runs this month
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    forecast_count = await session.execute(
        select(func.count(ForecastRun.id)).where(
            ForecastRun.organization_id == org_id,
            ForecastRun.created_at >= month_start,
        )
    )

    return {
        "organization_id": org_id,
        "plan": plan_value,
        "limits": PLAN_LIMITS.get(plan_value, PLAN_LIMITS["free"]),
        "usage": {
            "users": user_count.scalar_one() or 0,
            "sites": site_count.scalar_one() or 0,
            "datasets": dataset_count.scalar_one() or 0,
            "forecasts_this_month": forecast_count.scalar_one() or 0,
        },
    }


async def change_plan(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    new_plan: SubscriptionPlan,
    reason: str,
    changed_by: str,
) -> PlanChangeHistory:
    """Change an organization's subscription plan.

    Creates a PlanChangeHistory record and updates the org's plan.
    Raises ConflictError if the new plan is the same as current.
    """
    # Get current org
    result = await session.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise NotFoundError("Organization", str(org_id))

    # Same plan check
    if org.plan == new_plan:
        raise ConflictError("Organization is already on this plan")

    now = datetime.now(UTC)

    # Create history record
    history = PlanChangeHistory(
        organization_id=org_id,
        changed_by=uuid.UUID(changed_by),
        old_plan=org.plan,
        new_plan=new_plan,
        reason=sanitize_text(reason, max_length=1000),
        effective_at=now,
    )
    session.add(history)

    # Update org plan
    stmt = update(Organization).where(Organization.id == org_id).values(plan=new_plan)
    await session.execute(stmt)
    await session.flush()

    return history


async def get_plan_history(
    session: AsyncSession,
    org_id: uuid.UUID,
    *,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[PlanChangeHistory], int]:
    """Get plan change history for an organization."""
    base_query = select(PlanChangeHistory).where(
        PlanChangeHistory.organization_id == org_id
    )
    count_query = select(func.count(PlanChangeHistory.id)).where(
        PlanChangeHistory.organization_id == org_id
    )

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    _, page_size, offset = normalize_page_window(page, page_size)
    query = (
        base_query.order_by(PlanChangeHistory.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total
