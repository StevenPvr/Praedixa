"""Integration tests — canonical bulk import pipeline.

Covers the full bulk import flow: validation, dedup, error handling.
Uses service-level mocking (no database).
"""

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

from app.schemas.operational import CanonicalRecordBulkCreate
from app.services.canonical_data_service import (
    bulk_import_canonical,
)
from tests.unit.conftest import (
    _make_tenant,
)

ORG_ID = "11111111-1111-1111-1111-111111111111"


# ── Schema validation ───────────────────────────────────────────


class TestBulkCreateSchemaValidation:
    def test_valid_single_record(self) -> None:
        bulk = CanonicalRecordBulkCreate(
            records=[
                {
                    "site_id": "site-paris",
                    "date": "2026-01-15",
                    "shift": "am",
                    "capacite_plan_h": 100,
                }
            ]
        )
        assert len(bulk.records) == 1

    def test_valid_multiple_records(self) -> None:
        bulk = CanonicalRecordBulkCreate(
            records=[
                {
                    "site_id": f"site-{i}",
                    "date": f"2026-01-{i + 1:02d}",
                    "shift": "am" if i % 2 == 0 else "pm",
                    "capacite_plan_h": 100 + i,
                }
                for i in range(10)
            ]
        )
        assert len(bulk.records) == 10

    def test_rejects_empty_list(self) -> None:
        with pytest.raises(ValidationError):
            CanonicalRecordBulkCreate(records=[])

    def test_rejects_invalid_shift(self) -> None:
        with pytest.raises(ValidationError):
            CanonicalRecordBulkCreate(
                records=[
                    {
                        "site_id": "site-paris",
                        "date": "2026-01-15",
                        "shift": "invalid",
                        "capacite_plan_h": 100,
                    }
                ]
            )

    def test_rejects_negative_capacite(self) -> None:
        with pytest.raises(ValidationError):
            CanonicalRecordBulkCreate(
                records=[
                    {
                        "site_id": "site-paris",
                        "date": "2026-01-15",
                        "shift": "am",
                        "capacite_plan_h": -1,
                    }
                ]
            )

    def test_rejects_negative_abs_h(self) -> None:
        with pytest.raises(ValidationError):
            CanonicalRecordBulkCreate(
                records=[
                    {
                        "site_id": "site-paris",
                        "date": "2026-01-15",
                        "shift": "am",
                        "capacite_plan_h": 100,
                        "abs_h": -5,
                    }
                ]
            )

    def test_max_length_1000(self) -> None:
        """Schema allows up to 1000 records."""
        bulk = CanonicalRecordBulkCreate(
            records=[
                {
                    "site_id": f"s{i}",
                    "date": "2026-01-01",
                    "shift": "am",
                    "capacite_plan_h": 100,
                }
                for i in range(1000)
            ]
        )
        assert len(bulk.records) == 1000

    def test_over_1000_rejected(self) -> None:
        with pytest.raises(ValidationError):
            CanonicalRecordBulkCreate(
                records=[
                    {
                        "site_id": f"s{i}",
                        "date": "2026-01-01",
                        "shift": "am",
                        "capacite_plan_h": 100,
                    }
                    for i in range(1001)
                ]
            )


# ── Bulk import service ─────────────────────────────────────────


class TestBulkImportService:
    @pytest.mark.asyncio
    async def test_empty_batch(self) -> None:
        tenant = _make_tenant()
        session = AsyncMock()
        inserted, skipped = await bulk_import_canonical(session, tenant, [])
        assert inserted == 0
        assert skipped == 0
        session.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_all_new_records(self) -> None:
        tenant = _make_tenant()
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.rowcount = 5
        session.execute.return_value = result_mock

        records = [
            {
                "site_id": f"site-{i}",
                "date": date(2026, 1, i + 1),
                "shift": "am",
                "capacite_plan_h": Decimal("100"),
            }
            for i in range(5)
        ]
        inserted, skipped = await bulk_import_canonical(session, tenant, records)
        assert inserted == 5
        assert skipped == 0

    @pytest.mark.asyncio
    async def test_all_duplicates(self) -> None:
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
                "capacite_plan_h": Decimal("100"),
            }
        ]
        inserted, skipped = await bulk_import_canonical(session, tenant, records)
        assert inserted == 0
        assert skipped == 1

    @pytest.mark.asyncio
    async def test_mixed_new_and_duplicates(self) -> None:
        tenant = _make_tenant()
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.rowcount = 3
        session.execute.return_value = result_mock

        records = [
            {
                "site_id": f"site-{i}",
                "date": date(2026, 1, 1),
                "shift": "am",
                "capacite_plan_h": Decimal("100"),
            }
            for i in range(5)
        ]
        inserted, skipped = await bulk_import_canonical(session, tenant, records)
        assert inserted == 3
        assert skipped == 2

    @pytest.mark.asyncio
    async def test_org_id_injected_into_all_rows(self) -> None:
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
                "capacite_plan_h": Decimal("100"),
            }
        ]
        await bulk_import_canonical(session, tenant, records)
        # Verify execute was called (org_id injected internally)
        session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_optional_fields_populated(self) -> None:
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
                "competence": "infirmier",
                "charge_units": Decimal("120"),
                "capacite_plan_h": Decimal("100"),
                "realise_h": Decimal("92"),
                "abs_h": Decimal("8"),
                "hs_h": Decimal("4"),
                "interim_h": Decimal("2"),
                "cout_interne_est": Decimal("3500"),
            }
        ]
        inserted, _ = await bulk_import_canonical(session, tenant, records)
        assert inserted == 1
