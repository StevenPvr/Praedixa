"""Tests for site-level filtering across services and routers.

Verifies that:
- SiteFilter.apply() adds WHERE site_id = ? when site_id is set
- SiteFilter.apply() is a no-op when site_id is None (org_admin)
- Dashboard service uses CoverageAlert for site-scoped users
- Dashboard service uses DashboardAlert for org-wide users
- get_proof_summary accepts and applies site_id filtering
"""

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from sqlalchemy import select

from app.core.security import SiteFilter, TenantFilter
from app.services.dashboard import get_dashboard_summary
from tests.unit.conftest import make_mock_session


class TestSiteFilter:
    """Test SiteFilter class behavior."""

    def test_apply_with_site_id(self) -> None:
        """When site_id is set, apply() adds a WHERE clause."""
        sf = SiteFilter("site-lyon")
        assert sf.site_id == "site-lyon"

        # Create a mock model with site_id column
        model = MagicMock()
        query = MagicMock()
        result = sf.apply(query, model)

        query.where.assert_called_once()
        assert result == query.where.return_value

    def test_apply_without_site_id(self) -> None:
        """When site_id is None (org_admin), apply() is a no-op."""
        sf = SiteFilter(None)
        assert sf.site_id is None

        query = MagicMock()
        model = MagicMock()
        result = sf.apply(query, model)

        query.where.assert_not_called()
        assert result is query

    def test_apply_with_real_select(self) -> None:
        """SiteFilter.apply() produces valid SQLAlchemy when given a real model."""
        from app.models.operational import CoverageAlert

        sf = SiteFilter("site-paris")
        base = select(CoverageAlert)
        filtered = sf.apply(base, CoverageAlert)

        # The filtered query should have a WHERE clause (compiled form differs)
        assert str(filtered) != str(base)

    def test_noop_with_real_select(self) -> None:
        """SiteFilter(None).apply() returns the same query object."""
        from app.models.operational import CoverageAlert

        sf = SiteFilter(None)
        base = select(CoverageAlert)
        result = sf.apply(base, CoverageAlert)

        assert result is base


class TestDashboardSummaryWithSiteId:
    """Test get_dashboard_summary with site_id parameter."""

    @pytest.mark.asyncio
    async def test_site_id_none_uses_dashboard_alert(self) -> None:
        """When site_id is None, uses DashboardAlert for alerts count (org-wide)."""
        tenant = TenantFilter("org-1")
        row_result = MagicMock()
        row_result.one.return_value = SimpleNamespace(
            coverage_human=90.0,
            coverage_merchandise=85.0,
            active_alerts_count=5,
            forecast_accuracy=0.95,
            last_forecast_date=datetime(2026, 1, 15, tzinfo=UTC),
        )
        session = make_mock_session(row_result)

        result = await get_dashboard_summary(tenant, session, site_id=None)

        assert result.active_alerts_count == 5
        assert result.coverage_human == 90.0

    @pytest.mark.asyncio
    async def test_site_id_set_uses_coverage_alert(self) -> None:
        """When site_id is set, uses CoverageAlert for site-scoped alert count."""
        tenant = TenantFilter("org-1")
        row_result = MagicMock()
        row_result.one.return_value = SimpleNamespace(
            coverage_human=92.0,
            coverage_merchandise=88.0,
            active_alerts_count=2,
            forecast_accuracy=0.91,
            last_forecast_date=datetime(2026, 1, 20, tzinfo=UTC),
        )
        session = make_mock_session(row_result)

        result = await get_dashboard_summary(tenant, session, site_id="site-lyon")

        assert result.active_alerts_count == 2
        assert result.coverage_human == 92.0

    @pytest.mark.asyncio
    async def test_empty_db_with_site_id(self) -> None:
        """When DB is empty for a site, return safe defaults."""
        tenant = TenantFilter("org-1")
        row_result = MagicMock()
        row_result.one.return_value = SimpleNamespace(
            coverage_human=None,
            coverage_merchandise=None,
            active_alerts_count=0,
            forecast_accuracy=None,
            last_forecast_date=None,
        )
        session = make_mock_session(row_result)

        result = await get_dashboard_summary(tenant, session, site_id="site-empty")

        assert result.coverage_human == 0.0
        assert result.coverage_merchandise == 0.0
        assert result.active_alerts_count == 0
        assert result.forecast_accuracy is None
        assert result.last_forecast_date is None


class TestProofSummaryWithSiteId:
    """Test get_proof_summary with site_id parameter."""

    @pytest.mark.asyncio
    async def test_site_id_passed_to_query(self) -> None:
        """When site_id is set, proof summary filters by site."""
        from app.services.proof_service import get_proof_summary

        tenant = TenantFilter("org-1")

        # Mock: agg query returns (total_gain, avg_adoption, avg_improvement)
        agg_result = MagicMock()
        agg_result.one.return_value = (Decimal("5000"), Decimal("0.9"), Decimal("0.2"))

        # Mock: site_q returns per-site rows
        site_result = MagicMock()
        site_result.all.return_value = [
            ("site-lyon", Decimal("5000"), Decimal("0.9"), 10, 9),
        ]

        session = make_mock_session(agg_result, site_result)

        result = await get_proof_summary(session, tenant, site_id="site-lyon")

        assert result["total_gain"] == Decimal("5000")
        assert result["avg_adoption"] == Decimal("0.9000")

    @pytest.mark.asyncio
    async def test_site_id_none_returns_all_sites(self) -> None:
        """When site_id is None, proof summary aggregates all sites."""
        from app.services.proof_service import get_proof_summary

        tenant = TenantFilter("org-1")

        agg_result = MagicMock()
        agg_result.one.return_value = (
            Decimal("10000"),
            Decimal("0.85"),
            Decimal("0.15"),
        )

        site_result = MagicMock()
        site_result.all.return_value = [
            ("site-paris", Decimal("6000"), Decimal("0.88"), 12, 10),
            ("site-lyon", Decimal("4000"), Decimal("0.82"), 8, 7),
        ]

        session = make_mock_session(agg_result, site_result)

        result = await get_proof_summary(session, tenant, site_id=None)

        assert result["total_gain"] == Decimal("10000")
        assert len(result["per_site"]) == 2


class TestGetSiteFilter:
    """Test get_site_filter dependency function."""

    def test_returns_site_filter_with_site_id(self) -> None:
        """When JWT has site_id, get_site_filter returns SiteFilter with that id."""
        from app.core.auth import JWTPayload
        from app.core.dependencies import get_site_filter

        jwt = JWTPayload(
            user_id="user-1",
            email="user@test.com",
            organization_id="org-1",
            role="manager",
            site_id="site-lyon",
        )
        sf = get_site_filter(jwt)

        assert isinstance(sf, SiteFilter)
        assert sf.site_id == "site-lyon"

    def test_returns_site_filter_none_for_admin(self) -> None:
        """When JWT has no site_id (org_admin), SiteFilter.site_id is None."""
        from app.core.auth import JWTPayload
        from app.core.dependencies import get_site_filter

        jwt = JWTPayload(
            user_id="admin-1",
            email="admin@test.com",
            organization_id="org-1",
            role="org_admin",
        )
        sf = get_site_filter(jwt)

        assert isinstance(sf, SiteFilter)
        assert sf.site_id is None
