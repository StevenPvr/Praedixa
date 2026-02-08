"""Tests for decision_log_service — CRUD and override tracking.

Covers:
- list_operational_decisions: filters (site_id, date_from, date_to, is_override, horizon), pagination
- get_operational_decision: success, not found
- create_operational_decision: happy path, override without reason raises, sanitization
- update_operational_decision: partial update, not found
- get_override_statistics: all stats, zero decisions edge case
- OverrideReasonRequiredError: message, code, status
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import NotFoundError
from app.models.operational import Horizon, ShiftType
from app.services.decision_log_service import (
    OverrideReasonRequiredError,
    create_operational_decision,
    get_operational_decision,
    get_override_statistics,
    list_operational_decisions,
    update_operational_decision,
)
from tests.unit.conftest import (
    _make_coverage_alert,
    _make_operational_decision,
    _make_scenario_option,
    _make_tenant,
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)

ORG_ID = "11111111-1111-1111-1111-111111111111"


# ── OverrideReasonRequiredError ─────────────────────────────────


class TestOverrideReasonRequiredError:
    def test_message(self):
        err = OverrideReasonRequiredError()
        assert "override_reason" in err.message.lower()

    def test_code(self):
        err = OverrideReasonRequiredError()
        assert err.code == "OVERRIDE_REASON_REQUIRED"

    def test_status_code(self):
        err = OverrideReasonRequiredError()
        assert err.status_code == 422

    def test_inherits_praedixa_error(self):
        from app.core.exceptions import PraedixaError

        err = OverrideReasonRequiredError()
        assert isinstance(err, PraedixaError)


# ── list_operational_decisions ──────────────────────────────────


class TestListOperationalDecisions:
    @pytest.mark.asyncio
    async def test_returns_items_and_total(self):
        dec = _make_operational_decision()
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([dec]),
        )
        items, total = await list_operational_decisions(session, tenant)
        assert total == 1
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_empty_list(self):
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        items, total = await list_operational_decisions(session, tenant)
        assert total == 0
        assert items == []

    @pytest.mark.asyncio
    async def test_site_id_filter(self):
        dec = _make_operational_decision(site_id="site-lyon")
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([dec]),
        )
        _items, total = await list_operational_decisions(
            session, tenant, site_id="site-lyon"
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_date_from_filter(self):
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([_make_operational_decision()]),
        )
        _items, total = await list_operational_decisions(
            session, tenant, date_from=date(2026, 1, 1)
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_date_to_filter(self):
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([_make_operational_decision()]),
        )
        _items, total = await list_operational_decisions(
            session, tenant, date_to=date(2026, 2, 1)
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_is_override_filter(self):
        dec = _make_operational_decision(is_override=True)
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([dec]),
        )
        _items, total = await list_operational_decisions(
            session, tenant, is_override=True
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_horizon_filter(self):
        dec = _make_operational_decision(horizon=Horizon.J7)
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([dec]),
        )
        _items, total = await list_operational_decisions(
            session, tenant, horizon=Horizon.J7
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_pagination(self):
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(50),
            make_scalars_result([_make_operational_decision()]),
        )
        _items, total = await list_operational_decisions(
            session, tenant, page=3, page_size=10
        )
        assert total == 50

    @pytest.mark.asyncio
    async def test_none_count_coerced(self):
        tenant = _make_tenant()
        count_result = MagicMock()
        count_result.scalar_one.return_value = None
        session = make_mock_session(count_result, make_scalars_result([]))
        _items, total = await list_operational_decisions(session, tenant)
        assert total == 0

    @pytest.mark.asyncio
    async def test_combined_filters(self):
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([_make_operational_decision()]),
        )
        _items, total = await list_operational_decisions(
            session,
            tenant,
            site_id="site-paris",
            date_from=date(2026, 1, 1),
            date_to=date(2026, 2, 1),
            is_override=False,
            horizon=Horizon.J3,
        )
        assert total == 1


# ── get_operational_decision ────────────────────────────────────


class TestGetOperationalDecision:
    @pytest.mark.asyncio
    async def test_returns_decision(self):
        dec = _make_operational_decision()
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = dec
        session = make_mock_session(result_mock)
        result = await get_operational_decision(session, tenant, dec.id)
        assert result is dec

    @pytest.mark.asyncio
    async def test_raises_not_found(self):
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError, match="OperationalDecision"):
            await get_operational_decision(session, tenant, uuid.uuid4())

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self):
        dec = _make_operational_decision()
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = dec
        session = make_mock_session(result_mock)
        await get_operational_decision(session, tenant, dec.id)
        tenant.apply.assert_called()


# ── create_operational_decision ─────────────────────────────────


class TestCreateOperationalDecision:
    @pytest.mark.asyncio
    async def test_happy_path(self):
        tenant = _make_tenant()
        alert = _make_coverage_alert()
        recommended = _make_scenario_option(is_recommended=True)
        chosen = _make_scenario_option(
            cout_total_eur=Decimal("500.00"),
            service_attendu_pct=Decimal("1.0000"),
        )

        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert
        rec_result = MagicMock()
        rec_result.scalar_one_or_none.return_value = recommended
        chosen_result = MagicMock()
        chosen_result.scalar_one_or_none.return_value = chosen

        session = make_mock_session(alert_result, rec_result, chosen_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_operational_decision(
            session,
            tenant,
            coverage_alert_id=alert.id,
            chosen_option_id=chosen.id,
            site_id="site-paris",
            decision_date=date(2026, 1, 18),
            shift=ShiftType.AM,
            horizon=Horizon.J3,
            gap_h=Decimal("12.00"),
            decided_by=uuid.uuid4(),
        )
        assert result.organization_id == uuid.UUID(ORG_ID)
        assert result.cout_attendu_eur == Decimal("500.00")
        session.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_override_requires_reason(self):
        tenant = _make_tenant()
        session = AsyncMock()

        with pytest.raises(OverrideReasonRequiredError):
            await create_operational_decision(
                session,
                tenant,
                coverage_alert_id=uuid.uuid4(),
                chosen_option_id=uuid.uuid4(),
                site_id="site-paris",
                decision_date=date(2026, 1, 18),
                shift=ShiftType.AM,
                horizon=Horizon.J3,
                gap_h=Decimal("12.00"),
                decided_by=uuid.uuid4(),
                is_override=True,
                override_reason=None,
            )

    @pytest.mark.asyncio
    async def test_override_with_reason_succeeds(self):
        tenant = _make_tenant()
        alert = _make_coverage_alert()
        recommended = _make_scenario_option(is_recommended=True)
        chosen = _make_scenario_option()

        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert
        rec_result = MagicMock()
        rec_result.scalar_one_or_none.return_value = recommended
        chosen_result = MagicMock()
        chosen_result.scalar_one_or_none.return_value = chosen

        session = make_mock_session(alert_result, rec_result, chosen_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_operational_decision(
            session,
            tenant,
            coverage_alert_id=alert.id,
            chosen_option_id=chosen.id,
            site_id="site-paris",
            decision_date=date(2026, 1, 18),
            shift=ShiftType.AM,
            horizon=Horizon.J3,
            gap_h=Decimal("12.00"),
            decided_by=uuid.uuid4(),
            is_override=True,
            override_reason="Manager preference",
        )
        assert result.is_override is True

    @pytest.mark.asyncio
    async def test_alert_not_found(self):
        tenant = _make_tenant()
        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = None
        session = make_mock_session(alert_result)

        with pytest.raises(NotFoundError, match="CoverageAlert"):
            await create_operational_decision(
                session,
                tenant,
                coverage_alert_id=uuid.uuid4(),
                chosen_option_id=None,
                site_id="site-paris",
                decision_date=date(2026, 1, 18),
                shift=ShiftType.AM,
                horizon=Horizon.J3,
                gap_h=Decimal("12.00"),
                decided_by=uuid.uuid4(),
            )

    @pytest.mark.asyncio
    async def test_no_chosen_option(self):
        tenant = _make_tenant()
        alert = _make_coverage_alert()
        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert
        rec_result = MagicMock()
        rec_result.scalar_one_or_none.return_value = None

        session = make_mock_session(alert_result, rec_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_operational_decision(
            session,
            tenant,
            coverage_alert_id=alert.id,
            chosen_option_id=None,
            site_id="site-paris",
            decision_date=date(2026, 1, 18),
            shift=ShiftType.AM,
            horizon=Horizon.J3,
            gap_h=Decimal("12.00"),
            decided_by=uuid.uuid4(),
        )
        assert result.cout_attendu_eur is None
        assert result.service_attendu_pct is None

    @pytest.mark.asyncio
    async def test_no_recommended_option(self):
        tenant = _make_tenant()
        alert = _make_coverage_alert()
        chosen = _make_scenario_option()

        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert
        rec_result = MagicMock()
        rec_result.scalar_one_or_none.return_value = None
        chosen_result = MagicMock()
        chosen_result.scalar_one_or_none.return_value = chosen

        session = make_mock_session(alert_result, rec_result, chosen_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_operational_decision(
            session,
            tenant,
            coverage_alert_id=alert.id,
            chosen_option_id=chosen.id,
            site_id="site-paris",
            decision_date=date(2026, 1, 18),
            shift=ShiftType.AM,
            horizon=Horizon.J3,
            gap_h=Decimal("12.00"),
            decided_by=uuid.uuid4(),
        )
        assert result.recommended_option_id is None

    @pytest.mark.asyncio
    async def test_override_empty_string_reason(self):
        """Empty string reason should also raise."""
        tenant = _make_tenant()
        session = AsyncMock()

        with pytest.raises(OverrideReasonRequiredError):
            await create_operational_decision(
                session,
                tenant,
                coverage_alert_id=uuid.uuid4(),
                chosen_option_id=None,
                site_id="site-paris",
                decision_date=date(2026, 1, 18),
                shift=ShiftType.AM,
                horizon=Horizon.J3,
                gap_h=Decimal("12.00"),
                decided_by=uuid.uuid4(),
                is_override=True,
                override_reason="",
            )

    @pytest.mark.asyncio
    async def test_comment_sanitized(self):
        tenant = _make_tenant()
        alert = _make_coverage_alert()
        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert
        rec_result = MagicMock()
        rec_result.scalar_one_or_none.return_value = None

        session = make_mock_session(alert_result, rec_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_operational_decision(
            session,
            tenant,
            coverage_alert_id=alert.id,
            chosen_option_id=None,
            site_id="site-paris",
            decision_date=date(2026, 1, 18),
            shift=ShiftType.AM,
            horizon=Horizon.J3,
            gap_h=Decimal("12.00"),
            decided_by=uuid.uuid4(),
            comment="<script>alert('xss')</script>",
        )
        assert "<script>" not in (result.comment or "")


# ── update_operational_decision ─────────────────────────────────


class TestUpdateOperationalDecision:
    @pytest.mark.asyncio
    async def test_update_observed_cost(self):
        dec = _make_operational_decision()
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = dec
        session = make_mock_session(result_mock)
        session.flush = AsyncMock()

        result = await update_operational_decision(
            session, tenant, dec.id, cout_observe_eur=Decimal("450.00")
        )
        assert result.cout_observe_eur == Decimal("450.00")

    @pytest.mark.asyncio
    async def test_update_observed_service(self):
        dec = _make_operational_decision()
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = dec
        session = make_mock_session(result_mock)
        session.flush = AsyncMock()

        result = await update_operational_decision(
            session, tenant, dec.id, service_observe_pct=Decimal("0.9500")
        )
        assert result.service_observe_pct == Decimal("0.9500")

    @pytest.mark.asyncio
    async def test_update_comment(self):
        dec = _make_operational_decision()
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = dec
        session = make_mock_session(result_mock)
        session.flush = AsyncMock()

        result = await update_operational_decision(
            session, tenant, dec.id, comment="Updated comment"
        )
        assert "Updated comment" in result.comment

    @pytest.mark.asyncio
    async def test_not_found_raises(self):
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError):
            await update_operational_decision(
                session, tenant, uuid.uuid4(), cout_observe_eur=Decimal("100")
            )

    @pytest.mark.asyncio
    async def test_no_changes_still_flushes(self):
        dec = _make_operational_decision()
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = dec
        session = make_mock_session(result_mock)
        session.flush = AsyncMock()

        await update_operational_decision(session, tenant, dec.id)
        session.flush.assert_awaited()

    @pytest.mark.asyncio
    async def test_partial_update(self):
        dec = _make_operational_decision(
            cout_observe_eur=Decimal("300.00"),
        )
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = dec
        session = make_mock_session(result_mock)
        session.flush = AsyncMock()

        result = await update_operational_decision(
            session, tenant, dec.id, service_observe_pct=Decimal("0.95")
        )
        assert result.cout_observe_eur == Decimal("300.00")
        assert result.service_observe_pct == Decimal("0.95")


# ── get_override_statistics ─────────────────────────────────────


class TestGetOverrideStatistics:
    @pytest.mark.asyncio
    async def test_zero_decisions(self):
        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        result = await get_override_statistics(session, tenant)
        assert result["total"] == 0
        assert result["override_count"] == 0
        assert result["override_pct"] == Decimal("0")
        assert result["top_reasons"] == []
        assert result["avg_cost_delta"] is None

    @pytest.mark.asyncio
    async def test_with_decisions(self):
        tenant = _make_tenant()
        reasons_result = MagicMock()
        reasons_result.all.return_value = [
            ("Too expensive", 5),
            ("Timing", 3),
        ]

        session = make_mock_session(
            make_scalar_result(20),  # total
            make_scalar_result(8),  # override count
            reasons_result,  # top reasons
            make_scalar_result(150.0),  # avg cost delta
        )
        result = await get_override_statistics(session, tenant)
        assert result["total"] == 20
        assert result["override_count"] == 8
        assert result["override_pct"] == Decimal("40.0")
        assert len(result["top_reasons"]) == 2
        assert result["avg_cost_delta"] == Decimal("150.0")

    @pytest.mark.asyncio
    async def test_null_override_count(self):
        tenant = _make_tenant()
        reasons_result = MagicMock()
        reasons_result.all.return_value = []

        session = make_mock_session(
            make_scalar_result(10),
            make_scalar_result(None),  # null override count
            reasons_result,
            make_scalar_result(None),
        )
        result = await get_override_statistics(session, tenant)
        assert result["override_count"] == 0
        assert result["override_pct"] == Decimal("0.0")

    @pytest.mark.asyncio
    async def test_null_avg_delta(self):
        tenant = _make_tenant()
        reasons_result = MagicMock()
        reasons_result.all.return_value = []

        session = make_mock_session(
            make_scalar_result(10),
            make_scalar_result(2),
            reasons_result,
            make_scalar_result(None),  # null avg delta
        )
        result = await get_override_statistics(session, tenant)
        assert result["avg_cost_delta"] is None

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self):
        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        await get_override_statistics(session, tenant)
        tenant.apply.assert_called()
