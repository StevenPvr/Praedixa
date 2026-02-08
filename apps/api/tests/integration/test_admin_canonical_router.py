"""Integration tests for admin_canonical router.

Covers:
- GET /api/v1/admin/organizations/{target_org_id}/canonical/quality
- GET /api/v1/admin/monitoring/canonical-coverage

Strategy:
- Override get_current_user and get_db_session via dependency_overrides
- Override get_admin_tenant_filter for per-org endpoints
- Patch service-level functions (get_quality_dashboard, log_admin_action)
- Patch session.execute for direct DB queries (canonical-coverage)
"""

import uuid
from collections.abc import AsyncGenerator
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_admin_tenant_filter,
    get_current_user,
    get_db_session,
)
from app.core.security import TenantFilter
from app.main import app

TARGET_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
OTHER_ORG_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
ADMIN_USER_ID = "sa-canonical-001"


def _admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="admin@test.com",
        organization_id=str(TARGET_ORG_ID),
        role="super_admin",
    )


@pytest.fixture
async def admin_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client authenticated as super_admin."""
    mock_session = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    mock_session.flush = AsyncMock()
    mock_session.add = MagicMock()

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = _admin_jwt

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac._mock_session = mock_session  # type: ignore[attr-defined]
        yield ac

    app.dependency_overrides.clear()


class TestOrgCanonicalQuality:
    """GET /api/v1/admin/organizations/{target_org_id}/canonical/quality"""

    async def test_returns_quality_dashboard(self, admin_client: AsyncClient) -> None:
        """Returns quality metrics for org canonical data."""
        app.dependency_overrides[get_admin_tenant_filter] = lambda: TenantFilter(
            str(TARGET_ORG_ID)
        )

        dashboard_data = {
            "total_records": 100,
            "coverage_pct": Decimal("85.50"),
            "sites": 5,
            "date_range": ["2026-01-01", "2026-01-31"],
            "missing_shifts_pct": Decimal("14.50"),
            "avg_abs_pct": Decimal("8.20"),
        }

        with (
            patch(
                "app.routers.admin_canonical.get_quality_dashboard",
                new_callable=AsyncMock,
                return_value=dashboard_data,
            ),
            patch(
                "app.routers.admin_canonical.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical/quality"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["totalRecords"] == 100
        assert float(data["data"]["coveragePct"]) == pytest.approx(85.50)
        assert data["data"]["sites"] == 5
        assert len(data["data"]["dateRange"]) == 2

    async def test_returns_empty_dashboard(self, admin_client: AsyncClient) -> None:
        """Returns zero-valued dashboard when no data exists."""
        app.dependency_overrides[get_admin_tenant_filter] = lambda: TenantFilter(
            str(TARGET_ORG_ID)
        )

        dashboard_data = {
            "total_records": 0,
            "coverage_pct": Decimal("0"),
            "sites": 0,
            "date_range": [],
            "missing_shifts_pct": Decimal("0"),
            "avg_abs_pct": Decimal("0"),
        }

        with (
            patch(
                "app.routers.admin_canonical.get_quality_dashboard",
                new_callable=AsyncMock,
                return_value=dashboard_data,
            ),
            patch(
                "app.routers.admin_canonical.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical/quality"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["totalRecords"] == 0
        assert data["data"]["dateRange"] == []


class TestCanonicalCoverage:
    """GET /api/v1/admin/monitoring/canonical-coverage"""

    async def test_returns_coverage_with_orgs(self, admin_client: AsyncClient) -> None:
        """Returns per-org coverage stats."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        org_rows = MagicMock()
        org_rows.all.return_value = [
            (TARGET_ORG_ID, 100, 5),
            (OTHER_ORG_ID, 50, 3),
        ]

        session.execute = AsyncMock(return_value=org_rows)

        with patch(
            "app.routers.admin_canonical.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get("/api/v1/admin/monitoring/canonical-coverage")

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["totalOrgsWithData"] == 2
        assert len(data["data"]["orgs"]) == 2
        assert data["data"]["orgs"][0]["totalRecords"] == 100
        assert data["data"]["orgs"][0]["distinctSites"] == 5

    async def test_returns_empty_coverage(self, admin_client: AsyncClient) -> None:
        """Returns empty list when no canonical data exists."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        org_rows = MagicMock()
        org_rows.all.return_value = []

        session.execute = AsyncMock(return_value=org_rows)

        with patch(
            "app.routers.admin_canonical.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get("/api/v1/admin/monitoring/canonical-coverage")

        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["totalOrgsWithData"] == 0
        assert data["data"]["orgs"] == []
