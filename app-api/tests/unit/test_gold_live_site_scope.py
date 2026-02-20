"""Tests for site scope normalization against Gold medallion site codes."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.security import SiteFilter, TenantFilter
from app.services.gold_live_data import resolve_site_code_for_filter

TEST_ORG_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_SITE_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


@pytest.mark.asyncio
async def test_resolve_site_code_maps_internal_prefix_code_to_gold_alias() -> None:
    session = AsyncMock()
    execute_result = MagicMock()
    execute_result.one_or_none.return_value = ("S_LYON", "Lyon Logistics")
    session.execute.return_value = execute_result

    resolved = await resolve_site_code_for_filter(
        session=session,
        tenant=TenantFilter(TEST_ORG_ID),
        site_filter=SiteFilter(TEST_SITE_UUID),
        requested_site=None,
        allowed_site_codes={"LYO", "MRS", "CDG"},
    )

    assert resolved == "LYO"


@pytest.mark.asyncio
async def test_resolve_site_code_keeps_requested_alias_when_no_uuid() -> None:
    session = AsyncMock()

    resolved = await resolve_site_code_for_filter(
        session=session,
        tenant=TenantFilter(TEST_ORG_ID),
        site_filter=SiteFilter(None),
        requested_site="s_marseille",
        allowed_site_codes={"LYO", "MRS", "CDG"},
    )

    assert resolved == "MRS"
