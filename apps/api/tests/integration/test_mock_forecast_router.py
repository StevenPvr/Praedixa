"""Integration tests for mock forecast router.

Tests cover:
- POST /api/v1/mock-forecast — trigger mock forecast generation
- 401 unauthenticated
- 403 insufficient role
"""

from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.main import app

from .conftest import ORG_A_ID


# ── POST /api/v1/mock-forecast ────────────────────────────────────


async def test_trigger_mock_forecast_201(client_a: AsyncClient) -> None:
    """POST /api/v1/mock-forecast generates mock forecasts."""
    with patch(
        "app.routers.mock_forecast.generate_mock_forecasts",
        new_callable=AsyncMock,
        return_value=15,
    ):
        response = await client_a.post(
            "/api/v1/mock-forecast",
            json={"daysLookback": 30},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["alertsGenerated"] == 15
    assert "Generated 15" in data["data"]["message"]


async def test_trigger_mock_forecast_default_lookback(client_a: AsyncClient) -> None:
    """POST /api/v1/mock-forecast uses default days_lookback when not provided."""
    with patch(
        "app.routers.mock_forecast.generate_mock_forecasts",
        new_callable=AsyncMock,
        return_value=10,
    ) as mock_gen:
        response = await client_a.post(
            "/api/v1/mock-forecast",
            json={},
        )

    assert response.status_code == 201
    call_kwargs = mock_gen.call_args.kwargs
    assert call_kwargs["days_lookback"] == 30


async def test_trigger_mock_forecast_401(unauth_client: AsyncClient) -> None:
    """POST /api/v1/mock-forecast returns 401 without auth."""
    response = await unauth_client.post(
        "/api/v1/mock-forecast",
        json={"daysLookback": 30},
    )
    assert response.status_code == 401


async def test_trigger_mock_forecast_403_viewer(mock_session: AsyncMock) -> None:
    """POST /api/v1/mock-forecast returns 403 for viewer role."""
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
            "/api/v1/mock-forecast",
            json={"daysLookback": 30},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_trigger_mock_forecast_422_invalid_lookback(
    client_a: AsyncClient,
) -> None:
    """POST /api/v1/mock-forecast rejects invalid days_lookback values."""
    # days_lookback must be >= 1
    response = await client_a.post(
        "/api/v1/mock-forecast",
        json={"daysLookback": 0},
    )
    assert response.status_code == 422

    # days_lookback must be <= 365
    response = await client_a.post(
        "/api/v1/mock-forecast",
        json={"daysLookback": 400},
    )
    assert response.status_code == 422
