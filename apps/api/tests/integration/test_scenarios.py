"""Integration tests for scenarios endpoints.

Tests cover:
- GET /api/v1/scenarios/alert/{alert_id} — list scenarios + Pareto frontier
- POST /api/v1/scenarios/generate/{alert_id} — generate new scenarios (201)
- 403 for unauthorized roles on generate
- 401 for unauthenticated access
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.main import app
from app.models.operational import ScenarioOptionType

from .conftest import ORG_A_ID, USER_A_ID

ALERT_ID = uuid.UUID("dddddddd-0000-0000-0000-000000000001")


def _make_scenario_option_ns(**overrides) -> SimpleNamespace:
    """Build a scenario option SimpleNamespace."""
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": ORG_A_ID,
        "coverage_alert_id": ALERT_ID,
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


def _jwt_a(role: str = "org_admin") -> JWTPayload:
    return JWTPayload(
        user_id=USER_A_ID,
        email=f"{USER_A_ID}@test.com",
        organization_id=str(ORG_A_ID),
        role=role,
    )


async def _make_client(session: AsyncMock, role: str = "org_admin") -> AsyncClient:
    """Create an async client with overrides."""
    jwt = _jwt_a(role)

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# ── GET /api/v1/scenarios/alert/{alert_id} ───────────────────


async def test_get_alert_scenarios_200() -> None:
    """GET /api/v1/scenarios/alert/{id} returns scenarios with Pareto frontier."""
    options = [
        _make_scenario_option_ns(is_pareto_optimal=True, is_recommended=False),
        _make_scenario_option_ns(
            id=uuid.uuid4(),
            option_type=ScenarioOptionType.INTERIM,
            label="Interim",
            cout_total_eur=Decimal("600.00"),
            service_attendu_pct=Decimal("0.9500"),
            is_pareto_optimal=False,
            is_recommended=False,
        ),
    ]
    session = AsyncMock()

    with (
        patch(
            "app.routers.scenarios.get_scenarios_for_alert",
            new_callable=AsyncMock,
            return_value=options,
        ),
        patch(
            "app.routers.scenarios.compute_pareto_frontier",
            return_value=[options[0]],
        ),
        patch(
            "app.routers.scenarios.select_recommendation",
            return_value=options[0],
        ),
    ):
        async with await _make_client(session) as client:
            response = await client.get(f"/api/v1/scenarios/alert/{ALERT_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["alertId"] == str(ALERT_ID)
    assert len(data["data"]["options"]) == 2
    assert len(data["data"]["paretoFrontier"]) == 1
    assert data["data"]["recommended"] is not None


async def test_get_alert_scenarios_empty() -> None:
    """GET /api/v1/scenarios/alert/{id} with no existing scenarios."""
    session = AsyncMock()

    with (
        patch(
            "app.routers.scenarios.get_scenarios_for_alert",
            new_callable=AsyncMock,
            return_value=[],
        ),
        patch(
            "app.routers.scenarios.compute_pareto_frontier",
            return_value=[],
        ),
        patch(
            "app.routers.scenarios.select_recommendation",
            return_value=None,
        ),
    ):
        async with await _make_client(session) as client:
            response = await client.get(f"/api/v1/scenarios/alert/{ALERT_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["options"] == []
    assert data["data"]["paretoFrontier"] == []
    assert data["data"]["recommended"] is None


async def test_get_alert_scenarios_401_no_auth() -> None:
    """GET /api/v1/scenarios/alert/{id} returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/scenarios/alert/{ALERT_ID}")
    app.dependency_overrides.clear()
    assert response.status_code == 401


# ── POST /api/v1/scenarios/generate/{alert_id} ──────────────


async def test_generate_scenarios_201() -> None:
    """POST /api/v1/scenarios/generate/{id} creates scenarios."""
    options = [
        _make_scenario_option_ns(is_pareto_optimal=True, is_recommended=True),
        _make_scenario_option_ns(
            id=uuid.uuid4(),
            option_type=ScenarioOptionType.INTERIM,
            label="Interim",
            cout_total_eur=Decimal("600.00"),
            is_pareto_optimal=True,
            is_recommended=False,
        ),
        _make_scenario_option_ns(
            id=uuid.uuid4(),
            option_type=ScenarioOptionType.SERVICE_ADJUST,
            label="Service adjust",
            cout_total_eur=Decimal("200.00"),
            service_attendu_pct=Decimal("0.0000"),
            is_pareto_optimal=False,
            is_recommended=False,
        ),
    ]
    session = AsyncMock()

    with patch(
        "app.routers.scenarios.generate_scenarios",
        new_callable=AsyncMock,
        return_value=options,
    ):
        async with await _make_client(session, role="org_admin") as client:
            response = await client.post(f"/api/v1/scenarios/generate/{ALERT_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["options"]) == 3
    # Pareto frontier should contain the two pareto_optimal options
    assert len(data["data"]["paretoFrontier"]) == 2
    assert data["data"]["recommended"] is not None


async def test_generate_scenarios_no_recommended() -> None:
    """POST /api/v1/scenarios/generate/{id} with no recommended option."""
    options = [
        _make_scenario_option_ns(is_pareto_optimal=False, is_recommended=False),
    ]
    session = AsyncMock()

    with patch(
        "app.routers.scenarios.generate_scenarios",
        new_callable=AsyncMock,
        return_value=options,
    ):
        async with await _make_client(session, role="manager") as client:
            response = await client.post(f"/api/v1/scenarios/generate/{ALERT_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 201
    data = response.json()
    assert data["data"]["recommended"] is None
    assert data["data"]["paretoFrontier"] == []


async def test_generate_scenarios_403_viewer() -> None:
    """POST /api/v1/scenarios/generate/{id} returns 403 for viewer role."""
    session = AsyncMock()

    async with await _make_client(session, role="viewer") as client:
        response = await client.post(f"/api/v1/scenarios/generate/{ALERT_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_generate_scenarios_401_no_auth() -> None:
    """POST /api/v1/scenarios/generate/{id} returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(f"/api/v1/scenarios/generate/{ALERT_ID}")
    app.dependency_overrides.clear()
    assert response.status_code == 401
