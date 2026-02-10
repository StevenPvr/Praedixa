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
from typing import cast

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantFilter
from app.models.data_catalog import ClientDataset, IngestionLog, RunStatus
from app.models.decision import Decision
from app.models.forecast_run import ForecastRun, ForecastStatus
from app.models.operational import (
    CoverageAlert,
    CoverageAlertStatus,
    OperationalDecision,
    ProofRecord,
)
from app.models.organization import Organization, OrganizationStatus
from app.models.user import User, UserStatus
from app.services.dashboard import DashboardSummary, get_dashboard_summary

# Allowed period values for date_trunc (SQL injection prevention)
_ALLOWED_PERIODS = frozenset({"day", "week", "month"})


async def get_platform_kpis(session: AsyncSession) -> dict[str, object]:
    """Get platform-wide KPI counts including error metrics."""
    query = select(
        select(func.count(Organization.id))
        .scalar_subquery()
        .label("total_organizations"),
        select(func.count(User.id)).scalar_subquery().label("total_users"),
        select(func.count(ClientDataset.id)).scalar_subquery().label("total_datasets"),
        select(func.count(ForecastRun.id)).scalar_subquery().label("total_forecasts"),
        select(func.count(Organization.id))
        .where(Organization.status == OrganizationStatus.ACTIVE)
        .scalar_subquery()
        .label("active_organizations"),
        select(func.count(Decision.id)).scalar_subquery().label("total_decisions"),
        select(func.count(IngestionLog.id)).scalar_subquery().label("ingestion_total"),
        select(func.count(IngestionLog.id))
        .where(IngestionLog.status == RunStatus.SUCCESS)
        .scalar_subquery()
        .label("ingestion_successes"),
        select(func.count(ForecastRun.id))
        .where(ForecastRun.status == ForecastStatus.FAILED)
        .scalar_subquery()
        .label("forecast_failures"),
    )
    row = (await session.execute(query)).one()

    ingestion_total = row.ingestion_total or 0
    ingestion_successes = row.ingestion_successes or 0
    forecast_total = row.total_forecasts or 0
    forecast_failures = row.forecast_failures or 0

    ingestion_success_rate = (
        (ingestion_successes / ingestion_total * 100) if ingestion_total > 0 else 100.0
    )
    api_error_rate = (
        (forecast_failures / forecast_total * 100) if forecast_total > 0 else 0.0
    )

    return {
        "total_organizations": row.total_organizations or 0,
        "total_users": row.total_users or 0,
        "total_datasets": row.total_datasets or 0,
        "total_forecasts": forecast_total,
        "active_organizations": row.active_organizations or 0,
        "total_decisions": row.total_decisions or 0,
        "ingestion_success_rate": round(ingestion_success_rate, 2),
        "api_error_rate": round(api_error_rate, 2),
    }


async def get_org_metrics(
    session: AsyncSession,
    org_id: uuid.UUID,
) -> dict[str, object]:
    """Get metrics for a specific organization."""
    query = select(
        select(func.count(User.id))
        .where(
            User.organization_id == org_id,
            User.status == UserStatus.ACTIVE,
        )
        .scalar_subquery()
        .label("active_users"),
        select(func.count(ClientDataset.id))
        .where(ClientDataset.organization_id == org_id)
        .scalar_subquery()
        .label("total_datasets"),
        select(func.count(ForecastRun.id))
        .where(ForecastRun.organization_id == org_id)
        .scalar_subquery()
        .label("forecast_runs"),
        select(func.count(Decision.id))
        .where(Decision.organization_id == org_id)
        .scalar_subquery()
        .label("decisions_count"),
        select(func.max(User.last_login_at))
        .where(User.organization_id == org_id)
        .scalar_subquery()
        .label("last_activity"),
    )
    row = (await session.execute(query)).one()

    return {
        "active_users": row.active_users or 0,
        "total_datasets": row.total_datasets or 0,
        "forecast_runs": row.forecast_runs or 0,
        "decisions_count": row.decisions_count or 0,
        "last_activity": row.last_activity,
    }


async def get_usage_trends(
    session: AsyncSession,
    *,
    period: str = "day",
    days: int = 90,
) -> list[dict[str, object]]:
    """Get usage trends aggregated by period.

    period must be one of: day, week, month (validated against allowlist).
    """
    # Validate period against allowlist (SQL injection prevention)
    safe_period = period if period in _ALLOWED_PERIODS else "day"

    cutoff = datetime.now(UTC) - timedelta(days=days)
    trends: list[dict[str, object]] = []

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
                func.count(model.id).label("cnt"),  # type: ignore[attr-defined]
            )
            .where(date_col >= cutoff)
            .group_by(text("1"))
            .order_by(text("1"))
        )
        result = await session.execute(query)
        trends.extend(
            {
                "date": row.period.isoformat() if row.period else "",
                "metric": metric_name,
                "value": float(cast("int", row.cnt)),
            }
            for row in result.all()
        )

    return trends


