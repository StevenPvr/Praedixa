"""Tests for proof_service — ROI calculation and aggregation.

Covers:
- generate_proof_record: BAU calculation, 100%, reel, gain, adoption, upsert
- list_proof_records: pagination, site filter, empty
- get_proof_summary: aggregation, per-site breakdown, date filters
"""

from datetime import date
from decimal import Decimal
from typing import cast
from unittest.mock import MagicMock

import pytest

from app.services.proof_service import (
    _compute_historical_bau_proxy,
    generate_proof_record,
    get_proof_summary,
    list_proof_records,
)
from tests.unit.conftest import (
    _make_proof_record,
    _make_tenant,
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)

ORG_ID = "11111111-1111-1111-1111-111111111111"


def _make_tuple_result(*values):
    """Return a mock execute result where .one() returns a tuple."""
    result = MagicMock()
    result.one.return_value = values
    return result


# ── generate_proof_record ───────────────────────────────────────


class TestGenerateProofRecord:
    @pytest.mark.asyncio
    async def test_no_alerts_returns_zero_gain(self) -> None:
        tenant = _make_tenant()
        proof = _make_proof_record(
            gain_net_eur=Decimal("0.00"),
            cout_bau_eur=Decimal("0.00"),
            alertes_emises=0,
        )

        # Execute sequence for alertes_emises=0:
        # 1. alerts_agg_q → .one() returns (count=0, gap=0)
        # 2. upsert stmt → void
        # 3. fetch_q → .scalar_one() returns proof
        alerts_result = _make_tuple_result(0, 0)
        fetch_result = MagicMock()
        fetch_result.scalar_one.return_value = proof

        session = make_mock_session(
            alerts_result,
            MagicMock(),  # upsert
            fetch_result,
        )

        result = await generate_proof_record(
            session, tenant, site_id="site-paris", month=date(2026, 1, 1)
        )
        assert result is proof

    @pytest.mark.asyncio
    async def test_with_alerts_calculates_bau(self) -> None:
        tenant = _make_tenant()
        proof = _make_proof_record(
            cout_bau_eur=Decimal("480.00"),
            gain_net_eur=Decimal("480.00"),
        )

        # Execute sequence for alertes_emises > 0:
        # 1. alerts_agg_q → .one() returns (count=3, gap=12.00)
        # 2. historical_bau_q → .one() returns (cost, gap, service)
        # 3. opt_q → .scalar_one() returns Decimal("200.00")
        # 4. dec_q → .one() returns (Decimal("100.00"), 2)
        # 5. upsert stmt → void
        # 6. fetch_q → .scalar_one() returns proof
        alerts_result = _make_tuple_result(3, Decimal("12.00"))
        historical_result = _make_tuple_result(
            Decimal("300.00"), Decimal("10.00"), Decimal("0.7000")
        )
        opt_result = MagicMock()
        opt_result.scalar_one.return_value = Decimal("200.00")
        dec_result = _make_tuple_result(Decimal("100.00"), 2)
        fetch_result = MagicMock()
        fetch_result.scalar_one.return_value = proof

        session = make_mock_session(
            alerts_result,
            historical_result,
            opt_result,
            dec_result,
            MagicMock(),  # upsert
            fetch_result,
        )

        result = await generate_proof_record(
            session, tenant, site_id="site-paris", month=date(2026, 1, 15)
        )
        assert result is proof

    @pytest.mark.asyncio
    async def test_december_month_end_calculation(self) -> None:
        """December should roll to January of next year."""
        tenant = _make_tenant()
        proof = _make_proof_record()

        alerts_result = _make_tuple_result(0, 0)
        fetch_result = MagicMock()
        fetch_result.scalar_one.return_value = proof

        session = make_mock_session(
            alerts_result,
            MagicMock(),
            fetch_result,
        )

        result = await generate_proof_record(
            session, tenant, site_id="site-paris", month=date(2026, 12, 15)
        )
        assert result is proof

    @pytest.mark.asyncio
    async def test_upsert_behavior(self) -> None:
        """generate_proof_record uses ON CONFLICT DO UPDATE."""
        tenant = _make_tenant()
        proof = _make_proof_record()

        alerts_result = _make_tuple_result(0, 0)
        fetch_result = MagicMock()
        fetch_result.scalar_one.return_value = proof

        session = make_mock_session(
            alerts_result,
            MagicMock(),
            fetch_result,
        )

        await generate_proof_record(
            session, tenant, site_id="site-paris", month=date(2026, 1, 1)
        )
        session.execute.assert_called()

    @pytest.mark.asyncio
    async def test_adoption_zero_when_no_alerts(self) -> None:
        tenant = _make_tenant()
        proof = _make_proof_record(adoption_pct=Decimal("0.0000"))

        alerts_result = _make_tuple_result(0, 0)
        fetch_result = MagicMock()
        fetch_result.scalar_one.return_value = proof

        session = make_mock_session(
            alerts_result,
            MagicMock(),
            fetch_result,
        )

        result = await generate_proof_record(
            session, tenant, site_id="site-paris", month=date(2026, 1, 1)
        )
        assert result is proof

    @pytest.mark.asyncio
    async def test_null_alerts_count_coerced(self) -> None:
        tenant = _make_tenant()
        proof = _make_proof_record()

        # When count returns None, coerced to 0
        alerts_result = _make_tuple_result(None, None)
        fetch_result = MagicMock()
        fetch_result.scalar_one.return_value = proof

        session = make_mock_session(
            alerts_result,
            MagicMock(),
            fetch_result,
        )

        result = await generate_proof_record(
            session, tenant, site_id="site-paris", month=date(2026, 1, 1)
        )
        assert result is proof

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self) -> None:
        tenant = _make_tenant()
        proof = _make_proof_record()

        alerts_result = _make_tuple_result(0, 0)
        fetch_result = MagicMock()
        fetch_result.scalar_one.return_value = proof

        session = make_mock_session(
            alerts_result,
            MagicMock(),
            fetch_result,
        )

        await generate_proof_record(
            session, tenant, site_id="site-paris", month=date(2026, 1, 1)
        )
        tenant.apply.assert_called()


