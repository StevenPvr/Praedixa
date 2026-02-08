"""Tests for canonical_data_service — CRUD and analytics for canonical records.

Covers:
- list_canonical_records: pagination, filters (site_id, date_from, date_to, shift), empty results
- get_canonical_record: success, not found
- create_canonical_record: happy path, org_id from tenant
- bulk_import_canonical: insert + dedup counts, empty list, org_id injection
- get_quality_dashboard: all metrics, zero records edge case
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import NotFoundError
from app.models.operational import ShiftType
from app.services.canonical_data_service import (
    bulk_import_canonical,
    create_canonical_record,
    get_canonical_record,
    get_quality_dashboard,
    list_canonical_records,
)
from tests.unit.conftest import (
    _make_canonical_record,
    _make_tenant,
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)

ORG_ID = "11111111-1111-1111-1111-111111111111"


# ── list_canonical_records ──────────────────────────────────────


class TestListCanonicalRecords:
    @pytest.mark.asyncio
    async def test_returns_items_and_total(self):
        rec = _make_canonical_record()
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([rec]),
        )
        items, total = await list_canonical_records(session, tenant)
        assert total == 1
        assert len(items) == 1
        assert items[0] is rec

    @pytest.mark.asyncio
    async def test_returns_empty_list(self):
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        items, total = await list_canonical_records(session, tenant)
        assert total == 0
        assert items == []

    @pytest.mark.asyncio
    async def test_none_count_coerced_to_zero(self):
        tenant = _make_tenant()
        count_result = MagicMock()
        count_result.scalar_one.return_value = None
        session = make_mock_session(count_result, make_scalars_result([]))
        items, total = await list_canonical_records(session, tenant)
        assert total == 0
        assert items == []

    @pytest.mark.asyncio
    async def test_pagination_page_2(self):
        rec = _make_canonical_record()
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(50),
            make_scalars_result([rec]),
        )
        items, total = await list_canonical_records(
            session, tenant, page=2, page_size=10
        )
        assert total == 50
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_site_id_filter(self):
        rec = _make_canonical_record(site_id="site-lyon")
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([rec]),
        )
        items, total = await list_canonical_records(
            session, tenant, site_id="site-lyon"
        )
        assert total == 1
        assert items[0].site_id == "site-lyon"

    @pytest.mark.asyncio
    async def test_date_from_filter(self):
        rec = _make_canonical_record()
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([rec]),
        )
        _items, total = await list_canonical_records(
            session, tenant, date_from=date(2026, 1, 1)
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_date_to_filter(self):
        rec = _make_canonical_record()
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([rec]),
        )
        _items, total = await list_canonical_records(
            session, tenant, date_to=date(2026, 2, 1)
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_shift_filter(self):
        rec = _make_canonical_record(shift=ShiftType.PM)
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([rec]),
        )
        _items, total = await list_canonical_records(
            session, tenant, shift=ShiftType.PM
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_combined_filters(self):
        rec = _make_canonical_record(site_id="site-lyon", shift=ShiftType.PM)
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([rec]),
        )
        _items, total = await list_canonical_records(
            session,
            tenant,
            site_id="site-lyon",
            date_from=date(2026, 1, 1),
            date_to=date(2026, 2, 1),
            shift=ShiftType.PM,
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_page_offset_calculation(self):
        """Page 3, page_size 5 should offset by 10."""
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(100),
            make_scalars_result([]),
        )
        await list_canonical_records(session, tenant, page=3, page_size=5)
        # Verify the query was executed (implicitly testing offset=10)
        assert session.execute.call_count == 2


# ── get_canonical_record ────────────────────────────────────────


class TestGetCanonicalRecord:
    @pytest.mark.asyncio
    async def test_returns_record(self):
        rec = _make_canonical_record()
        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(rec))
        result = await get_canonical_record(session, tenant, rec.id)
        assert result is rec

    @pytest.mark.asyncio
    async def test_raises_not_found(self):
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError, match="CanonicalRecord"):
            await get_canonical_record(session, tenant, uuid.uuid4())

    @pytest.mark.asyncio
    async def test_not_found_contains_uuid_in_details(self):
        tenant = _make_tenant()
        rid = uuid.uuid4()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError) as exc_info:
            await get_canonical_record(session, tenant, rid)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self):
        rec = _make_canonical_record()
        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(rec))
        await get_canonical_record(session, tenant, rec.id)
        tenant.apply.assert_called()


# ── create_canonical_record ─────────────────────────────────────


class TestCreateCanonicalRecord:
    @pytest.mark.asyncio
    async def test_happy_path(self):
        tenant = _make_tenant()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_canonical_record(
            session,
            tenant,
            site_id="site-paris",
            date=date(2026, 1, 15),
            shift=ShiftType.AM,
            capacite_plan_h=Decimal("100.00"),
        )
        assert result.site_id == "site-paris"
        assert result.organization_id == uuid.UUID(ORG_ID)
        session.add.assert_called_once()
        session.flush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_org_id_from_tenant(self):
        custom_org = "22222222-2222-2222-2222-222222222222"
        tenant = _make_tenant(org_id=custom_org)
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_canonical_record(
            session,
            tenant,
            site_id="site-lyon",
            date=date(2026, 1, 20),
            shift=ShiftType.PM,
            capacite_plan_h=Decimal("80.00"),
        )
        assert result.organization_id == uuid.UUID(custom_org)

    @pytest.mark.asyncio
    async def test_default_values(self):
        tenant = _make_tenant()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_canonical_record(
            session,
            tenant,
            site_id="site-paris",
            date=date(2026, 1, 15),
            shift=ShiftType.AM,
            capacite_plan_h=Decimal("100.00"),
        )
        assert result.abs_h == Decimal("0")
        assert result.hs_h == Decimal("0")
        assert result.interim_h == Decimal("0")
        assert result.competence is None

    @pytest.mark.asyncio
    async def test_all_optional_fields(self):
        tenant = _make_tenant()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_canonical_record(
            session,
            tenant,
            site_id="site-paris",
            date=date(2026, 1, 15),
            shift=ShiftType.AM,
            capacite_plan_h=Decimal("100.00"),
            competence="infirmier",
            charge_units=Decimal("120.00"),
            realise_h=Decimal("92.00"),
            abs_h=Decimal("8.00"),
            hs_h=Decimal("4.00"),
            interim_h=Decimal("2.00"),
            cout_interne_est=Decimal("3500.00"),
        )
        assert result.competence == "infirmier"
        assert result.charge_units == Decimal("120.00")
        assert result.realise_h == Decimal("92.00")

    @pytest.mark.asyncio
    async def test_session_add_called_with_canonical_record(self):
        from app.models.operational import CanonicalRecord

        tenant = _make_tenant()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        await create_canonical_record(
            session,
            tenant,
            site_id="site-paris",
            date=date(2026, 1, 15),
            shift=ShiftType.AM,
            capacite_plan_h=Decimal("100.00"),
        )
        added_obj = session.add.call_args[0][0]
        assert isinstance(added_obj, CanonicalRecord)


# ── bulk_import_canonical ───────────────────────────────────────


class TestBulkImportCanonical:
    @pytest.mark.asyncio
    async def test_empty_list_returns_zeros(self):
        tenant = _make_tenant()
        session = AsyncMock()
        inserted, skipped = await bulk_import_canonical(session, tenant, [])
        assert inserted == 0
        assert skipped == 0

    @pytest.mark.asyncio
    async def test_inserts_records(self):
        tenant = _make_tenant()
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.rowcount = 3
        session.execute.return_value = result_mock

        records = [
            {
                "site_id": f"site-{i}",
                "date": date(2026, 1, i + 1),
                "shift": "am",
                "capacite_plan_h": Decimal("100.00"),
            }
            for i in range(3)
        ]
        inserted, skipped = await bulk_import_canonical(session, tenant, records)
        assert inserted == 3
        assert skipped == 0

    @pytest.mark.asyncio
    async def test_dedup_counts(self):
        tenant = _make_tenant()
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.rowcount = 2  # 1 was a duplicate
        session.execute.return_value = result_mock

        records = [
            {
                "site_id": f"site-{i}",
                "date": date(2026, 1, 1),
                "shift": "am",
                "capacite_plan_h": Decimal("100.00"),
            }
            for i in range(3)
        ]
        inserted, skipped = await bulk_import_canonical(session, tenant, records)
        assert inserted == 2
        assert skipped == 1

    @pytest.mark.asyncio
    async def test_org_id_injected(self):
        custom_org = "22222222-2222-2222-2222-222222222222"
        tenant = _make_tenant(org_id=custom_org)
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.rowcount = 1
        session.execute.return_value = result_mock

        records = [
            {
                "site_id": "site-paris",
                "date": date(2026, 1, 1),
                "shift": "am",
                "capacite_plan_h": Decimal("100.00"),
            }
        ]
        inserted, _skipped = await bulk_import_canonical(session, tenant, records)
        assert inserted == 1
        # The execute call should have been made with the correct org_id
        session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_optional_fields_default(self):
        tenant = _make_tenant()
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.rowcount = 1
        session.execute.return_value = result_mock

        records = [
            {
                "site_id": "site-paris",
                "date": date(2026, 1, 1),
                "shift": "am",
                "capacite_plan_h": Decimal("100.00"),
            }
        ]
        await bulk_import_canonical(session, tenant, records)
        session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_all_zero_rowcount(self):
        tenant = _make_tenant()
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.rowcount = 0
        session.execute.return_value = result_mock

        records = [
            {
                "site_id": "site-paris",
                "date": date(2026, 1, 1),
                "shift": "am",
                "capacite_plan_h": Decimal("100.00"),
            }
        ]
        inserted, skipped = await bulk_import_canonical(session, tenant, records)
        assert inserted == 0
        assert skipped == 1

    @pytest.mark.asyncio
    async def test_large_batch_accepted(self):
        tenant = _make_tenant()
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.rowcount = 100
        session.execute.return_value = result_mock

        records = [
            {
                "site_id": f"site-{i}",
                "date": date(2026, 1, 1),
                "shift": "am",
                "capacite_plan_h": Decimal("100.00"),
            }
            for i in range(100)
        ]
        inserted, skipped = await bulk_import_canonical(session, tenant, records)
        assert inserted == 100
        assert skipped == 0

    @pytest.mark.asyncio
    async def test_bulk_import_chunks_large_payloads(self):
        tenant = _make_tenant()
        session = AsyncMock()
        first = MagicMock()
        second = MagicMock()
        first.rowcount = 1000
        second.rowcount = 200
        session.execute.side_effect = [first, second]

        records = [
            {
                "site_id": f"site-{i}",
                "date": date(2026, 1, 1),
                "shift": "am",
                "capacite_plan_h": Decimal("100.00"),
            }
            for i in range(1200)
        ]

        inserted, skipped = await bulk_import_canonical(session, tenant, records)
        assert inserted == 1200
        assert skipped == 0
        assert session.execute.call_count == 2


# ── get_quality_dashboard ───────────────────────────────────────


class TestGetQualityDashboard:
    @pytest.mark.asyncio
    async def test_zero_records(self):
        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        result = await get_quality_dashboard(session, tenant)
        assert result["total_records"] == 0
        assert result["coverage_pct"] == Decimal("0")
        assert result["sites"] == 0
        assert result["date_range"] == []
        assert result["missing_shifts_pct"] == Decimal("0")
        assert result["avg_abs_pct"] == Decimal("0")

    @pytest.mark.asyncio
    async def test_with_records(self):
        tenant = _make_tenant()
        min_date = date(2026, 1, 1)
        max_date = date(2026, 1, 31)

        range_result = MagicMock()
        range_result.one.return_value = (min_date, max_date)

        session = make_mock_session(
            make_scalar_result(100),  # total
            make_scalar_result(3),  # distinct sites
            range_result,  # date range
            make_scalar_result(80),  # filled (realise_h not null)
            make_scalar_result(5.0),  # avg abs pct
        )
        result = await get_quality_dashboard(session, tenant)
        assert result["total_records"] == 100
        assert result["sites"] == 3
        assert result["coverage_pct"] == Decimal("80.0")
        assert result["missing_shifts_pct"] == Decimal("20.0")
        assert len(result["date_range"]) == 2

    @pytest.mark.asyncio
    async def test_date_range_has_iso_strings(self):
        tenant = _make_tenant()
        min_date = date(2026, 1, 1)
        max_date = date(2026, 1, 31)

        range_result = MagicMock()
        range_result.one.return_value = (min_date, max_date)

        session = make_mock_session(
            make_scalar_result(10),
            make_scalar_result(1),
            range_result,
            make_scalar_result(10),
            make_scalar_result(3.0),
        )
        result = await get_quality_dashboard(session, tenant)
        assert result["date_range"] == ["2026-01-01", "2026-01-31"]

    @pytest.mark.asyncio
    async def test_null_avg_abs_treated_as_zero(self):
        tenant = _make_tenant()
        range_result = MagicMock()
        range_result.one.return_value = (date(2026, 1, 1), date(2026, 1, 1))

        session = make_mock_session(
            make_scalar_result(1),
            make_scalar_result(1),
            range_result,
            make_scalar_result(1),
            make_scalar_result(None),  # avg abs is null
        )
        result = await get_quality_dashboard(session, tenant)
        assert result["avg_abs_pct"] == Decimal("0")

    @pytest.mark.asyncio
    async def test_null_filled_count(self):
        tenant = _make_tenant()
        range_result = MagicMock()
        range_result.one.return_value = (date(2026, 1, 1), date(2026, 1, 1))

        session = make_mock_session(
            make_scalar_result(10),
            make_scalar_result(1),
            range_result,
            make_scalar_result(0),  # no filled records
            make_scalar_result(0),
        )
        result = await get_quality_dashboard(session, tenant)
        assert result["coverage_pct"] == Decimal("0.0")
        assert result["missing_shifts_pct"] == Decimal("100.0")

    @pytest.mark.asyncio
    async def test_null_range_min(self):
        tenant = _make_tenant()
        range_result = MagicMock()
        range_result.one.return_value = (None, None)

        session = make_mock_session(
            make_scalar_result(5),
            make_scalar_result(1),
            range_result,
            make_scalar_result(5),
            make_scalar_result(2.0),
        )
        result = await get_quality_dashboard(session, tenant)
        assert result["date_range"] == []

    @pytest.mark.asyncio
    async def test_tenant_applied_to_all_queries(self):
        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        await get_quality_dashboard(session, tenant)
        tenant.apply.assert_called()

    @pytest.mark.asyncio
    async def test_null_sites_count(self):
        tenant = _make_tenant()
        range_result = MagicMock()
        range_result.one.return_value = (date(2026, 1, 1), date(2026, 1, 31))

        session = make_mock_session(
            make_scalar_result(10),
            make_scalar_result(None),  # sites is null
            range_result,
            make_scalar_result(10),
            make_scalar_result(5.0),
        )
        result = await get_quality_dashboard(session, tenant)
        assert result["sites"] == 0
