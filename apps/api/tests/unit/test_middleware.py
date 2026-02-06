"""Tests for app.core.middleware — AuditLogMiddleware."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.middleware import AUDIT_EXCLUDE_PATHS, AuditLogMiddleware


def _make_request(path: str, method: str = "GET", **state_attrs):
    """Create a mock Request object."""
    request = MagicMock()
    request.url.path = path
    request.method = method
    request.client = MagicMock()
    request.client.host = "127.0.0.1"
    # Use MagicMock for headers so .get can be customized
    headers = MagicMock()
    headers.get = MagicMock(
        side_effect=lambda key, default="": {
            "User-Agent": "TestAgent/1.0",
        }.get(key, default)
    )
    request.headers = headers

    # Set state attrs
    for k, v in state_attrs.items():
        setattr(request.state, k, v)

    return request


def _make_response(status_code: int = 200):
    response = MagicMock()
    response.status_code = status_code
    return response


class TestAuditLogMiddleware:
    """Test AuditLogMiddleware dispatch."""

    @pytest.mark.asyncio
    async def test_skip_health_path(self):
        """Health endpoint should be excluded from audit logging."""
        middleware = AuditLogMiddleware(app=MagicMock())
        request = _make_request("/health")
        call_next = AsyncMock(return_value=_make_response())

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            mock_logger.info.assert_not_called()

        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_skip_docs_path(self):
        middleware = AuditLogMiddleware(app=MagicMock())
        request = _make_request("/docs")
        call_next = AsyncMock(return_value=_make_response())

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            mock_logger.info.assert_not_called()

    @pytest.mark.asyncio
    async def test_skip_redoc_path(self):
        middleware = AuditLogMiddleware(app=MagicMock())
        request = _make_request("/redoc")
        call_next = AsyncMock(return_value=_make_response())

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            mock_logger.info.assert_not_called()

    @pytest.mark.asyncio
    async def test_skip_openapi_path(self):
        middleware = AuditLogMiddleware(app=MagicMock())
        request = _make_request("/openapi.json")
        call_next = AsyncMock(return_value=_make_response())

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            mock_logger.info.assert_not_called()

    @pytest.mark.asyncio
    async def test_logs_for_api_path(self):
        """Non-excluded paths should be logged."""
        middleware = AuditLogMiddleware(app=MagicMock())
        request = _make_request("/api/v1/dashboard/summary", method="GET")
        # Set state attributes
        request.state.audit_user_id = "user-1"
        request.state.audit_org_id = "org-1"
        call_next = AsyncMock(return_value=_make_response(200))

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args
            assert call_args[0][0] == "audit"
            assert call_args[1]["user_id"] == "user-1"
            assert call_args[1]["organization_id"] == "org-1"
            assert call_args[1]["method"] == "GET"
            assert call_args[1]["path"] == "/api/v1/dashboard/summary"
            assert call_args[1]["status_code"] == 200
            assert "duration_ms" in call_args[1]
            assert call_args[1]["ip"] == "127.0.0.1"

    @pytest.mark.asyncio
    async def test_fallback_none_for_unauthenticated(self):
        """Unauthenticated requests should log user_id=None, org_id=None."""
        middleware = AuditLogMiddleware(app=MagicMock())
        request = _make_request("/api/v1/some-endpoint")
        # Remove audit state attrs to simulate unauthenticated request
        del request.state.audit_user_id
        del request.state.audit_org_id
        # getattr with default falls back to None
        request.state = MagicMock(spec=[])
        request.url.path = "/api/v1/some-endpoint"
        request.method = "POST"
        request.client = MagicMock()
        request.client.host = "10.0.0.1"
        request.headers.get = MagicMock(return_value="")

        call_next = AsyncMock(return_value=_make_response(201))

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            call_args = mock_logger.info.call_args
            assert call_args[1]["user_id"] is None
            assert call_args[1]["organization_id"] is None

    @pytest.mark.asyncio
    async def test_user_agent_truncation(self):
        """User-Agent header should be truncated to 200 chars."""
        middleware = AuditLogMiddleware(app=MagicMock())
        long_ua = "X" * 500
        request = _make_request("/api/v1/endpoint")
        request.state.audit_user_id = None
        request.state.audit_org_id = None
        request.headers.get = MagicMock(
            side_effect=lambda key, default="": (
                long_ua if key == "User-Agent" else default
            ),
        )
        call_next = AsyncMock(return_value=_make_response())

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            call_args = mock_logger.info.call_args
            assert len(call_args[1]["user_agent"]) == 200

    @pytest.mark.asyncio
    async def test_no_client_ip_none(self):
        """When request.client is None, ip should be None."""
        middleware = AuditLogMiddleware(app=MagicMock())
        request = _make_request("/api/v1/endpoint")
        request.state.audit_user_id = None
        request.state.audit_org_id = None
        request.client = None
        call_next = AsyncMock(return_value=_make_response())

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            call_args = mock_logger.info.call_args
            assert call_args[1]["ip"] is None

    def test_exclude_paths_constant(self):
        """Verify the set of excluded paths."""
        assert "/health" in AUDIT_EXCLUDE_PATHS
        assert "/docs" in AUDIT_EXCLUDE_PATHS
        assert "/redoc" in AUDIT_EXCLUDE_PATHS
        assert "/openapi.json" in AUDIT_EXCLUDE_PATHS
