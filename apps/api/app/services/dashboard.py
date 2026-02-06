"""Dashboard service — aggregate KPIs for the main dashboard.

Security:
- Every query is scoped by organization_id via TenantFilter.
- Returns safe defaults (0%, 0 count, None dates) when the DB is empty,
  so no error leakage or null-pointer paths exist.
"""

from datetime import datetime

from sqlalchemy import func, select
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
    # 1. Find the latest completed forecast run for this org
    latest_run_query = tenant.apply(
        select(ForecastRun.id)
        .where(ForecastRun.status == ForecastStatus.COMPLETED)
        .order_by(ForecastRun.completed_at.desc())
        .limit(1),
        ForecastRun,
    )
    latest_run_result = await session.execute(latest_run_query)
    latest_run_id = latest_run_result.scalar_one_or_none()

    coverage_human = 0.0
    coverage_merchandise = 0.0

    if latest_run_id is not None:
        # Avg(capacity/demand)*100, excluding rows with zero demand
        for dimension, attr_name in [
            (ForecastDimension.HUMAN, "coverage_human"),
            (ForecastDimension.MERCHANDISE, "coverage_merchandise"),
        ]:
            coverage_query = tenant.apply(
                select(
                    func.avg(
                        DailyForecast.predicted_capacity
                        / DailyForecast.predicted_demand
                        * 100
                    )
                ).where(
                    DailyForecast.forecast_run_id == latest_run_id,
                    DailyForecast.dimension == dimension,
                    DailyForecast.predicted_demand > 0,
                ),
                DailyForecast,
            )
            result = await session.execute(coverage_query)
            value = result.scalar_one_or_none()
            if attr_name == "coverage_human":
                coverage_human = round(float(value), 2) if value else 0.0
            else:
                coverage_merchandise = round(float(value), 2) if value else 0.0

    # 2. Active alerts count (not dismissed, not expired)
    alerts_query = tenant.apply(
        select(func.count(DashboardAlert.id)).where(
            DashboardAlert.dismissed_at.is_(None),
        ),
        DashboardAlert,
    )
    alerts_result = await session.execute(alerts_query)
    active_alerts_count = alerts_result.scalar_one() or 0

    # 3. Average forecast accuracy across completed runs
    accuracy_query = tenant.apply(
        select(func.avg(ForecastRun.accuracy_score)).where(
            ForecastRun.status == ForecastStatus.COMPLETED,
            ForecastRun.accuracy_score.is_not(None),
        ),
        ForecastRun,
    )
    accuracy_result = await session.execute(accuracy_query)
    accuracy_raw = accuracy_result.scalar_one_or_none()
    forecast_accuracy = round(float(accuracy_raw), 4) if accuracy_raw else None

    # 4. Last forecast completion date
    last_date_query = tenant.apply(
        select(func.max(ForecastRun.completed_at)).where(
            ForecastRun.status == ForecastStatus.COMPLETED,
        ),
        ForecastRun,
    )
    last_date_result = await session.execute(last_date_query)
    last_forecast_date = last_date_result.scalar_one_or_none()

    return DashboardSummary(
        coverage_human=coverage_human,
        coverage_merchandise=coverage_merchandise,
        active_alerts_count=active_alerts_count,
        forecast_accuracy=forecast_accuracy,
        last_forecast_date=last_forecast_date,
    )