async def get_error_metrics(session: AsyncSession) -> dict[str, object]:
    """Get ingestion and forecast error metrics from persisted DB logs."""
    query = select(
        select(func.count(IngestionLog.id)).scalar_subquery().label("total"),
        select(func.count(IngestionLog.id))
        .where(IngestionLog.status == RunStatus.SUCCESS)
        .scalar_subquery()
        .label("successes"),
        select(func.count(IngestionLog.id))
        .where(IngestionLog.status == RunStatus.FAILED)
        .scalar_subquery()
        .label("failures"),
        select(func.count(ForecastRun.id)).scalar_subquery().label("forecast_total"),
        select(func.count(ForecastRun.id))
        .where(ForecastRun.status == ForecastStatus.FAILED)
        .scalar_subquery()
        .label("forecast_failures"),
    )
    row = (await session.execute(query)).one()
    total = row.total or 0
    successes = row.successes or 0
    failures = row.failures or 0
    forecast_total = row.forecast_total or 0
    forecast_failures = row.forecast_failures or 0

    success_rate = (successes / total * 100) if total > 0 else 100.0
    api_error_rate = (
        forecast_failures / forecast_total * 100 if forecast_total > 0 else 0.0
    )

    return {
        "ingestion_success_rate": round(success_rate, 2),
        "ingestion_error_count": failures,
        "api_error_rate": round(api_error_rate, 2),
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


async def get_roi_by_org(session: AsyncSession) -> list[dict[str, object]]:
    """Get per-organization ROI and MLOps tracking metrics for admin view."""
    orgs_q = select(Organization.id, Organization.name).order_by(
        Organization.name.asc()
    )
    orgs_result = await session.execute(orgs_q)
    orgs_rows = orgs_result.all()

    proof_q = (
        select(
            ProofRecord.organization_id,
            func.count(ProofRecord.id).label("proof_records"),
            func.coalesce(func.sum(ProofRecord.gain_net_eur), 0).label("total_gain"),
            func.avg(ProofRecord.adoption_pct).label("avg_proof_adoption"),
        )
        .group_by(ProofRecord.organization_id)
        .order_by(func.coalesce(func.sum(ProofRecord.gain_net_eur), 0).desc())
    )
    proof_result = await session.execute(proof_q)
    proof_rows = proof_result.all()

    decisions_q = select(
        OperationalDecision.organization_id,
        func.count(OperationalDecision.id).label("total_decisions"),
        func.count(OperationalDecision.id)
        .filter(OperationalDecision.is_override.is_(True))
        .label("overridden_count"),
    ).group_by(OperationalDecision.organization_id)
    decisions_result = await session.execute(decisions_q)
    decisions_rows = decisions_result.all()

    alerts_q = select(
        CoverageAlert.organization_id,
        func.count(CoverageAlert.id)
        .filter(
            CoverageAlert.status.in_(
                [CoverageAlertStatus.OPEN, CoverageAlertStatus.ACKNOWLEDGED]
            )
        )
        .label("active_alerts"),
    ).group_by(CoverageAlert.organization_id)
    alerts_result = await session.execute(alerts_q)
    alerts_rows = alerts_result.all()

    ingestion_q = (
        select(
            ClientDataset.organization_id,
            func.count(IngestionLog.id).label("failed_ingestions"),
            func.max(
                func.coalesce(IngestionLog.completed_at, IngestionLog.started_at)
            ).label("last_failure_at"),
        )
        .join(IngestionLog, IngestionLog.dataset_id == ClientDataset.id)
        .where(IngestionLog.status == RunStatus.FAILED)
        .group_by(ClientDataset.organization_id)
    )
    ingestion_result = await session.execute(ingestion_q)
    ingestion_rows = ingestion_result.all()

    proof_by_org: dict[uuid.UUID, dict[str, object]] = {}
    for row in proof_rows:
        avg_adoption_raw = row[3]
        proof_by_org[row[0]] = {
            "proof_records": int(row[1] or 0),
            "total_gain_net_eur": float(row[2] or 0),
            "avg_proof_adoption_pct": (
                round(float(avg_adoption_raw) * 100, 2)
                if avg_adoption_raw is not None
                else None
            ),
        }

    decisions_by_org: dict[uuid.UUID, tuple[int, int]] = {
        row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in decisions_rows
    }
    alerts_by_org: dict[uuid.UUID, int] = {
        row[0]: int(row[1] or 0) for row in alerts_rows
    }
    ingestion_by_org: dict[uuid.UUID, tuple[int, datetime | None]] = {
        row[0]: (int(row[1] or 0), row[2]) for row in ingestion_rows
    }

    rows: list[dict[str, object]] = []
    for org_id, org_name in orgs_rows:
        proof = proof_by_org.get(org_id, {})
        total_decisions, overridden_count = decisions_by_org.get(org_id, (0, 0))
        adopted_count = max(total_decisions - overridden_count, 0)
        decision_adoption_pct = (
            round(adopted_count / total_decisions * 100, 2)
            if total_decisions > 0
            else 0.0
        )
        failed_ingestions, last_failure_at = ingestion_by_org.get(org_id, (0, None))

        rows.append(
            {
                "organization_id": org_id,
                "organization_name": org_name,
                "proof_records": int(proof.get("proof_records", 0)),
                "total_gain_net_eur": float(proof.get("total_gain_net_eur", 0.0)),
                "avg_proof_adoption_pct": proof.get("avg_proof_adoption_pct"),
                "total_decisions": total_decisions,
                "adopted_count": adopted_count,
                "overridden_count": overridden_count,
                "decision_adoption_pct": decision_adoption_pct,
                "active_alerts": alerts_by_org.get(org_id, 0),
                "failed_ingestions": failed_ingestions,
                "last_ingestion_failure_at": last_failure_at,
            }
        )

    return rows
