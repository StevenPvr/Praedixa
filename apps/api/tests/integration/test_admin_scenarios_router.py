"""Integration tests for admin_scenarios router — 100% coverage.

Tests both endpoints:
- GET /api/v1/admin/monitoring/scenarios/summary
- GET /api/v1/admin/organizations/{target_org_id}/scenarios

Strategy:
- Override get_current_user, get_db_session, get_admin_tenant_filter
  via FastAPI dependency_overrides.
- Mock session.execute to return controlled results for inline queries.
- Use enum instances with .value for scenario type counts.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
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
)
from app.core.security import TenantFilter
from app.main import app
from app.models.operational import ScenarioOptionType

# -- Fixed test identifiers ------------------------------------------------
ADMIN_USER_ID = "11111111-aaaa-bbbb-cccc-000000000004"
TARGET_ORG_ID = uuid.UUID("cccccccc-3333-3333-3333-333333333333")
ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")

MONITORING_PREFIX = "/api/v1/admin/monitoring/scenarios"
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


def _make_scenario_option(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": TARGET_ORG_ID,
        "coverage_alert_id": uuid.uuid4(),
        "cost_parameter_id": uuid.uuid4(),
        "option_type": ScenarioOptionType.HS,
        "label": "Heures supplementaires",
        "cout_total_eur": Decimal("525.00"),
        "service_attendu_pct": Decimal("1.0000"),
        "heures_couvertes": Decimal("12.00"),
        "is_pareto_optimal": True,
        "is_recommended": False,
        "contraintes_json": {"cap_hs_shift": 30, "capped": False},
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ── 1. scenarios_summary ─────────────────────────────────────────────────


class TestScenariosSummary:
    """GET /api/v1/admin/monitoring/scenarios/summary"""

    async def test_returns_summary_with_data(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Scenario summary with type breakdown."""
        mock_session.execute.side_effect = [
            _scalar_one_result(200),  # total
            _scalar_one_result(50),  # pareto
            _scalar_one_result(30),  # recommended
            _all_result(
                [  # by_type
                    (ScenarioOptionType.HS, 100),
                    (ScenarioOptionType.INTERIM, 60),
                    (ScenarioOptionType.REALLOC_INTRA, 40),
                ]
            ),
        ]

        resp = await admin_client.get(f"{MONITORING_PREFIX}/summary")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        data = body["data"]
        assert data["totalScenarios"] == 200
        assert data["paretoOptimalCount"] == 50
        assert data["recommendedCount"] == 30
        assert len(data["byType"]) == 3
        assert data["byType"][0]["optionType"] == "hs"
        assert data["byType"][0]["count"] == 100

    async def test_summary_empty(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Scenario summary with no data."""
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _scalar_one_result(0),
            _scalar_one_result(0),
            _all_result([]),
        ]

        resp = await admin_client.get(f"{MONITORING_PREFIX}/summary")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["totalScenarios"] == 0
        assert data["paretoOptimalCount"] == 0
        assert data["recommendedCount"] == 0
        assert data["byType"] == []


# ── 2. org_scenarios ─────────────────────────────────────────────────────


class TestOrgScenarios:
    """GET /api/v1/admin/organizations/{target_org_id}/scenarios"""

    async def test_returns_paginated_scenarios(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Returns scenarios for a specific org with pagination."""
        scenarios = [_make_scenario_option(), _make_scenario_option()]

        mock_session.execute.side_effect = [
            _scalar_one_result(2),
            _scalars_all_result(scenarios),
        ]

        resp = await admin_client.get(f"{ORG_PREFIX}/scenarios")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 2
        assert body["pagination"]["total"] == 2
        assert body["pagination"]["totalPages"] == 1
        assert body["pagination"]["hasNextPage"] is False
        assert body["pagination"]["hasPreviousPage"] is False

    async def test_scenarios_page2(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Scenarios page 2 with has_previous_page=True."""
        scenarios = [_make_scenario_option()]

        mock_session.execute.side_effect = [
            _scalar_one_result(25),
            _scalars_all_result(scenarios),
        ]

        resp = await admin_client.get(
            f"{ORG_PREFIX}/scenarios", params={"page": 2, "page_size": 20}
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pagination"]["hasPreviousPage"] is True

    async def test_scenarios_empty(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Empty scenarios."""
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _scalars_all_result([]),
        ]

        resp = await admin_client.get(f"{ORG_PREFIX}/scenarios")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["pagination"]["total"] == 0
