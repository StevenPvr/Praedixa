"""Integration tests for admin_cost_params router.

Covers:
- GET /api/v1/admin/monitoring/cost-params/missing — orgs without cost config

Strategy:
- Override get_current_user and get_db_session via dependency_overrides
- Mock session.execute for the two queries (all_orgs, orgs_with_config)
- Patch log_admin_action to avoid real DB writes
"""

import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.main import app

ORG_A_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
ORG_B_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
ORG_C_ID = uuid.UUID("cccccccc-0000-0000-0000-000000000003")
ADMIN_USER_ID = "sa-cost-001"


def _admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="admin@test.com",
        organization_id=str(ORG_A_ID),
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


class TestCostParamsMissing:
    """GET /api/v1/admin/monitoring/cost-params/missing"""

    async def test_some_orgs_missing_config(self, admin_client: AsyncClient) -> None:
        """Returns orgs without cost parameters."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        # Query 1: all active orgs
        all_orgs_result = MagicMock()
        all_orgs_result.all.return_value = [
            (ORG_A_ID, "Org Alpha"),
            (ORG_B_ID, "Org Beta"),
            (ORG_C_ID, "Org Gamma"),
        ]

        # Query 2: orgs with at least one cost parameter
        orgs_with_result = MagicMock()
        orgs_with_result.all.return_value = [
            (ORG_A_ID,),
        ]

        session.execute = AsyncMock(side_effect=[all_orgs_result, orgs_with_result])

        with patch(
            "app.routers.admin_cost_params.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get(
                "/api/v1/admin/monitoring/cost-params/missing"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["totalOrgsWithMissing"] == 2
        assert data["data"]["totalMissingParams"] == 16
        assert data["data"]["totalOrgs"] == 3
        assert data["data"]["orgsWithConfig"] == 1
        assert data["data"]["orgsWithoutConfig"] == 2
        missing_ids = {m["organizationId"] for m in data["data"]["missing"]}
        assert str(ORG_B_ID) in missing_ids
        assert str(ORG_C_ID) in missing_ids
        assert data["data"]["orgs"][0]["totalMissing"] == 8

    async def test_all_orgs_have_config(self, admin_client: AsyncClient) -> None:
        """Returns empty missing list when all orgs have cost params."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        all_orgs_result = MagicMock()
        all_orgs_result.all.return_value = [
            (ORG_A_ID, "Org Alpha"),
        ]

        orgs_with_result = MagicMock()
        orgs_with_result.all.return_value = [
            (ORG_A_ID,),
        ]

        session.execute = AsyncMock(side_effect=[all_orgs_result, orgs_with_result])

        with patch(
            "app.routers.admin_cost_params.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get(
                "/api/v1/admin/monitoring/cost-params/missing"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["totalOrgsWithMissing"] == 0
        assert data["data"]["totalMissingParams"] == 0
        assert data["data"]["totalOrgs"] == 1
        assert data["data"]["orgsWithConfig"] == 1
        assert data["data"]["orgsWithoutConfig"] == 0
        assert data["data"]["missing"] == []

    async def test_no_active_orgs(self, admin_client: AsyncClient) -> None:
        """Returns zeros when no active orgs exist."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        all_orgs_result = MagicMock()
        all_orgs_result.all.return_value = []

        orgs_with_result = MagicMock()
        orgs_with_result.all.return_value = []

        session.execute = AsyncMock(side_effect=[all_orgs_result, orgs_with_result])

        with patch(
            "app.routers.admin_cost_params.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get(
                "/api/v1/admin/monitoring/cost-params/missing"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["totalOrgsWithMissing"] == 0
        assert data["data"]["totalMissingParams"] == 0
        assert data["data"]["totalOrgs"] == 0
        assert data["data"]["orgsWithConfig"] == 0
        assert data["data"]["orgsWithoutConfig"] == 0
        assert data["data"]["missing"] == []
