"""Tests for app.services.dashboard — dashboard KPI computation."""

from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from app.core.security import TenantFilter
from app.services.dashboard import DashboardSummary, get_dashboard_summary
from tests.unit.conftest import make_mock_session, make_scalar_result


class TestDashboardSummary:
    """Test DashboardSummary value object."""

    def test_slots(self):
        s = DashboardSummary(
            coverage_human=95.5,
            coverage_merchandise=88.0,
            active_alerts_count=3,
            forecast_accuracy=0.92,
            last_forecast_date=datetime(2026, 1, 1, tzinfo=UTC),
        )
        assert s.coverage_human == 95.5
        assert s.coverage_merchandise == 88.0
        assert s.active_alerts_count == 3
        assert s.forecast_accuracy == 0.92
        assert s.last_forecast_date == datetime(2026, 1, 1, tzinfo=UTC)

    def test_none_fields(self):
        s = DashboardSummary(
            coverage_human=0.0,
            coverage_merchandise=0.0,
            active_alerts_count=0,
            forecast_accuracy=None,
            last_forecast_date=None,
        )
        assert s.forecast_accuracy is None
        assert s.last_forecast_date is None


class TestGetDashboardSummary:
    """Test get_dashboard_summary async service function."""

    @pytest.mark.asyncio
    async def test_no_forecast_runs(self):
        """When there are no completed runs, return zero coverage."""
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(None),  # latest_run_id = None
            make_scalar_result(0),  # active_alerts_count = 0
            make_scalar_result(None),  # accuracy = None
            make_scalar_result(None),  # last_forecast_date = None
        )

        result = await get_dashboard_summary(tenant, session)

        assert result.coverage_human == 0.0
        assert result.coverage_merchandise == 0.0
        assert result.active_alerts_count == 0
        assert result.forecast_accuracy is None
        assert result.last_forecast_date is None

    @pytest.mark.asyncio
    async def test_with_forecast_data(self):
        """When run exists, compute coverage from dimension queries."""
        tenant = TenantFilter("org-1")
        run_id = "run-uuid"
        session = make_mock_session(
            make_scalar_result(run_id),  # latest_run_id
            make_scalar_result(92.5),  # coverage_human avg
            make_scalar_result(85.3),  # coverage_merchandise avg
            make_scalar_result(2),  # active_alerts_count
            make_scalar_result(0.9876),  # accuracy
            make_scalar_result(datetime(2026, 2, 1, tzinfo=UTC)),  # last_forecast_date
        )

        result = await get_dashboard_summary(tenant, session)

        assert result.coverage_human == 92.5
        assert result.coverage_merchandise == 85.3
        assert result.active_alerts_count == 2
        assert result.forecast_accuracy == 0.9876
        assert result.last_forecast_date == datetime(2026, 2, 1, tzinfo=UTC)

    @pytest.mark.asyncio
    async def test_null_coverage_defaults_to_zero(self):
        """When coverage query returns None (no matching rows), default to 0.0."""
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result("some-run"),  # latest_run_id
            make_scalar_result(None),  # coverage_human = None (no rows)
            make_scalar_result(None),  # coverage_merchandise = None
            make_scalar_result(0),  # active_alerts_count
            make_scalar_result(None),  # accuracy
            make_scalar_result(None),  # last_forecast_date
        )

        result = await get_dashboard_summary(tenant, session)

        assert result.coverage_human == 0.0
        assert result.coverage_merchandise == 0.0

    @pytest.mark.asyncio
    async def test_alerts_count_zero_on_none(self):
        """When scalar_one returns None for alerts count, should default to 0."""
        tenant = TenantFilter("org-1")
        # scalar_one returns None (or 0) for count
        result_mock = MagicMock()
        result_mock.scalar_one.return_value = None
        session = make_mock_session(
            make_scalar_result(None),  # no run
            result_mock,  # alerts count
            make_scalar_result(None),  # accuracy
            make_scalar_result(None),  # last_date
        )

        result = await get_dashboard_summary(tenant, session)
        assert result.active_alerts_count == 0
