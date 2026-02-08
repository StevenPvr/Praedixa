"""Tests for app.services.admin_monitoring — platform KPIs and metrics."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.admin_monitoring import (
    _ALLOWED_PERIODS,
    get_error_metrics,
    get_org_metrics,
    get_org_mirror,
    get_platform_kpis,
    get_usage_trends,
)
from tests.unit.conftest import make_mock_session


def _make_one_result(**kwargs):
    """Return a mock execute result where .one() returns a SimpleNamespace."""
    result = MagicMock()
    result.one.return_value = SimpleNamespace(**kwargs)
    return result


class TestAllowedPeriods:
    """Tests for the period allowlist."""

    def test_contains_day(self):
        assert "day" in _ALLOWED_PERIODS

    def test_contains_week(self):
        assert "week" in _ALLOWED_PERIODS

    def test_contains_month(self):
        assert "month" in _ALLOWED_PERIODS

    def test_no_unexpected_values(self):
        assert frozenset({"day", "week", "month"}) == _ALLOWED_PERIODS


class TestGetPlatformKPIs:
    """Tests for get_platform_kpis()."""

    @pytest.mark.asyncio
    async def test_returns_all_metrics(self):
        row_result = _make_one_result(
            total_organizations=10,
            total_users=100,
            total_datasets=50,
            total_forecasts=200,
            active_organizations=8,
            total_decisions=75,
        )
        session = make_mock_session(row_result)
        result = await get_platform_kpis(session)
        assert result["total_organizations"] == 10
        assert result["total_users"] == 100
        assert result["total_datasets"] == 50
        assert result["total_forecasts"] == 200
        assert result["active_organizations"] == 8
        assert result["total_decisions"] == 75

    @pytest.mark.asyncio
    async def test_zero_values(self):
        row_result = _make_one_result(
            total_organizations=0,
            total_users=0,
            total_datasets=0,
            total_forecasts=0,
            active_organizations=0,
            total_decisions=0,
        )
        session = make_mock_session(row_result)
        result = await get_platform_kpis(session)
        assert result["total_organizations"] == 0
        assert result["total_users"] == 0


class TestGetOrgMetrics:
    """Tests for get_org_metrics()."""

    @pytest.mark.asyncio
    async def test_returns_metrics(self):
        last_login = datetime(2026, 2, 1, tzinfo=UTC)
        row_result = _make_one_result(
            active_users=5,
            total_datasets=3,
            forecast_runs=10,
            decisions_count=4,
            last_activity=last_login,
        )
        session = make_mock_session(row_result)

        org_id = uuid.uuid4()
        result = await get_org_metrics(session, org_id)
        assert result["active_users"] == 5
        assert result["total_datasets"] == 3
        assert result["forecast_runs"] == 10
        assert result["decisions_count"] == 4
        assert result["last_activity"] == last_login

    @pytest.mark.asyncio
    async def test_no_last_activity(self):
        row_result = _make_one_result(
            active_users=0,
            total_datasets=0,
            forecast_runs=0,
            decisions_count=0,
            last_activity=None,
        )
        session = make_mock_session(row_result)

        result = await get_org_metrics(session, uuid.uuid4())
        assert result["last_activity"] is None

    @pytest.mark.asyncio
    async def test_zero_metrics(self):
        row_result = _make_one_result(
            active_users=0,
            total_datasets=0,
            forecast_runs=0,
            decisions_count=0,
            last_activity=None,
        )
        session = make_mock_session(row_result)

        result = await get_org_metrics(session, uuid.uuid4())
        assert result["active_users"] == 0
        assert result["total_datasets"] == 0
        assert result["forecast_runs"] == 0
        assert result["decisions_count"] == 0


class TestGetUsageTrends:
    """Tests for get_usage_trends()."""

    @pytest.mark.asyncio
    async def test_returns_trend_list(self):
        # Each metric query returns one row
        # result.all() is synchronous in SQLAlchemy — use MagicMock
        row = SimpleNamespace(period=datetime(2026, 2, 1, tzinfo=UTC), count=5)
        result_mocks = []
        for _ in range(4):
            rm = MagicMock()
            rm.all.return_value = [row]
            result_mocks.append(rm)

        session = make_mock_session(*result_mocks)
        trends = await get_usage_trends(session, period="day", days=30)
        assert len(trends) == 4  # one row per metric
        metric_names = {t["metric"] for t in trends}
        assert metric_names == {
            "new_orgs",
            "new_users",
            "new_datasets",
            "new_forecasts",
        }

    @pytest.mark.asyncio
    async def test_empty_results(self):
        result_mocks = []
        for _ in range(4):
            rm = MagicMock()
            rm.all.return_value = []
            result_mocks.append(rm)
        session = make_mock_session(*result_mocks)
        trends = await get_usage_trends(session)
        assert trends == []

    @pytest.mark.asyncio
    async def test_invalid_period_defaults_to_day(self):
        """SQL injection attempt via period is neutralized by allowlist."""
        result_mocks = []
        for _ in range(4):
            rm = MagicMock()
            rm.all.return_value = []
            result_mocks.append(rm)
        session = make_mock_session(*result_mocks)
        # Should not raise — invalid period defaults to "day"
        trends = await get_usage_trends(session, period="'; DROP TABLE--")
        assert trends == []

    @pytest.mark.asyncio
    async def test_valid_periods_accepted(self):
        for period in ["day", "week", "month"]:
            result_mocks = []
            for _ in range(4):
                rm = MagicMock()
                rm.all.return_value = []
                result_mocks.append(rm)
            session = make_mock_session(*result_mocks)
            trends = await get_usage_trends(session, period=period)
            assert isinstance(trends, list)

    @pytest.mark.asyncio
    async def test_trend_value_is_float(self):
        row = SimpleNamespace(period=datetime(2026, 1, 15, tzinfo=UTC), count=42)
        result_mocks = []
        for _ in range(4):
            rm = MagicMock()
            rm.all.return_value = [row]
            result_mocks.append(rm)
        session = make_mock_session(*result_mocks)
        trends = await get_usage_trends(session, period="month")
        for trend in trends:
            assert isinstance(trend["value"], float)


class TestGetErrorMetrics:
    """Tests for get_error_metrics()."""

    @pytest.mark.asyncio
    async def test_returns_metrics(self):
        row_result = _make_one_result(total=100, successes=95, failures=5)
        session = make_mock_session(row_result)
        result = await get_error_metrics(session)
        assert result["ingestion_success_rate"] == 95.0
        assert result["ingestion_error_count"] == 5
        assert result["api_error_rate"] == 0.0

    @pytest.mark.asyncio
    async def test_zero_total_returns_100_success(self):
        row_result = _make_one_result(total=0, successes=0, failures=0)
        session = make_mock_session(row_result)
        result = await get_error_metrics(session)
        assert result["ingestion_success_rate"] == 100.0
        assert result["ingestion_error_count"] == 0

    @pytest.mark.asyncio
    async def test_all_failures(self):
        row_result = _make_one_result(total=50, successes=0, failures=50)
        session = make_mock_session(row_result)
        result = await get_error_metrics(session)
        assert result["ingestion_success_rate"] == 0.0
        assert result["ingestion_error_count"] == 50

    @pytest.mark.asyncio
    async def test_rounding(self):
        row_result = _make_one_result(total=3, successes=1, failures=2)
        session = make_mock_session(row_result)
        result = await get_error_metrics(session)
        # 1/3 * 100 = 33.333... → rounded to 33.33
        assert result["ingestion_success_rate"] == 33.33


class TestGetOrgMirror:
    """Tests for get_org_mirror()."""

    @pytest.mark.asyncio
    async def test_delegates_to_dashboard_summary(self):
        mock_summary = SimpleNamespace(
            active_alerts_count=2,
            coverage_human=85.0,
        )
        session = AsyncMock()

        with patch(
            "app.services.admin_monitoring.get_dashboard_summary",
            new_callable=AsyncMock,
            return_value=mock_summary,
        ) as mock_fn:
            result = await get_org_mirror(session, uuid.uuid4())
            mock_fn.assert_awaited_once()
            assert result == mock_summary

    @pytest.mark.asyncio
    async def test_tenant_filter_uses_org_id(self):
        org_id = uuid.uuid4()
        session = AsyncMock()

        with patch(
            "app.services.admin_monitoring.get_dashboard_summary",
            new_callable=AsyncMock,
            return_value=SimpleNamespace(),
        ) as mock_fn:
            await get_org_mirror(session, org_id)
            call_kwargs = mock_fn.call_args.kwargs
            assert call_kwargs["tenant"].organization_id == str(org_id)
