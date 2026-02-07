"""Tests for app.services.forecasts — forecast listing and daily data."""

import uuid
from datetime import date
from types import SimpleNamespace

import pytest

from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.models.daily_forecast import ForecastDimension
from app.models.forecast_run import ForecastStatus
from app.services.forecasts import get_daily_forecasts, list_forecasts
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


class TestListForecasts:
    """Test list_forecasts service function."""

    @pytest.mark.asyncio
    async def test_returns_items_and_total(self):
        tenant = TenantFilter("org-1")
        items = [SimpleNamespace(id=uuid.uuid4()), SimpleNamespace(id=uuid.uuid4())]

        session = make_mock_session(
            make_scalar_result(2),  # count query
            make_scalars_result(items),  # items query
        )

        result_items, total = await list_forecasts(tenant, session)
        assert total == 2
        assert len(result_items) == 2

    @pytest.mark.asyncio
    async def test_empty_result(self):
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        items, total = await list_forecasts(tenant, session)
        assert total == 0
        assert items == []

    @pytest.mark.asyncio
    async def test_pagination(self):
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(50),  # total count = 50
            make_scalars_result([SimpleNamespace(id=uuid.uuid4())]),  # 1 item on page
        )

        items, total = await list_forecasts(tenant, session, limit=10, offset=0)
        assert total == 50
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_status_filter(self):
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([SimpleNamespace(id=uuid.uuid4())]),
        )

        _items, total = await list_forecasts(
            tenant, session, status_filter=ForecastStatus.COMPLETED
        )
        assert total == 1


class TestGetDailyForecasts:
    """Test get_daily_forecasts service function."""

    @pytest.mark.asyncio
    async def test_returns_forecasts(self):
        tenant = TenantFilter("org-1")
        run_id = uuid.uuid4()
        daily = [SimpleNamespace(id=uuid.uuid4(), forecast_date=date(2026, 1, 1))]

        session = make_mock_session(
            make_scalar_result(run_id),  # run exists check
            make_scalars_result(daily),  # daily forecasts
        )

        result = await get_daily_forecasts(run_id, tenant, session)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_run_not_found_raises(self):
        tenant = TenantFilter("org-1")
        run_id = uuid.uuid4()

        session = make_mock_session(
            make_scalar_result(None),  # run does not exist
        )

        with pytest.raises(NotFoundError) as exc_info:
            await get_daily_forecasts(run_id, tenant, session)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_dimension_filter(self):
        tenant = TenantFilter("org-1")
        run_id = uuid.uuid4()

        session = make_mock_session(
            make_scalar_result(run_id),
            make_scalars_result([]),
        )

        result = await get_daily_forecasts(
            run_id, tenant, session, dimension=ForecastDimension.HUMAN
        )
        assert result == []

    @pytest.mark.asyncio
    async def test_date_from_filter(self):
        tenant = TenantFilter("org-1")
        run_id = uuid.uuid4()

        session = make_mock_session(
            make_scalar_result(run_id),
            make_scalars_result([]),
        )

        result = await get_daily_forecasts(
            run_id, tenant, session, date_from=date(2026, 1, 1)
        )
        assert result == []

    @pytest.mark.asyncio
    async def test_date_to_filter(self):
        tenant = TenantFilter("org-1")
        run_id = uuid.uuid4()

        session = make_mock_session(
            make_scalar_result(run_id),
            make_scalars_result([]),
        )

        result = await get_daily_forecasts(
            run_id, tenant, session, date_to=date(2026, 12, 31)
        )
        assert result == []

    @pytest.mark.asyncio
    async def test_all_filters_combined(self):
        tenant = TenantFilter("org-1")
        run_id = uuid.uuid4()

        session = make_mock_session(
            make_scalar_result(run_id),
            make_scalars_result([]),
        )

        result = await get_daily_forecasts(
            run_id,
            tenant,
            session,
            dimension=ForecastDimension.MERCHANDISE,
            date_from=date(2026, 1, 1),
            date_to=date(2026, 1, 31),
        )
        assert result == []
