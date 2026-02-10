"""Tests for app.main — FastAPI application, middleware, lifespan, routers."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestAppConfiguration:
    """Test app metadata and configuration."""

    def test_app_title(self) -> None:
        assert app.title == "Praedixa API"

    def test_app_version(self) -> None:
        # version comes from settings.APP_VERSION
        assert app.version is not None

    def test_app_description(self) -> None:
        desc = app.description.lower()
        assert "logistics" in desc or "forecast" in desc


class TestRoutersIncluded:
    """Test that all 7 routers are registered."""

    def test_health_router(self) -> None:
        paths = [r.path for r in app.routes]
        assert "/health" in paths

    def test_dashboard_router(self) -> None:
        paths = [r.path for r in app.routes]
        assert "/api/v1/dashboard/summary" in paths

    def test_forecasts_router(self) -> None:
        paths = [r.path for r in app.routes]
        assert "/api/v1/forecasts" in paths

    def test_alerts_router(self) -> None:
        paths = [r.path for r in app.routes]
        assert "/api/v1/alerts" in paths

    def test_organizations_router(self) -> None:
        paths = [r.path for r in app.routes]
        assert "/api/v1/organizations/me" in paths

    def test_decisions_router(self) -> None:
        paths = [r.path for r in app.routes]
        assert "/api/v1/decisions" in paths

    def test_arbitrage_router(self) -> None:
        [r.path for r in app.routes]
        # Arbitrage routes have path params, check prefix
        route_paths = [r.path for r in app.routes]
        assert any("/api/v1/arbitrage" in p for p in route_paths)


class TestRequestIdMiddleware:
    """Test X-Request-ID middleware behavior."""

    @pytest.mark.asyncio
    async def test_valid_client_request_id_preserved(self, client) -> None:
        """Client-supplied X-Request-ID should be returned in response."""
        resp = await client.get("/health", headers={"X-Request-ID": "req-123"})
        assert resp.headers.get("X-Request-ID") == "req-123"

    @pytest.mark.asyncio
    async def test_auto_generated_request_id(self, client) -> None:
        """Without client X-Request-ID, a UUID should be generated."""
        resp = await client.get("/health")
        req_id = resp.headers.get("X-Request-ID")
        assert req_id is not None
        assert len(req_id) == 36  # UUID4 format

    @pytest.mark.asyncio
    async def test_oversized_request_id_rejected(self, client) -> None:
        """Oversized X-Request-ID should be replaced with a UUID."""
        long_id = "x" * 100  # > 64 chars
        resp = await client.get("/health", headers={"X-Request-ID": long_id})
        req_id = resp.headers.get("X-Request-ID")
        assert req_id != long_id
        assert len(req_id) == 36

    @pytest.mark.asyncio
    async def test_max_length_request_id_preserved(self, client) -> None:
        """X-Request-ID at exactly the max length (64 chars) should be preserved."""
        max_id = "a" * 64
        resp = await client.get("/health", headers={"X-Request-ID": max_id})
        assert resp.headers.get("X-Request-ID") == max_id

    @pytest.mark.asyncio
    async def test_process_time_header(self, client) -> None:
        """X-Process-Time header should be present."""
        resp = await client.get("/health")
        assert "X-Process-Time" in resp.headers
        # Should be a float-parseable string
        float(resp.headers["X-Process-Time"])


class TestLifespan:
    """Test application lifespan events."""

    @pytest.mark.asyncio
    async def test_lifespan_startup_and_shutdown(self) -> None:
        """Verify lifespan context manager runs without error."""
        from app.main import lifespan

        with patch("app.main.engine") as mock_engine:
            mock_engine.dispose = AsyncMock()
            with patch("app.main.structlog"):
                async with lifespan(app):
                    pass  # startup succeeded
                # shutdown: engine.dispose should be called
                mock_engine.dispose.assert_called_once()


class TestSecurityHeaders:
    """Test security headers in middleware."""

    @pytest.mark.asyncio
    async def test_hsts_header_in_production(self) -> None:
        """Line 178: HSTS header is added when is_production is True."""
        with patch("app.main.settings") as mock_settings:
            mock_settings.is_production = True
            mock_settings.DEBUG = False
            mock_settings.LOG_LEVEL = "debug"
            mock_settings.CORS_ORIGINS = ["http://localhost:3001"]
            mock_settings.APP_VERSION = "0.1.0"

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.get("/health")
                assert resp.headers.get("Strict-Transport-Security") == (
                    "max-age=63072000; includeSubDomains; preload"
                )

    @pytest.mark.asyncio
    async def test_no_hsts_header_in_development(self, client) -> None:
        """HSTS header is NOT added when is_production is False."""
        resp = await client.get("/health")
        assert "Strict-Transport-Security" not in resp.headers


class TestCorsConfiguration:
    """Test CORS middleware is configured."""

    @pytest.mark.asyncio
    async def test_cors_allows_configured_origin(self, client) -> None:
        """CORS should respond with proper headers for allowed origins."""
        resp = await client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3001",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.status_code == 200
        assert (
            resp.headers.get("access-control-allow-origin") == "http://localhost:3001"
        )
