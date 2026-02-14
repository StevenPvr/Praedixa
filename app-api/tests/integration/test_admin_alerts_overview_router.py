"""Integration tests for admin_alerts_overview router — 100% coverage.

Tests all three endpoints:
- GET /api/v1/admin/monitoring/alerts/summary
- GET /api/v1/admin/monitoring/alerts/by-org
- GET /api/v1/admin/organizations/{target_org_id}/alerts

Strategy:
- Override get_current_user, get_db_session, get_admin_tenant_filter
  via FastAPI dependency_overrides.
- Mock session.execute to return controlled results for inline queries.
- Use enum instances with .value for severity/status counts.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_admin_tenant_filter,
    get_current_user,
    get_db_session,
    get_db_session_for_cross_org,
)
from app.core.security import TenantFilter
from app.main import app
from app.models.operational import (
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
    ShiftType,
)

# -- Fixed test identifiers ------------------------------------------------
ADMIN_USER_ID = "11111111-aaaa-bbbb-cccc-000000000003"
TARGET_ORG_ID = uuid.UUID("cccccccc-2222-2222-2222-222222222222")
ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")

MONITORING_PREFIX = "/api/v1/admin/monitoring/alerts"
ORG_PREFIX = f"/api/v1/admin/organizations/{TARGET_ORG_ID}"


def _make_admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="admin@test.com",
        organization_id=str(ADMIN_ORG_ID),
        role="super_admin",
    )


def _make_tenant() -> TenantFilter:
    tf = MagicMock(spec=TenantFilter)
    tf.organization_id = str(TARGET_ORG_ID)
    tf.apply = MagicMock(side_effect=lambda q, *a, **kw: q)
    return tf


# -- Fixtures --------------------------------------------------------------


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
async def admin_client(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_db_session_for_cross_org] = _session
    app.dependency_overrides[get_current_user] = _make_admin_jwt
    app.dependency_overrides[get_admin_tenant_filter] = _make_tenant

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# -- Helpers ---------------------------------------------------------------


def _scalar_one_result(value):
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _all_result(rows):
    result = MagicMock()
    result.all.return_value = rows
    return result


def _scalars_all_result(values):
    result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = values
    result.scalars.return_value = scalars_mock
    return result


def _make_coverage_alert(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": TARGET_ORG_ID,
        "site_id": "site-paris",
        "alert_date": date(2026, 1, 18),
        "shift": ShiftType.AM,
        "horizon": Horizon.J3,
        "p_rupture": Decimal("0.6500"),
        "gap_h": Decimal("12.00"),
        "impact_eur": Decimal("420.00"),
        "severity": CoverageAlertSeverity.HIGH,
        "status": CoverageAlertStatus.OPEN,
        "drivers_json": ["Tendance absences"],
        "acknowledged_at": None,
        "resolved_at": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ── 1. alerts_summary ────────────────────────────────────────────────────


class TestAlertsSummary:
    """GET /api/v1/admin/monitoring/alerts/summary"""

    async def test_returns_summary_with_data(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Alert summary with severity and status breakdowns."""
        mock_session.execute.side_effect = [
            # Total count
            _scalar_one_result(50),
            # By severity: list of (enum, count) tuples
            _all_result(
                [
                    (CoverageAlertSeverity.LOW, 10),
                    (CoverageAlertSeverity.MEDIUM, 15),
                    (CoverageAlertSeverity.HIGH, 20),
                    (CoverageAlertSeverity.CRITICAL, 5),
                ]
            ),
            # By status: list of (enum, count) tuples
            _all_result(
                [
                    (CoverageAlertStatus.OPEN, 25),
                    (CoverageAlertStatus.ACKNOWLEDGED, 10),
                    (CoverageAlertStatus.RESOLVED, 12),
                    (CoverageAlertStatus.EXPIRED, 3),
                ]
            ),
        ]

        resp = await admin_client.get(f"{MONITORING_PREFIX}/summary")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        data = body["data"]
        assert data["total"] == 50
        assert data["bySeverity"]["low"] == 10
        assert data["bySeverity"]["medium"] == 15
        assert data["bySeverity"]["high"] == 20
        assert data["bySeverity"]["critical"] == 5
        assert data["byStatus"]["open"] == 25
        assert data["byStatus"]["acknowledged"] == 10
        assert data["byStatus"]["resolved"] == 12
        assert data["byStatus"]["expired"] == 3

    async def test_summary_with_zero_total(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Summary with no alerts returns defaults of 0."""
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _all_result([]),
            _all_result([]),
        ]

        resp = await admin_client.get(f"{MONITORING_PREFIX}/summary")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total"] == 0
        assert data["bySeverity"]["low"] == 0
        assert data["bySeverity"]["critical"] == 0
        assert data["byStatus"]["open"] == 0

    async def test_summary_partial_severity(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Summary with partial severity counts uses defaults."""
        mock_session.execute.side_effect = [
            _scalar_one_result(10),
            _all_result([(CoverageAlertSeverity.HIGH, 10)]),
            _all_result([(CoverageAlertStatus.OPEN, 10)]),
        ]

        resp = await admin_client.get(f"{MONITORING_PREFIX}/summary")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["bySeverity"]["high"] == 10
        assert data["bySeverity"]["low"] == 0
        assert data["bySeverity"]["medium"] == 0
        assert data["bySeverity"]["critical"] == 0


# ── 2. alerts_by_org ─────────────────────────────────────────────────────


class TestAlertsByOrg:
    """GET /api/v1/admin/monitoring/alerts/by-org"""

    async def test_returns_alerts_by_org(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Alerts grouped by org with totals and open counts."""
        org_id_1 = uuid.uuid4()
        org_id_2 = uuid.uuid4()

        mock_session.execute.side_effect = [
            _all_result(
                [
                    (org_id_1, 20, 15),
                    (org_id_2, 10, 3),
                ]
            ),
        ]

        resp = await admin_client.get(f"{MONITORING_PREFIX}/by-org")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        data = body["data"]
        assert data["totalOrgs"] == 2
        assert len(data["orgs"]) == 2
        assert data["orgs"][0]["totalAlerts"] == 20
        assert data["orgs"][0]["openAlerts"] == 15

    async def test_alerts_by_org_empty(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """No orgs with alerts."""
        mock_session.execute.side_effect = [
            _all_result([]),
        ]

        resp = await admin_client.get(f"{MONITORING_PREFIX}/by-org")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["totalOrgs"] == 0
        assert data["orgs"] == []

    async def test_alerts_by_org_pagination(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Alerts by org with pagination params."""
        org_id = uuid.uuid4()

        mock_session.execute.side_effect = [
            _all_result([(org_id, 5, 2)]),
        ]

        resp = await admin_client.get(
            f"{MONITORING_PREFIX}/by-org", params={"page": 2, "page_size": 10}
        )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["totalOrgs"] == 1


# ── 3. org_alerts ────────────────────────────────────────────────────────


class TestOrgAlerts:
    """GET /api/v1/admin/organizations/{target_org_id}/alerts"""

    async def test_returns_paginated_org_alerts(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Returns alerts for a specific org with pagination."""
        alerts = [_make_coverage_alert(), _make_coverage_alert()]

        mock_session.execute.side_effect = [
            _scalar_one_result(2),
            _scalars_all_result(alerts),
        ]

        resp = await admin_client.get(f"{ORG_PREFIX}/alerts")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 2
        assert body["pagination"]["total"] == 2
        assert body["pagination"]["totalPages"] == 1
        assert body["pagination"]["hasNextPage"] is False
        assert body["pagination"]["hasPreviousPage"] is False

    async def test_org_alerts_page2(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Org alerts page 2."""
        alerts = [_make_coverage_alert()]

        mock_session.execute.side_effect = [
            _scalar_one_result(25),
            _scalars_all_result(alerts),
        ]

        resp = await admin_client.get(
            f"{ORG_PREFIX}/alerts", params={"page": 2, "page_size": 20}
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pagination"]["hasPreviousPage"] is True

    async def test_org_alerts_empty(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Empty org alerts."""
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _scalars_all_result([]),
        ]

        resp = await admin_client.get(f"{ORG_PREFIX}/alerts")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["pagination"]["total"] == 0