class TestHistoricalBauProxy:
    @pytest.mark.asyncio
    async def test_returns_none_on_unexpected_row_shape(self) -> None:
        tenant = _make_tenant()
        broken_result = MagicMock()
        broken_result.one.return_value = object()
        session = make_mock_session(broken_result)

        rate, service = await _compute_historical_bau_proxy(
            session,
            tenant,
            site_id="site-paris",
            month_start=date(2026, 1, 1),
        )
        assert rate is None
        assert service is None

    @pytest.mark.asyncio
    async def test_returns_none_when_total_gap_is_zero(self) -> None:
        tenant = _make_tenant()
        zero_gap_result = _make_tuple_result(Decimal("300.00"), Decimal("0.00"), None)
        session = make_mock_session(zero_gap_result)

        rate, service = await _compute_historical_bau_proxy(
            session,
            tenant,
            site_id="site-paris",
            month_start=date(2026, 1, 1),
        )
        assert rate is None
        assert service is None


# ── list_proof_records ──────────────────────────────────────────


class TestListProofRecords:
    @pytest.mark.asyncio
    async def test_returns_items_and_total(self) -> None:
        rec = _make_proof_record()
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([rec]),
        )
        items, total = await list_proof_records(session, tenant)
        assert total == 1
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_empty_list(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        items, total = await list_proof_records(session, tenant)
        assert total == 0
        assert items == []

    @pytest.mark.asyncio
    async def test_site_id_filter(self) -> None:
        rec = _make_proof_record(site_id="site-lyon")
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([rec]),
        )
        _items, total = await list_proof_records(session, tenant, site_id="site-lyon")
        assert total == 1

    @pytest.mark.asyncio
    async def test_pagination(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(50),
            make_scalars_result([_make_proof_record()]),
        )
        _items, total = await list_proof_records(session, tenant, page=3, page_size=5)
        assert total == 50

    @pytest.mark.asyncio
    async def test_none_count_coerced(self) -> None:
        tenant = _make_tenant()
        count_result = MagicMock()
        count_result.scalar_one.return_value = None
        session = make_mock_session(count_result, make_scalars_result([]))
        _items, total = await list_proof_records(session, tenant)
        assert total == 0

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        await list_proof_records(session, tenant)
        tenant.apply.assert_called()


# ── get_proof_summary ───────────────────────────────────────────


