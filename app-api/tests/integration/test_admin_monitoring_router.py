"""Integration tests for admin_monitoring router (ROI by org endpoint)."""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.main import app

ADMIN_USER_ID = "11111111-aaaa-bbbb-cccc-000000000010"
ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")


def _admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="admin@test.com",
        organization_id=str(ADMIN_ORG_ID),
        role="super_admin",
    )


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
    app.dependency_overrides[get_current_user] = _admin_jwt

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


def _all_result(rows: list[tuple[object, ...]]) -> MagicMock:
    result = MagicMock()
    result.all.return_value = rows
    return result


class TestRoiByOrg:
    """GET /api/v1/admin/monitoring/roi/by-org"""

    async def test_returns_roi_rows(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        org_1 = uuid.uuid4()
        org_2 = uuid.uuid4()
        last_failure = datetime(2026, 2, 1, 9, 30, tzinfo=UTC)

        mock_session.execute.side_effect = [
            _all_result([(org_1, "Acme"), (org_2, "Beta")]),  # orgs
            _all_result([(org_1, 2, Decimal("1234.50"), Decimal("0.8200"))]),  # proof
            _all_result([(org_1, 10, 2), (org_2, 5, 5)]),  # decisions
            _all_result([(org_1, 3)]),  # alerts
            _all_result([(org_2, 4, last_failure)]),  # ingestion failures
        ]

        resp = await admin_client.get("/api/v1/admin/monitoring/roi/by-org")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True

        data = body["data"]
        assert data["totalOrgs"] == 2
        assert len(data["rows"]) == 2

        acme = data["rows"][0]
        assert acme["organizationName"] == "Acme"
        assert acme["proofRecords"] == 2
        assert acme["totalGainNetEur"] == 1234.5
        assert acme["avgProofAdoptionPct"] == 82.0
        assert acme["totalDecisions"] == 10
        assert acme["adoptedCount"] == 8
        assert acme["overriddenCount"] == 2
        assert acme["decisionAdoptionPct"] == 80.0
        assert acme["activeAlerts"] == 3
        assert acme["failedIngestions"] == 0
        assert acme["lastIngestionFailureAt"] is None

        beta = data["rows"][1]
        assert beta["organizationName"] == "Beta"
        assert beta["proofRecords"] == 0
        assert beta["totalGainNetEur"] == 0.0
        assert beta["avgProofAdoptionPct"] is None
        assert beta["totalDecisions"] == 5
        assert beta["adoptedCount"] == 0
        assert beta["overriddenCount"] == 5
        assert beta["decisionAdoptionPct"] == 0.0
        assert beta["activeAlerts"] == 0
        assert beta["failedIngestions"] == 4
        assert beta["lastIngestionFailureAt"] == "2026-02-01T09:30:00Z"

    async def test_returns_empty_when_no_orgs(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        mock_session.execute.side_effect = [
            _all_result([]),
            _all_result([]),
            _all_result([]),
            _all_result([]),
            _all_result([]),
        ]

        resp = await admin_client.get("/api/v1/admin/monitoring/roi/by-org")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["totalOrgs"] == 0
        assert data["rows"] == []
