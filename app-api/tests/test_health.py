"""Tests for the health check endpoint."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client() -> AsyncClient:  # type: ignore[misc]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac  # type: ignore[misc]


@pytest.mark.asyncio
async def test_health_returns_200_when_db_healthy(client: AsyncClient) -> None:
    """GET /health should return 200 with status healthy when DB is reachable."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.execute = AsyncMock()

    with patch("app.routers.health.async_session_factory", return_value=mock_session):
        response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"
    assert "timestamp" in data
    assert data["checks"] == [{"name": "database", "status": "pass"}]


@pytest.mark.asyncio
async def test_health_returns_503_when_db_fails(client: AsyncClient) -> None:
    """GET /health should return 503 with status degraded when DB is unreachable."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.execute = AsyncMock(side_effect=ConnectionError("no db"))

    with patch("app.routers.health.async_session_factory", return_value=mock_session):
        response = await client.get("/health")

    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "degraded"
    assert data["checks"] == [{"name": "database", "status": "fail"}]


@pytest.mark.asyncio
async def test_health_includes_request_id(client: AsyncClient) -> None:
    """GET /health should return an X-Request-ID header."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.execute = AsyncMock()

    with patch("app.routers.health.async_session_factory", return_value=mock_session):
        response = await client.get("/health", headers={"X-Request-ID": "test-req-123"})

    assert response.headers["X-Request-ID"] == "test-req-123"


@pytest.mark.asyncio
async def test_health_includes_process_time(client: AsyncClient) -> None:
    """GET /health should return an X-Process-Time header."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.execute = AsyncMock()

    with patch("app.routers.health.async_session_factory", return_value=mock_session):
        response = await client.get("/health")

    assert "X-Process-Time" in response.headers
    assert float(response.headers["X-Process-Time"]) >= 0


@pytest.mark.asyncio
async def test_api_v1_health_alias_returns_same_payload(client: AsyncClient) -> None:
    """GET /api/v1/health should remain backward-compatible with /health."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.execute = AsyncMock()

    with patch("app.routers.health.async_session_factory", return_value=mock_session):
        response = await client.get("/api/v1/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["checks"] == [{"name": "database", "status": "pass"}]