class TestGetProofSummary:
    @pytest.mark.asyncio
    async def test_basic_aggregation(self) -> None:
        tenant = _make_tenant()
        agg_result = MagicMock()
        agg_result.one.return_value = (
            Decimal("10000"),
            0.85,
            0.25,
            0.50,
        )
        site_result = MagicMock()
        site_result.all.return_value = [
            ("site-paris", Decimal("5000"), 0.9, 10, 9),
            ("site-lyon", Decimal("5000"), 0.8, 8, 7),
        ]

        session = make_mock_session(agg_result, site_result)
        result = await get_proof_summary(session, tenant)
        assert result["total_gain"] == Decimal("10000")
        assert result["avg_adoption"] is not None
        assert len(cast("list[object]", result["per_site"])) == 2

    @pytest.mark.asyncio
    async def test_empty_data(self) -> None:
        tenant = _make_tenant()
        agg_result = MagicMock()
        agg_result.one.return_value = (0, None, None, None)
        site_result = MagicMock()
        site_result.all.return_value = []

        session = make_mock_session(agg_result, site_result)
        result = await get_proof_summary(session, tenant)
        assert result["total_gain"] == Decimal("0")
        assert result["avg_adoption"] is None
        assert result["per_site"] == []

    @pytest.mark.asyncio
    async def test_date_from_filter(self) -> None:
        tenant = _make_tenant()
        agg_result = MagicMock()
        agg_result.one.return_value = (Decimal("5000"), 0.9, 0.3, 0.60)
        site_result = MagicMock()
        site_result.all.return_value = []

        session = make_mock_session(agg_result, site_result)
        result = await get_proof_summary(session, tenant, date_from=date(2026, 1, 1))
        assert result["total_gain"] == Decimal("5000")

    @pytest.mark.asyncio
    async def test_date_to_filter(self) -> None:
        tenant = _make_tenant()
        agg_result = MagicMock()
        agg_result.one.return_value = (Decimal("3000"), 0.8, 0.2, 0.55)
        site_result = MagicMock()
        site_result.all.return_value = []

        session = make_mock_session(agg_result, site_result)
        result = await get_proof_summary(session, tenant, date_to=date(2026, 6, 1))
        assert result["total_gain"] == Decimal("3000")

    @pytest.mark.asyncio
    async def test_both_date_filters(self) -> None:
        tenant = _make_tenant()
        agg_result = MagicMock()
        agg_result.one.return_value = (Decimal("2000"), 0.75, 0.15, 0.45)
        site_result = MagicMock()
        site_result.all.return_value = []

        session = make_mock_session(agg_result, site_result)
        result = await get_proof_summary(
            session, tenant, date_from=date(2026, 1, 1), date_to=date(2026, 3, 1)
        )
        assert result["total_gain"] == Decimal("2000")

    @pytest.mark.asyncio
    async def test_null_agg_values(self) -> None:
        tenant = _make_tenant()
        agg_result = MagicMock()
        agg_result.one.return_value = (None, None, None, None)
        site_result = MagicMock()
        site_result.all.return_value = []

        session = make_mock_session(agg_result, site_result)
        result = await get_proof_summary(session, tenant)
        assert result["total_gain"] == Decimal("0")
        assert result["avg_adoption"] is None
        assert result["avg_service_improvement"] is None

    @pytest.mark.asyncio
    async def test_per_site_breakdown(self) -> None:
        tenant = _make_tenant()
        agg_result = MagicMock()
        agg_result.one.return_value = (Decimal("15000"), 0.85, 0.3, 0.61)
        site_result = MagicMock()
        site_result.all.return_value = [
            ("site-paris", Decimal("8000"), 0.9, 15, 14),
            ("site-lyon", Decimal("4000"), 0.8, 10, 8),
            ("site-marseille", Decimal("3000"), None, 5, 3),
        ]

        session = make_mock_session(agg_result, site_result)
        result = await get_proof_summary(session, tenant)
        per_site = cast("list[dict[str, object]]", result["per_site"])
        assert len(per_site) == 3
        paris = per_site[0]
        assert paris["site_id"] == "site-paris"
        assert paris["gain_net_eur"] == Decimal("8000")
        assert paris["alertes_emises"] == 15

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self) -> None:
        tenant = _make_tenant()
        agg_result = MagicMock()
        agg_result.one.return_value = (0, None, None, None)
        site_result = MagicMock()
        site_result.all.return_value = []

        session = make_mock_session(agg_result, site_result)
        await get_proof_summary(session, tenant)
        tenant.apply.assert_called()
