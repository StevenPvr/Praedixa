from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any, cast

import pytest

from app.services.gold_live_data import (
    resolve_client_slug_for_org,
    resolve_site_code_for_filter,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import SiteFilter, TenantFilter


class _ScalarResult:
    def __init__(self, value: Any) -> None:
        self._value = value

    def scalar_one_or_none(self) -> Any:
        return self._value


class _SessionStub:
    def __init__(self, *results: _ScalarResult) -> None:
        self._results = list(results)
        self.calls = 0

    async def execute(self, _query: Any) -> _ScalarResult:
        self.calls += 1
        if not self._results:
            raise AssertionError("unexpected execute call")
        return self._results.pop(0)


class _TenantStub:
    def apply(self, query: Any, _model: Any) -> Any:
        return query


class _SiteFilterStub:
    def __init__(self, site_id: str | None = None) -> None:
        self.site_id = site_id


@pytest.mark.asyncio
async def test_resolve_client_slug_for_org_matches_canonical_slug_only() -> None:
    session = _SessionStub(_ScalarResult("acme-logistics"))

    resolved = await resolve_client_slug_for_org(
        cast("AsyncSession", session),
        uuid.uuid4(),
        {"acme-logistics", "other-client"},
    )

    assert resolved == "acme-logistics"
    assert session.calls == 1


@pytest.mark.asyncio
async def test_resolve_client_slug_for_org_rejects_demo_alias_fallbacks() -> None:
    session = _SessionStub(_ScalarResult("praedixa-demo"))

    resolved = await resolve_client_slug_for_org(
        cast("AsyncSession", session),
        uuid.uuid4(),
        {"acme-logistics"},
    )

    assert resolved is None
    assert session.calls == 1


@pytest.mark.asyncio
async def test_resolve_client_slug_for_org_rejects_overlap_shortcuts() -> None:
    session = _SessionStub(_ScalarResult("other-org"))

    resolved = await resolve_client_slug_for_org(
        cast("AsyncSession", session),
        uuid.uuid4(),
        {"acme-logistics"},
        {"acme-logistics": {"LYO"}},
    )

    assert resolved is None
    assert session.calls == 1


@pytest.mark.asyncio
async def test_resolve_site_code_for_filter_returns_allowlisted_persisted_code() -> (
    None
):
    session = _SessionStub(_ScalarResult("S_PARIS"))

    resolved = await resolve_site_code_for_filter(
        session=cast("AsyncSession", session),
        tenant=cast("TenantFilter", _TenantStub()),
        site_filter=cast("SiteFilter", _SiteFilterStub(str(uuid.uuid4()))),
        requested_site=None,
        allowed_site_codes={"cdg", "s_paris"},
    )

    assert resolved == "S_PARIS"
    assert session.calls == 1


@pytest.mark.asyncio
async def test_rejects_persisted_site_code_outside_allowlist() -> None:
    session = _SessionStub(_ScalarResult("S_PARIS"))

    resolved = await resolve_site_code_for_filter(
        session=cast("AsyncSession", session),
        tenant=cast("TenantFilter", _TenantStub()),
        site_filter=cast("SiteFilter", _SiteFilterStub(str(uuid.uuid4()))),
        requested_site=None,
        allowed_site_codes={"CDG"},
    )

    assert resolved is None
    assert session.calls == 1


@pytest.mark.asyncio
async def test_accepts_allowlisted_canonical_raw_site_code() -> None:
    resolved = await resolve_site_code_for_filter(
        session=cast("AsyncSession", _SessionStub()),
        tenant=cast("TenantFilter", _TenantStub()),
        site_filter=cast("SiteFilter", _SiteFilterStub()),
        requested_site=" cdg ",
        allowed_site_codes={"CDG"},
    )

    assert resolved == "CDG"


@pytest.mark.asyncio
async def test_resolve_site_code_for_filter_rejects_raw_code_outside_allowlist() -> (
    None
):
    resolved = await resolve_site_code_for_filter(
        session=cast("AsyncSession", _SessionStub()),
        tenant=cast("TenantFilter", _TenantStub()),
        site_filter=cast("SiteFilter", _SiteFilterStub()),
        requested_site="paris",
        allowed_site_codes={"CDG"},
    )

    assert resolved is None


@pytest.mark.asyncio
async def test_resolve_site_code_for_filter_rejects_missing_allowlist() -> None:
    session = _SessionStub(_ScalarResult("S_PARIS"))

    resolved = await resolve_site_code_for_filter(
        session=cast("AsyncSession", session),
        tenant=cast("TenantFilter", _TenantStub()),
        site_filter=cast("SiteFilter", _SiteFilterStub(str(uuid.uuid4()))),
        requested_site=None,
        allowed_site_codes=None,
    )

    assert resolved is None
    assert session.calls == 0
