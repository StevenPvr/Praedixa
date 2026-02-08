"""Integration tests for admin_proof_packs router.

Covers:
- GET /api/v1/admin/monitoring/proof-packs/summary — cross-org proof summary
- GET /api/v1/admin/organizations/{target_org_id}/proof-packs — per-org packs

Strategy:
- Override get_current_user and get_db_session via dependency_overrides
  (require_role uses get_current_user internally, so overriding that is enough)
- Override get_admin_tenant_filter for per-org endpoints
- Mock session.execute to return pre-built query results
- Patch log_admin_action to avoid DB writes
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_admin_tenant_filter, get_current_user, get_db_session
from app.core.security import TenantFilter
from app.main import app

# Fixed identifiers
TARGET_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
ADMIN_USER_ID = "sa-proof-001"


def _admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="admin@test.com",
        organization_id=str(TARGET_ORG_ID),
        role="super_admin",
    )


def _make_proof_record(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": TARGET_ORG_ID,
        "site_id": "site-paris",
        "month": date(2026, 1, 1),
        "cout_bau_eur": Decimal("4800.00"),
        "cout_100_eur": Decimal("2100.00"),
        "cout_reel_eur": Decimal("2500.00"),
        "gain_net_eur": Decimal("2300.00"),
        "service_bau_pct": Decimal("0.6000"),
        "service_reel_pct": Decimal("0.8500"),
        "adoption_pct": Decimal("0.9000"),
        "alertes_emises": 10,
        "alertes_traitees": 9,
        "details_json": {"total_gap_h": "120"},
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


@pytest.fixture
async def admin_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client authenticated as super_admin with mocked dependencies."""
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


class TestProofPacksSummary:
    """GET /api/v1/admin/monitoring/proof-packs/summary"""

    async def test_summary_with_data(self, admin_client: AsyncClient) -> None:
        """Returns aggregated cross-org proof summary."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        org_id = TARGET_ORG_ID

        # Mock execute calls:
        # 1. total count
        total_result = MagicMock()
        total_result.scalar_one.return_value = 5

        # 2. total gain
        gain_result = MagicMock()
        gain_result.scalar_one.return_value = Decimal("12000.00")

        # 3. avg adoption
        adoption_result = MagicMock()
        adoption_result.scalar_one.return_value = Decimal("0.85")

        # 4. per-org breakdown
        org_result = MagicMock()
        org_result.all.return_value = [
            (org_id, 5, Decimal("12000.00"), Decimal("0.85")),
        ]

        session.execute = AsyncMock(
            side_effect=[total_result, gain_result, adoption_result, org_result]
        )

        with patch(
            "app.routers.admin_proof_packs.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get(
                "/api/v1/admin/monitoring/proof-packs/summary"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["totalProofRecords"] == 5
        assert data["data"]["totalGainNetEur"] == 12000.0
        assert data["data"]["avgAdoptionPct"] == 85.0
        assert data["data"]["orgsWithProof"] == 1
        assert len(data["data"]["orgs"]) == 1

    async def test_summary_empty(self, admin_client: AsyncClient) -> None:
        """Returns zeros when no proof records exist."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        total_result = MagicMock()
        total_result.scalar_one.return_value = 0

        gain_result = MagicMock()
        gain_result.scalar_one.return_value = 0

        adoption_result = MagicMock()
        adoption_result.scalar_one.return_value = None

        org_result = MagicMock()
        org_result.all.return_value = []

        session.execute = AsyncMock(
            side_effect=[total_result, gain_result, adoption_result, org_result]
        )

        with patch(
            "app.routers.admin_proof_packs.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get(
                "/api/v1/admin/monitoring/proof-packs/summary"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["totalProofRecords"] == 0
        assert data["data"]["avgAdoptionPct"] is None
        assert data["data"]["orgsWithProof"] == 0

    async def test_summary_org_with_null_adoption(
        self, admin_client: AsyncClient
    ) -> None:
        """Per-org row with None adoption_pct is handled."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        org_id = TARGET_ORG_ID

        total_result = MagicMock()
        total_result.scalar_one.return_value = 3

        gain_result = MagicMock()
        gain_result.scalar_one.return_value = Decimal("5000.00")

        adoption_result = MagicMock()
        adoption_result.scalar_one.return_value = None

        org_result = MagicMock()
        org_result.all.return_value = [
            (org_id, 3, Decimal("5000.00"), None),
        ]

        session.execute = AsyncMock(
            side_effect=[total_result, gain_result, adoption_result, org_result]
        )

        with patch(
            "app.routers.admin_proof_packs.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get(
                "/api/v1/admin/monitoring/proof-packs/summary"
            )

        assert resp.status_code == 200
        data = resp.json()
        org_stat = data["data"]["orgs"][0]
        assert org_stat["avgAdoptionPct"] is None


class TestOrgProofPacks:
    """GET /api/v1/admin/organizations/{target_org_id}/proof-packs"""

    async def test_returns_paginated_proof_packs(
        self, admin_client: AsyncClient
    ) -> None:
        """Returns proof records with pagination metadata."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        app.dependency_overrides[get_admin_tenant_filter] = lambda: TenantFilter(
            str(TARGET_ORG_ID)
        )

        proof = _make_proof_record()

        # 1. count query
        count_result = MagicMock()
        count_result.scalar_one.return_value = 1

        # 2. items query
        items_result = MagicMock()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = [proof]
        items_result.scalars.return_value = scalars_mock

        session.execute = AsyncMock(
            side_effect=[count_result, items_result]
        )

        with patch(
            "app.routers.admin_proof_packs.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{TARGET_ORG_ID}/proof-packs"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert len(data["data"]) == 1
        assert data["pagination"]["total"] == 1
        assert data["pagination"]["page"] == 1

    async def test_empty_proof_packs(self, admin_client: AsyncClient) -> None:
        """Returns empty list with correct pagination when no records."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        app.dependency_overrides[get_admin_tenant_filter] = lambda: TenantFilter(
            str(TARGET_ORG_ID)
        )

        count_result = MagicMock()
        count_result.scalar_one.return_value = 0

        items_result = MagicMock()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []
        items_result.scalars.return_value = scalars_mock

        session.execute = AsyncMock(
            side_effect=[count_result, items_result]
        )

        with patch(
            "app.routers.admin_proof_packs.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{TARGET_ORG_ID}/proof-packs"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["data"] == []
        assert data["pagination"]["total"] == 0
        assert data["pagination"]["totalPages"] == 1

    async def test_pagination_params(self, admin_client: AsyncClient) -> None:
        """Respects page and page_size query parameters."""
        session = admin_client._mock_session  # type: ignore[attr-defined]

        app.dependency_overrides[get_admin_tenant_filter] = lambda: TenantFilter(
            str(TARGET_ORG_ID)
        )

        proof = _make_proof_record()

        count_result = MagicMock()
        count_result.scalar_one.return_value = 50

        items_result = MagicMock()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = [proof]
        items_result.scalars.return_value = scalars_mock

        session.execute = AsyncMock(
            side_effect=[count_result, items_result]
        )

        with patch(
            "app.routers.admin_proof_packs.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{TARGET_ORG_ID}/proof-packs",
                params={"page": 2, "page_size": 10},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["pagination"]["page"] == 2
        assert data["pagination"]["pageSize"] == 10
        assert data["pagination"]["totalPages"] == 5
        assert data["pagination"]["hasNextPage"] is True
        assert data["pagination"]["hasPreviousPage"] is True
