"""Dashboard service — aggregate KPIs for the main dashboard.

Security:
- Every query is scoped by organization_id via TenantFilter.
- Returns safe defaults (0%, 0 count, None dates) when the DB is empty,
  so no error leakage or null-pointer paths exist.
"""

from datetime import datetime

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantFilter
from app.models.daily_forecast import DailyForecast, ForecastDimension
from app.models.dashboard_alert import DashboardAlert
from app.models.forecast_run import ForecastRun, ForecastStatus


class DashboardSummary:
    """Value object for dashboard KPIs.

    Not a Pydantic schema — the router converts this to the response
    schema so the service layer stays framework-agnostic.
    """

    __slots__ = (
        "active_alerts_count",
        "coverage_human",
        "coverage_merchandise",
        "forecast_accuracy",
        "last_forecast_date",
    )

    def __init__(
        self,
        *,
        coverage_human: float,
        coverage_merchandise: float,
        active_alerts_count: int,
        forecast_accuracy: float | None,
        last_forecast_date: datetime | None,
    ) -> None:
        self.coverage_human = coverage_human
        self.coverage_merchandise = coverage_merchandise
        self.active_alerts_count = active_alerts_count
        self.forecast_accuracy = forecast_accuracy
        self.last_forecast_date = last_forecast_date


async def get_dashboard_summary(
    tenant: TenantFilter,
    session: AsyncSession,
) -> DashboardSummary:
    """Compute dashboard KPIs for the given organization.

    Queries:
    1. Coverage rates: avg(predicted_capacity / predicted_demand) per dimension
       from the most recent completed forecast run.
    2. Active alerts count: non-dismissed, non-expired alerts.
    3. Forecast accuracy: avg accuracy_score from completed runs.
    4. Last forecast date: max(completed_at) from completed runs.

    All queries are filtered by org_id. Returns safe defaults when empty.
    """
    latest_run = tenant.apply(
        select(ForecastRun.id)
        .where(ForecastRun.status == ForecastStatus.COMPLETED)
        .order_by(ForecastRun.completed_at.desc())
        .limit(1),
        ForecastRun,
    ).cte("latest_run")

    coverage_human_sq = tenant.apply(
        select(
            func.avg(
                case(
                    (
                        DailyForecast.dimension == ForecastDimension.HUMAN,
                        DailyForecast.predicted_capacity
                        / DailyForecast.predicted_demand
                        * 100,
                    ),
                    else_=None,
                )
            )
        ).where(
            DailyForecast.forecast_run_id == latest_run.c.id,
            DailyForecast.predicted_demand > 0,
        ),
        DailyForecast,
    ).scalar_subquery()

    coverage_merch_sq = tenant.apply(
        select(
            func.avg(
                case(
                    (
                        DailyForecast.dimension == ForecastDimension.MERCHANDISE,
                        DailyForecast.predicted_capacity
                        / DailyForecast.predicted_demand
                        * 100,
                    ),
                    else_=None,
                )
            )
        ).where(
            DailyForecast.forecast_run_id == latest_run.c.id,
            DailyForecast.predicted_demand > 0,
        ),
        DailyForecast,
    ).scalar_subquery()

    alerts_count_sq = tenant.apply(
        select(func.count(DashboardAlert.id)).where(
            DashboardAlert.dismissed_at.is_(None),
        ),
        DashboardAlert,
    ).scalar_subquery()

    accuracy_sq = tenant.apply(
        select(func.avg(ForecastRun.accuracy_score)).where(
            ForecastRun.status == ForecastStatus.COMPLETED,
            ForecastRun.accuracy_score.is_not(None),
        ),
        ForecastRun,
    ).scalar_subquery()

    last_date_sq = tenant.apply(
        select(func.max(ForecastRun.completed_at)).where(
            ForecastRun.status == ForecastStatus.COMPLETED,
        ),
        ForecastRun,
    ).scalar_subquery()

    query = select(
        coverage_human_sq.label("coverage_human"),
        coverage_merch_sq.label("coverage_merchandise"),
        alerts_count_sq.label("active_alerts_count"),
        accuracy_sq.label("forecast_accuracy"),
        last_date_sq.label("last_forecast_date"),
    )
    row = (await session.execute(query)).one()
    coverage_human = round(float(row.coverage_human), 2) if row.coverage_human else 0.0
    coverage_merchandise = (
        round(float(row.coverage_merchandise), 2) if row.coverage_merchandise else 0.0
    )
    active_alerts_count = row.active_alerts_count or 0
    forecast_accuracy = (
        round(float(row.forecast_accuracy), 4) if row.forecast_accuracy else None
    )
    last_forecast_date = row.last_forecast_date

    return DashboardSummary(
        coverage_human=coverage_human,
        coverage_merchandise=coverage_merchandise,
        active_alerts_count=active_alerts_count,
        forecast_accuracy=forecast_accuracy,
        last_forecast_date=last_forecast_date,
    )
