"""Integration tests for admin_decisions_enhanced router — 100% coverage.

Tests all three endpoints:
- GET /api/v1/admin/monitoring/decisions/summary
- GET /api/v1/admin/monitoring/decisions/overrides
- GET /api/v1/admin/monitoring/decisions/adoption

Strategy:
- Override get_current_user, get_db_session via dependency_overrides.
- Mock session.execute to return controlled results for inline queries.
- These endpoints do NOT use get_admin_tenant_filter (no target_org_id).
"""

import uuid
from collections.abc import AsyncGenerator
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.main import app

# -- Fixed test identifiers ------------------------------------------------
ADMIN_USER_ID = "11111111-aaaa-bbbb-cccc-000000000002"
ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")

PREFIX = "/api/v1/admin/monitoring/decisions"


def _make_admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="admin@test.com",
        organization_id=str(ADMIN_ORG_ID),
        role="super_admin",
    )


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
    app.dependency_overrides[get_current_user] = _make_admin_jwt

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# -- Helpers ---------------------------------------------------------------


def _scalar_one_result(value):
    """Mock execute result where scalar_one() returns value."""
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _all_result(rows):
    """Mock execute result where .all() returns rows."""
    result = MagicMock()
    result.all.return_value = rows
    return result


# ── 1. decisions_summary ─────────────────────────────────────────────────


class TestDecisionsSummary:
    """GET /api/v1/admin/monitoring/decisions/summary"""

    async def test_returns_summary_with_data(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Summary with non-zero totals and override rate."""
        # Endpoint executes 3 scalar queries: total, override_count, observed
        mock_session.execute.side_effect = [
            _scalar_one_result(100),  # total
            _scalar_one_result(15),  # override_count
            _scalar_one_result(80),  # observed
        ]

        resp = await admin_client.get(f"{PREFIX}/summary")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        data = body["data"]
        assert data["totalDecisions"] == 100
        assert data["overrideCount"] == 15
        assert data["overrideRatePct"] == 15.0
        assert data["withObservedOutcomes"] == 80

    async def test_returns_summary_with_zero_total(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Summary with zero total returns 0% override rate."""
        mock_session.execute.side_effect = [
            _scalar_one_result(0),  # total
            _scalar_one_result(0),  # override_count
            _scalar_one_result(0),  # observed
        ]

        resp = await admin_client.get(f"{PREFIX}/summary")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["totalDecisions"] == 0
        assert data["overrideRatePct"] == 0.0


# ── 2. decisions_overrides ───────────────────────────────────────────────


class TestDecisionsOverrides:
    """GET /api/v1/admin/monitoring/decisions/overrides"""

    async def test_returns_overrides_with_data(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Override analysis with cost delta and reasons."""
        mock_session.execute.side_effect = [
            _scalar_one_result(100),  # total
            _scalar_one_result(20),  # override_count
            _scalar_one_result(Decimal("150.50")),  # avg_delta_raw
            _all_result([("Urgence client", 10), ("Stock bas", 5)]),  # reasons
        ]

        resp = await admin_client.get(f"{PREFIX}/overrides")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        data = body["data"]
        assert data["totalOverrides"] == 20
        assert data["overrideRatePct"] == 20.0
        assert data["avgCostDelta"] == 150.5
        assert len(data["topReasons"]) == 2
        assert data["topReasons"][0]["reason"] == "Urgence client"
        assert data["topReasons"][0]["count"] == 10

    async def test_returns_overrides_with_zero_total(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Override analysis with zero total."""
        mock_session.execute.side_effect = [
            _scalar_one_result(0),  # total
            _scalar_one_result(0),  # override_count
            _scalar_one_result(None),  # avg_delta_raw (no data)
            _all_result([]),  # reasons
        ]

        resp = await admin_client.get(f"{PREFIX}/overrides")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["totalOverrides"] == 0
        assert data["overrideRatePct"] == 0.0
        assert data["avgCostDelta"] is None
        assert data["topReasons"] == []

    async def test_overrides_null_avg_delta(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Override analysis with non-zero total but null avg delta."""
        mock_session.execute.side_effect = [
            _scalar_one_result(50),
            _scalar_one_result(10),
            _scalar_one_result(None),  # null avg delta
            _all_result([]),
        ]

        resp = await admin_client.get(f"{PREFIX}/overrides")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["avgCostDelta"] is None


# ── 3. decisions_adoption ────────────────────────────────────────────────


class TestDecisionsAdoption:
    """GET /api/v1/admin/monitoring/decisions/adoption"""

    async def test_returns_adoption_with_data(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Adoption metrics with per-org data."""
        org_id_1 = uuid.uuid4()
        org_id_2 = uuid.uuid4()

        mock_session.execute.side_effect = [
            # Per-org adoption query
            _all_result(
                [
                    (org_id_1, Decimal("0.9200")),
                    (org_id_2, Decimal("0.8500")),
                ]
            ),
            # Per-org decisions query
            _all_result(
                [
                    (org_id_1, 60, 9),
                    (org_id_2, 40, 6),
                ]
            ),
            # Overall proof average
            _scalar_one_result(Decimal("0.8850")),
            # Overall decisions
            _scalar_one_result(100),
            # Overall overrides
            _scalar_one_result(15),
        ]

        resp = await admin_client.get(f"{PREFIX}/adoption")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        data = body["data"]
        assert data["orgsWithData"] == 2
        assert data["avgAdoptionPct"] == 88.5
        assert data["overallAdoptionPct"] == 85.0
        assert data["totalDecisions"] == 100
        assert data["adoptedCount"] == 85
        assert data["overriddenCount"] == 15
        assert len(data["orgs"]) == 2
        assert data["orgs"][0]["avgAdoptionPct"] == 92.0
        assert data["orgs"][0]["totalDecisions"] == 60

    async def test_adoption_empty(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Adoption metrics with no data."""
        mock_session.execute.side_effect = [
            _all_result([]),  # no org data
            _all_result([]),  # no org decisions
            _scalar_one_result(None),  # no overall average
            _scalar_one_result(0),  # no decisions
            _scalar_one_result(0),  # no overrides
        ]

        resp = await admin_client.get(f"{PREFIX}/adoption")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["orgsWithData"] == 0
        assert data["avgAdoptionPct"] is None
        assert data["overallAdoptionPct"] == 0.0
        assert data["totalDecisions"] == 0
        assert data["adoptedCount"] == 0
        assert data["overriddenCount"] == 0
        assert data["orgs"] == []

    async def test_adoption_with_null_per_org(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Adoption metrics with null per-org value."""
        org_id = uuid.uuid4()

        mock_session.execute.side_effect = [
            _all_result([(org_id, None)]),
            _all_result([(org_id, 5, 2)]),
            _scalar_one_result(None),
            _scalar_one_result(5),
            _scalar_one_result(2),
        ]

        resp = await admin_client.get(f"{PREFIX}/adoption")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["orgsWithData"] == 1
        assert data["orgs"][0]["avgAdoptionPct"] is None
        assert data["orgs"][0]["totalDecisions"] == 5
