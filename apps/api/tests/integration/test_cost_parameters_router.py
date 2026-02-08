"""Integration tests for cost parameters router.

Tests cover:
- GET /api/v1/cost-parameters — list parameters (paginated)
- GET /api/v1/cost-parameters/effective — get effective parameter
- GET /api/v1/cost-parameters/history — get version history
- POST /api/v1/cost-parameters — create new version (role check)
- 401 unauthenticated / 403 insufficient role
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.main import app

from .conftest import ORG_A_ID
from tests.unit.conftest import _make_cost_parameter


# ── GET /api/v1/cost-parameters ──────────────────────────────────


async def test_list_cost_parameters_200(client_a: AsyncClient) -> None:
    """GET /api/v1/cost-parameters returns paginated parameters."""
    params = [_make_cost_parameter(), _make_cost_parameter()]

    with patch(
        "app.routers.cost_parameters.list_cost_parameters",
        new_callable=AsyncMock,
        return_value=(params, 2),
    ):
        response = await client_a.get("/api/v1/cost-parameters")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2
    assert data["pagination"]["total"] == 2
    assert data["pagination"]["page"] == 1


async def test_list_cost_parameters_empty(client_a: AsyncClient) -> None:
    """GET /api/v1/cost-parameters returns empty list."""
    with patch(
        "app.routers.cost_parameters.list_cost_parameters",
        new_callable=AsyncMock,
        return_value=([], 0),
    ):
        response = await client_a.get("/api/v1/cost-parameters")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []
    assert data["pagination"]["total"] == 0
    assert data["pagination"]["totalPages"] == 1


async def test_list_cost_parameters_with_site_filter(client_a: AsyncClient) -> None:
    """GET /api/v1/cost-parameters?site_id=site-paris filters by site."""
    params = [_make_cost_parameter()]

    with patch(
        "app.routers.cost_parameters.list_cost_parameters",
        new_callable=AsyncMock,
        return_value=(params, 1),
    ) as mock_list:
        response = await client_a.get("/api/v1/cost-parameters?site_id=site-paris")

    assert response.status_code == 200
    mock_list.assert_called_once()
    call_kwargs = mock_list.call_args.kwargs
    assert call_kwargs["site_id"] == "site-paris"


async def test_list_cost_parameters_pagination(client_a: AsyncClient) -> None:
    """GET /api/v1/cost-parameters?page=2&page_size=5 handles pagination."""
    params = [_make_cost_parameter()]

    with patch(
        "app.routers.cost_parameters.list_cost_parameters",
        new_callable=AsyncMock,
        return_value=(params, 6),
    ):
        response = await client_a.get("/api/v1/cost-parameters?page=2&page_size=5")

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["pageSize"] == 5
    assert data["pagination"]["totalPages"] == 2
    assert data["pagination"]["hasPreviousPage"] is True
    assert data["pagination"]["hasNextPage"] is False


async def test_list_cost_parameters_401(unauth_client: AsyncClient) -> None:
    """GET /api/v1/cost-parameters returns 401 without auth."""
    response = await unauth_client.get("/api/v1/cost-parameters")
    assert response.status_code == 401


# ── GET /api/v1/cost-parameters/effective ─────────────────────────


async def test_get_effective_cost_parameter_200(client_a: AsyncClient) -> None:
    """GET /api/v1/cost-parameters/effective returns effective parameter."""
    param = _make_cost_parameter()

    with patch(
        "app.routers.cost_parameters.get_effective_cost_parameter",
        new_callable=AsyncMock,
        return_value=param,
    ):
        response = await client_a.get(
            "/api/v1/cost-parameters/effective?site_id=site-paris&date=2026-01-15"
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["siteId"] == "site-paris"


async def test_get_effective_cost_parameter_no_filters(client_a: AsyncClient) -> None:
    """GET /api/v1/cost-parameters/effective works without optional filters."""
    param = _make_cost_parameter(site_id=None)

    with patch(
        "app.routers.cost_parameters.get_effective_cost_parameter",
        new_callable=AsyncMock,
        return_value=param,
    ) as mock_get:
        response = await client_a.get("/api/v1/cost-parameters/effective")

    assert response.status_code == 200
    call_kwargs = mock_get.call_args.kwargs
    assert call_kwargs["site_id"] is None
    assert call_kwargs["target_date"] is None


# ── GET /api/v1/cost-parameters/history ───────────────────────────


async def test_get_cost_parameter_history_200(client_a: AsyncClient) -> None:
    """GET /api/v1/cost-parameters/history returns version history."""
    params = [
        _make_cost_parameter(version=2, effective_from=date(2026, 2, 1)),
        _make_cost_parameter(version=1, effective_from=date(2026, 1, 1)),
    ]

    with patch(
        "app.routers.cost_parameters.get_cost_parameter_history",
        new_callable=AsyncMock,
        return_value=params,
    ):
        response = await client_a.get(
            "/api/v1/cost-parameters/history?site_id=site-paris"
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2


async def test_get_cost_parameter_history_no_site(client_a: AsyncClient) -> None:
    """GET /api/v1/cost-parameters/history without site returns org-wide defaults."""
    params = [_make_cost_parameter(site_id=None)]

    with patch(
        "app.routers.cost_parameters.get_cost_parameter_history",
        new_callable=AsyncMock,
        return_value=params,
    ) as mock_history:
        response = await client_a.get("/api/v1/cost-parameters/history")

    assert response.status_code == 200
    call_kwargs = mock_history.call_args.kwargs
    assert call_kwargs["site_id"] is None


# ── POST /api/v1/cost-parameters ──────────────────────────────────


async def test_create_cost_parameter_201(client_a: AsyncClient) -> None:
    """POST /api/v1/cost-parameters creates a new parameter version."""
    param = _make_cost_parameter()

    with patch(
        "app.routers.cost_parameters.create_cost_parameter",
        new_callable=AsyncMock,
        return_value=param,
    ):
        response = await client_a.post(
            "/api/v1/cost-parameters",
            json={
                "siteId": "site-paris",
                "cInt": "35.00",
                "majHs": "0.25",
                "cInterim": "45.00",
                "premiumUrgence": "0.10",
                "cBacklog": "60.00",
                "capHsShift": 30,
                "capInterimSite": 50,
                "leadTimeJours": 2,
                "effectiveFrom": "2026-01-01",
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True


async def test_create_cost_parameter_403_viewer(mock_session: AsyncMock) -> None:
    """POST /api/v1/cost-parameters returns 403 for viewer role."""
    from collections.abc import AsyncGenerator

    viewer_jwt = JWTPayload(
        user_id="viewer-001",
        email="viewer@test.com",
        organization_id=str(ORG_A_ID),
        role="viewer",
    )

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: viewer_jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/cost-parameters",
            json={
                "cInt": "35.00",
                "majHs": "0.25",
                "cInterim": "45.00",
                "effectiveFrom": "2026-01-01",
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_create_cost_parameter_422_negative(client_a: AsyncClient) -> None:
    """POST /api/v1/cost-parameters rejects negative cost values."""
    response = await client_a.post(
        "/api/v1/cost-parameters",
        json={
            "cInt": "-5.00",
            "majHs": "0.25",
            "cInterim": "45.00",
            "effectiveFrom": "2026-01-01",
        },
    )

    assert response.status_code == 422
