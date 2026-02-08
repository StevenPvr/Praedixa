"""Tests for cost_parameter_service — CRUD and temporal versioning.

Covers:
- list_cost_parameters: pagination, site filter, empty results
- get_effective_cost_parameter: site-specific, org-wide fallback, not found
- create_cost_parameter: auto-version, close previous, org_id injection
- get_cost_parameter_history: site-specific, org-wide defaults
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import NotFoundError
from app.services.cost_parameter_service import (
    create_cost_parameter,
    get_cost_parameter_history,
    get_effective_cost_parameter,
    list_cost_parameters,
)
from tests.unit.conftest import (
    _make_cost_parameter,
    _make_tenant,
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)

ORG_ID = "11111111-1111-1111-1111-111111111111"


# ── list_cost_parameters ────────────────────────────────────────


class TestListCostParameters:
    @pytest.mark.asyncio
    async def test_returns_items_and_total(self) -> None:
        cp = _make_cost_parameter()
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([cp]),
        )
        items, total = await list_cost_parameters(session, tenant)
        assert total == 1
        assert len(items) == 1
        assert items[0] is cp

    @pytest.mark.asyncio
    async def test_returns_empty_list(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        items, total = await list_cost_parameters(session, tenant)
        assert total == 0
        assert items == []

    @pytest.mark.asyncio
    async def test_site_id_filter(self) -> None:
        cp = _make_cost_parameter(site_id="site-lyon")
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([cp]),
        )
        items, total = await list_cost_parameters(session, tenant, site_id="site-lyon")
        assert total == 1
        assert items[0].site_id == "site-lyon"

    @pytest.mark.asyncio
    async def test_pagination(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(50),
            make_scalars_result([_make_cost_parameter()]),
        )
        _items, total = await list_cost_parameters(session, tenant, page=3, page_size=5)
        assert total == 50

    @pytest.mark.asyncio
    async def test_none_count_coerced_to_zero(self) -> None:
        tenant = _make_tenant()
        count_result = MagicMock()
        count_result.scalar_one.return_value = None
        session = make_mock_session(count_result, make_scalars_result([]))
        _items, total = await list_cost_parameters(session, tenant)
        assert total == 0

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        await list_cost_parameters(session, tenant)
        tenant.apply.assert_called()


# ── get_effective_cost_parameter ────────────────────────────────


class TestGetEffectiveCostParameter:
    @pytest.mark.asyncio
    async def test_site_specific_found(self) -> None:
        cp = _make_cost_parameter(site_id="site-paris")
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = cp
        session = make_mock_session(result_mock)
        result = await get_effective_cost_parameter(
            session, tenant, site_id="site-paris", target_date=date(2026, 1, 15)
        )
        assert result is cp

    @pytest.mark.asyncio
    async def test_org_wide_fallback(self) -> None:
        org_cp = _make_cost_parameter(site_id=None)
        tenant = _make_tenant()
        # First call: site-specific returns None
        site_result = MagicMock()
        site_result.scalar_one_or_none.return_value = None
        # Second call: org-wide returns param
        org_result = MagicMock()
        org_result.scalar_one_or_none.return_value = org_cp
        session = make_mock_session(site_result, org_result)

        result = await get_effective_cost_parameter(
            session, tenant, site_id="site-paris", target_date=date(2026, 1, 15)
        )
        assert result is org_cp
        assert result.site_id is None

    @pytest.mark.asyncio
    async def test_not_found_raises(self) -> None:
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock, result_mock)
        with pytest.raises(NotFoundError, match="CostParameter"):
            await get_effective_cost_parameter(
                session, tenant, site_id="site-unknown", target_date=date(2026, 1, 15)
            )

    @pytest.mark.asyncio
    async def test_no_site_id_goes_to_default(self) -> None:
        org_cp = _make_cost_parameter(site_id=None)
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = org_cp
        session = make_mock_session(result_mock)
        result = await get_effective_cost_parameter(
            session, tenant, site_id=None, target_date=date(2026, 1, 15)
        )
        assert result is org_cp

    @pytest.mark.asyncio
    async def test_no_site_no_default_raises(self) -> None:
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError, match="CostParameter"):
            await get_effective_cost_parameter(
                session, tenant, site_id=None, target_date=date(2026, 1, 15)
            )

    @pytest.mark.asyncio
    async def test_no_target_date_uses_today(self) -> None:
        cp = _make_cost_parameter(site_id=None)
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = cp
        session = make_mock_session(result_mock)
        result = await get_effective_cost_parameter(session, tenant)
        assert result is cp

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self) -> None:
        cp = _make_cost_parameter(site_id=None)
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = cp
        session = make_mock_session(result_mock)
        await get_effective_cost_parameter(session, tenant)
        tenant.apply.assert_called()


# ── create_cost_parameter ───────────────────────────────────────


class TestCreateCostParameter:
    @pytest.mark.asyncio
    async def test_happy_path_first_version(self) -> None:
        tenant = _make_tenant()
        # max version query returns 0
        version_result = MagicMock()
        version_result.scalar_one.return_value = 0
        # close previous query returns None
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = None

        session = make_mock_session(version_result, close_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("35.00"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45.00"),
            effective_from=date(2026, 1, 1),
        )
        assert result.version == 1
        assert result.organization_id == uuid.UUID(ORG_ID)
        session.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_auto_version_increment(self) -> None:
        tenant = _make_tenant()
        version_result = MagicMock()
        version_result.scalar_one.return_value = 3
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = None

        session = make_mock_session(version_result, close_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("35.00"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45.00"),
            effective_from=date(2026, 2, 1),
        )
        assert result.version == 4

    @pytest.mark.asyncio
    async def test_closes_previous_version(self) -> None:
        tenant = _make_tenant()
        prev_cp = _make_cost_parameter(effective_until=None)

        version_result = MagicMock()
        version_result.scalar_one.return_value = 1
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = prev_cp
        update_result = MagicMock()

        session = make_mock_session(version_result, close_result, update_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        new_effective = date(2026, 2, 1)
        result = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("40.00"),
            maj_hs=Decimal("0.30"),
            c_interim=Decimal("50.00"),
            effective_from=new_effective,
        )
        assert result.version == 2
        # Verify update was executed (closing previous)
        assert session.execute.call_count == 3

    @pytest.mark.asyncio
    async def test_site_id_specific(self) -> None:
        tenant = _make_tenant()
        version_result = MagicMock()
        version_result.scalar_one.return_value = 0
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = None

        session = make_mock_session(version_result, close_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("35.00"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45.00"),
            effective_from=date(2026, 1, 1),
            site_id="site-lyon",
        )
        assert result.site_id == "site-lyon"

    @pytest.mark.asyncio
    async def test_org_wide_default(self) -> None:
        tenant = _make_tenant()
        version_result = MagicMock()
        version_result.scalar_one.return_value = 0
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = None

        session = make_mock_session(version_result, close_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("35.00"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45.00"),
            effective_from=date(2026, 1, 1),
            site_id=None,
        )
        assert result.site_id is None

    @pytest.mark.asyncio
    async def test_default_values(self) -> None:
        tenant = _make_tenant()
        version_result = MagicMock()
        version_result.scalar_one.return_value = 0
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = None

        session = make_mock_session(version_result, close_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("35.00"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45.00"),
            effective_from=date(2026, 1, 1),
        )
        assert result.premium_urgence == Decimal("0.1000")
        assert result.c_backlog == Decimal("60.00")
        assert result.cap_hs_shift == 30
        assert result.cap_interim_site == 50
        assert result.lead_time_jours == 2
        assert result.effective_until is None

    @pytest.mark.asyncio
    async def test_null_max_version_treated_as_zero(self) -> None:
        tenant = _make_tenant()
        version_result = MagicMock()
        version_result.scalar_one.return_value = None
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = None

        session = make_mock_session(version_result, close_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("35.00"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45.00"),
            effective_from=date(2026, 1, 1),
        )
        assert result.version == 1


# ── get_cost_parameter_history ──────────────────────────────────


class TestGetCostParameterHistory:
    @pytest.mark.asyncio
    async def test_returns_history_for_site(self) -> None:
        cp1 = _make_cost_parameter(version=1)
        cp2 = _make_cost_parameter(version=2)
        tenant = _make_tenant()
        session = make_mock_session(make_scalars_result([cp2, cp1]))
        result = await get_cost_parameter_history(session, tenant, site_id="site-paris")
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_returns_org_wide_defaults(self) -> None:
        cp = _make_cost_parameter(site_id=None)
        tenant = _make_tenant()
        session = make_mock_session(make_scalars_result([cp]))
        result = await get_cost_parameter_history(session, tenant, site_id=None)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_empty_history(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(make_scalars_result([]))
        result = await get_cost_parameter_history(session, tenant, site_id="unknown")
        assert result == []

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(make_scalars_result([]))
        await get_cost_parameter_history(session, tenant, site_id="site-paris")
        tenant.apply.assert_called()
