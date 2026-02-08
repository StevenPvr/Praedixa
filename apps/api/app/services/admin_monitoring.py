"""Admin monitoring service — platform-wide KPIs and metrics.

Security notes:
- All queries are cross-tenant (no TenantFilter) — admin-only access.
- get_org_mirror reuses the existing dashboard service with a
  programmatic TenantFilter, so no query duplication.
- period parameter is validated against an allowlist to prevent
  SQL injection in date_trunc() calls.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantFilter
from app.models.data_catalog import ClientDataset, IngestionLog, RunStatus
from app.models.decision import Decision
from app.models.forecast_run import ForecastRun
from app.models.organization import Organization, OrganizationStatus
from app.models.user import User, UserStatus
from app.services.dashboard import DashboardSummary, get_dashboard_summary

# Allowed period values for date_trunc (SQL injection prevention)
_ALLOWED_PERIODS = frozenset({"day", "week", "month"})


async def get_platform_kpis(session: AsyncSession) -> dict:
    """Get platform-wide KPI counts."""
    total_orgs = await session.execute(select(func.count(Organization.id)))
    total_users = await session.execute(select(func.count(User.id)))
    total_datasets = await session.execute(select(func.count(ClientDataset.id)))
    total_forecasts = await session.execute(select(func.count(ForecastRun.id)))
    active_orgs = await session.execute(
        select(func.count(Organization.id)).where(
            Organization.status == OrganizationStatus.ACTIVE
        )
    )
    total_decisions = await session.execute(select(func.count(Decision.id)))

    return {
        "total_organizations": total_orgs.scalar_one() or 0,
        "total_users": total_users.scalar_one() or 0,
        "total_datasets": total_datasets.scalar_one() or 0,
        "total_forecasts": total_forecasts.scalar_one() or 0,
        "active_organizations": active_orgs.scalar_one() or 0,
        "total_decisions": total_decisions.scalar_one() or 0,
    }


async def get_org_metrics(
    session: AsyncSession,
    org_id: uuid.UUID,
) -> dict:
    """Get metrics for a specific organization."""
    active_users = await session.execute(
        select(func.count(User.id)).where(
            User.organization_id == org_id,
            User.status == UserStatus.ACTIVE,
        )
    )
    total_datasets = await session.execute(
        select(func.count(ClientDataset.id)).where(
            ClientDataset.organization_id == org_id
        )
    )
    forecast_runs = await session.execute(
        select(func.count(ForecastRun.id)).where(
            ForecastRun.organization_id == org_id
        )
    )
    decisions_count = await session.execute(
        select(func.count(Decision.id)).where(
            Decision.organization_id == org_id
        )
    )
    last_activity = await session.execute(
        select(func.max(User.last_login_at)).where(
            User.organization_id == org_id
        )
    )

    return {
        "active_users": active_users.scalar_one() or 0,
        "total_datasets": total_datasets.scalar_one() or 0,
        "forecast_runs": forecast_runs.scalar_one() or 0,
        "decisions_count": decisions_count.scalar_one() or 0,
        "last_activity": last_activity.scalar_one_or_none(),
    }


async def get_usage_trends(
    session: AsyncSession,
    *,
    period: str = "day",
    days: int = 90,
) -> list[dict]:
    """Get usage trends aggregated by period.

    period must be one of: day, week, month (validated against allowlist).
    """
    # Validate period against allowlist (SQL injection prevention)
    safe_period = period if period in _ALLOWED_PERIODS else "day"

    cutoff = datetime.now(UTC) - timedelta(days=days)
    trends: list[dict] = []

    # Define metrics to aggregate
    metrics = [
        ("new_orgs", Organization, Organization.created_at),
        ("new_users", User, User.created_at),
        ("new_datasets", ClientDataset, ClientDataset.created_at),
        ("new_forecasts", ForecastRun, ForecastRun.created_at),
    ]

    for metric_name, model, date_col in metrics:
        # Use date_trunc for grouping — period is validated above
        query = (
            select(
                func.date_trunc(safe_period, date_col).label("period"),
                func.count(model.id).label("count"),
            )
            .where(date_col >= cutoff)
            .group_by(text("1"))
            .order_by(text("1"))
        )
        result = await session.execute(query)
        for row in result.all():
            trends.append({
                "date": row.period.isoformat() if row.period else "",
                "metric": metric_name,
                "value": float(row.count),
            })

    return trends


async def get_error_metrics(session: AsyncSession) -> dict:
    """Get error rate metrics from ingestion logs."""
    total_ingestions = await session.execute(
        select(func.count(IngestionLog.id))
    )
    success_ingestions = await session.execute(
        select(func.count(IngestionLog.id)).where(
            IngestionLog.status == RunStatus.SUCCESS
        )
    )
    failed_ingestions = await session.execute(
        select(func.count(IngestionLog.id)).where(
            IngestionLog.status == RunStatus.FAILED
        )
    )

    total = total_ingestions.scalar_one() or 0
    successes = success_ingestions.scalar_one() or 0
    failures = failed_ingestions.scalar_one() or 0

    success_rate = (successes / total * 100) if total > 0 else 100.0

    return {
        "ingestion_success_rate": round(success_rate, 2),
        "ingestion_error_count": failures,
        "api_error_rate": 0.0,  # Placeholder — would come from metrics collector
    }


async def get_org_mirror(
    session: AsyncSession,
    org_id: uuid.UUID,
) -> DashboardSummary:
    """Get dashboard summary for an organization (admin mirror).

    Reuses the existing dashboard service by creating a TenantFilter
    scoped to the target org. No code duplication.
    """
    tenant = TenantFilter(str(org_id))
    return await get_dashboard_summary(tenant=tenant, session=session)
