"""P0-02 Evidence — Rate limiting and request body size limit tests.

Validates that:
- setup_rate_limiting installs slowapi middleware and handler on the app.
- 429 responses use the standardized error format with request_id.
- Request body > 10MB is rejected with 413.
- Key function correctly prioritizes cf-connecting-ip > x-forwarded-for > client.host.
- /health endpoint is in the exempt paths set.

These tests serve as contractual evidence for security gate P0-02.
"""

from unittest.mock import AsyncMock, MagicMock

import fastapi
import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.testclient import TestClient

from app.core.rate_limit import (
    _EXEMPT_PATHS,
    GLOBAL_RATE_LIMIT,
    MAX_REQUEST_BODY_SIZE,
    RequestBodySizeLimitMiddleware,
    _get_client_ip,
    limiter,
    rate_limit_exceeded_handler,
    setup_rate_limiting,
)


def _make_rate_limit_exc() -> RateLimitExceeded:
    """Create a RateLimitExceeded with a properly mocked Limit object."""
    mock_limit = MagicMock()
    mock_limit.error_message = None
    mock_limit.limit = GLOBAL_RATE_LIMIT
    return RateLimitExceeded(mock_limit)


class TestSetupRateLimiting:
    """P0-02: Verify setup_rate_limiting correctly configures the app."""

    def test_setup_adds_limiter_to_app_state(self) -> None:
        """After setup, app.state.limiter is the global limiter instance."""
        app = FastAPI()
        setup_rate_limiting(app)
        assert app.state.limiter is limiter

    def test_setup_registers_rate_limit_exceeded_handler(self) -> None:
        """After setup, RateLimitExceeded exception has a handler registered."""
        app = FastAPI()
        setup_rate_limiting(app)
        # FastAPI stores exception handlers by type
        assert RateLimitExceeded in app.exception_handlers

    def test_setup_adds_body_size_middleware(self) -> None:
        """After setup, RequestBodySizeLimitMiddleware is in the middleware stack."""
        app = FastAPI()
        setup_rate_limiting(app)
        middleware_classes = [m.cls for m in app.user_middleware]
        assert RequestBodySizeLimitMiddleware in middleware_classes
        assert SlowAPIMiddleware in middleware_classes


class TestRateLimitExceededHandler:
    """P0-02: 429 response format matches standardized error structure."""

    def test_429_has_standard_error_format(self) -> None:
        """Rate limit response has success=false, error code, and timestamp."""
        request = MagicMock()
        request.url.path = "/api/v1/test"
        request.method = "GET"
        request.headers.get.return_value = None
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        exc = _make_rate_limit_exc()
        response = rate_limit_exceeded_handler(request, exc)

        assert isinstance(response, JSONResponse)
        assert response.status_code == 429

        body = response.body
        import json

        data = json.loads(body)

        assert data["success"] is False
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "too many requests" in data["error"]["message"].lower()
        assert "timestamp" in data

    def test_429_includes_request_id_when_valid(self) -> None:
        """When X-Request-ID is valid, it is included in the 429 response."""
        request = MagicMock()
        request.url.path = "/api/v1/test"
        request.method = "POST"
        request.client = MagicMock()
        request.client.host = "10.0.0.1"

        def header_get(name: str) -> str | None:
            headers = {
                "X-Request-ID": "req-abc-123",
                "cf-connecting-ip": None,
                "x-forwarded-for": None,
            }
            return headers.get(name)

        request.headers.get = header_get

        exc = _make_rate_limit_exc()
        response = rate_limit_exceeded_handler(request, exc)

        import json

        data = json.loads(response.body)
        assert data["requestId"] == "req-abc-123"

    def test_429_excludes_invalid_request_id(self) -> None:
        """When X-Request-ID is invalid (too long), it is NOT included."""
        request = MagicMock()
        request.url.path = "/api/v1/test"
        request.method = "POST"
        request.client = MagicMock()
        request.client.host = "10.0.0.1"

        # X-Request-ID longer than 64 chars should be excluded
        long_id = "x" * 100

        def header_get(name: str) -> str | None:
            headers = {
                "X-Request-ID": long_id,
                "cf-connecting-ip": None,
                "x-forwarded-for": None,
            }
            return headers.get(name)

        request.headers.get = header_get

        exc = _make_rate_limit_exc()
        response = rate_limit_exceeded_handler(request, exc)

        import json

        data = json.loads(response.body)
        assert "requestId" not in data

    def test_429_excludes_non_ascii_request_id(self) -> None:
        """Non-ASCII X-Request-ID is excluded to prevent injection."""
        request = MagicMock()
        request.url.path = "/api/v1/test"
        request.method = "GET"
        request.client = MagicMock()
        request.client.host = "10.0.0.1"

        def header_get(name: str) -> str | None:
            headers = {
                "X-Request-ID": "req-\u00e9\u00e8\u00ea",
                "cf-connecting-ip": None,
                "x-forwarded-for": None,
            }
            return headers.get(name)

        request.headers.get = header_get

        exc = _make_rate_limit_exc()
        response = rate_limit_exceeded_handler(request, exc)

        import json

        data = json.loads(response.body)
        assert "requestId" not in data

    def test_429_does_not_expose_internal_limits(self) -> None:
        """The 429 response does not reveal internal rate limit configuration."""
        request = MagicMock()
        request.url.path = "/api/v1/sensitive"
        request.method = "POST"
        request.headers.get.return_value = None
        request.client = MagicMock()
        request.client.host = "10.0.0.1"

        exc = _make_rate_limit_exc()
        response = rate_limit_exceeded_handler(request, exc)

        import json

        data = json.loads(response.body)
        # The error message must be generic, not revealing the limit
        assert "100" not in data["error"]["message"]
        assert "minute" not in data["error"]["message"].lower()

    def test_429_includes_retry_after_when_available(self) -> None:
        """When exc has retry_after, Retry-After header is set."""
        request = MagicMock()
        request.url.path = "/api/v1/test"
        request.method = "GET"
        request.headers.get.return_value = None
        request.client = MagicMock()
        request.client.host = "10.0.0.1"

        exc = _make_rate_limit_exc()
        exc.retry_after = 30  # type: ignore[attr-defined]
        response = rate_limit_exceeded_handler(request, exc)

        assert response.headers.get("Retry-After") == "30"


class TestRequestBodySizeLimit:
    """P0-02: Request bodies > 10MB are rejected with 413."""

    def test_request_over_10mb_returns_413(self) -> None:
        """Request with Content-Length > 10MB gets 413 Payload Too Large."""
        app = FastAPI()

        @app.post("/test")
        async def test_route() -> dict:
            return {"ok": True}

        app.add_middleware(RequestBodySizeLimitMiddleware)
        client = TestClient(app, raise_server_exceptions=False)

        # Send a request claiming 11MB content
        response = client.post(
            "/test",
            headers={"Content-Length": str(11 * 1024 * 1024)},
            content=b"x",
        )
        assert response.status_code == 413
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"

    def test_request_exactly_10mb_accepted(self) -> None:
        """Request with Content-Length = 10MB is accepted."""
        app = FastAPI()

        @app.post("/test")
        async def test_route() -> dict:
            return {"ok": True}

        app.add_middleware(RequestBodySizeLimitMiddleware)
        client = TestClient(app, raise_server_exceptions=False)

        response = client.post(
            "/test",
            headers={"Content-Length": str(MAX_REQUEST_BODY_SIZE)},
            content=b"x",
        )
        # Should NOT be 413 — request is at the limit, not over
        assert response.status_code != 413

    def test_request_under_10mb_accepted(self) -> None:
        """Normal-sized request is accepted."""
        app = FastAPI()

        @app.post("/test")
        async def test_route() -> dict:
            return {"ok": True}

        app.add_middleware(RequestBodySizeLimitMiddleware)
        client = TestClient(app, raise_server_exceptions=False)

        response = client.post(
            "/test",
            headers={"Content-Length": "100"},
            content=b"hello",
        )
        assert response.status_code != 413

    def test_invalid_content_length_passes_through(self) -> None:
        """Non-numeric Content-Length is ignored (no crash)."""
        app = FastAPI()

        @app.post("/test")
        async def test_route() -> dict:
            return {"ok": True}

        app.add_middleware(RequestBodySizeLimitMiddleware)
        client = TestClient(app, raise_server_exceptions=False)

        response = client.post(
            "/test",
            headers={"Content-Length": "not-a-number"},
            content=b"hello",
        )
        # Should pass through without crashing (ValueError is caught)
        assert response.status_code != 413

    def test_max_body_size_constant_is_10mb(self) -> None:
        """MAX_REQUEST_BODY_SIZE is exactly 10 * 1024 * 1024 bytes."""
        assert MAX_REQUEST_BODY_SIZE == 10 * 1024 * 1024

    @pytest.mark.asyncio
    async def test_request_without_content_length_rejected_when_oversized(self) -> None:
        """Chunked-style request (no Content-Length) is size-checked."""
        app = FastAPI()
        middleware = RequestBodySizeLimitMiddleware(app=app)

        request = MagicMock()
        request.url.path = "/upload"
        request.method = "POST"
        request.headers.get.return_value = None
        request.body = AsyncMock(return_value=b"x" * (MAX_REQUEST_BODY_SIZE + 1))

        call_next = AsyncMock()
        response = await middleware.dispatch(request, call_next)

        assert response.status_code == 413
        call_next.assert_not_called()


class TestKeyFunctionPriority:
    """P0-02: _get_client_ip extracts IP with correct priority."""

    def test_cf_connecting_ip_has_highest_priority(self) -> None:
        """cf-connecting-ip is used when present (Cloudflare edge)."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            headers = {
                "cf-connecting-ip": "1.2.3.4",
                "x-forwarded-for": "5.6.7.8, 9.10.11.12",
            }
            return headers.get(name)

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert _get_client_ip(request) == "1.2.3.4"

    def test_x_forwarded_for_used_when_no_cf_header(self) -> None:
        """X-Forwarded-For first IP is used when cf-connecting-ip is absent."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            headers = {
                "cf-connecting-ip": None,
                "x-forwarded-for": "5.6.7.8, 9.10.11.12",
            }
            return headers.get(name)

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert _get_client_ip(request) == "5.6.7.8"

    def test_client_host_used_as_fallback(self) -> None:
        """request.client.host is used when no proxy headers exist."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "192.168.1.100"

        assert _get_client_ip(request) == "192.168.1.100"

    def test_unknown_when_no_client(self) -> None:
        """Returns 'unknown' when no headers and no client."""
        request = MagicMock()
        request.headers.get.return_value = None
        request.client = None

        assert _get_client_ip(request) == "unknown"

    def test_cf_connecting_ip_stripped(self) -> None:
        """Whitespace in cf-connecting-ip is stripped."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "cf-connecting-ip":
                return "  1.2.3.4  "
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert _get_client_ip(request) == "1.2.3.4"

    def test_x_forwarded_for_first_ip_only(self) -> None:
        """Only the first IP from X-Forwarded-For is used."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "x-forwarded-for":
                return "10.0.0.1, 10.0.0.2, 10.0.0.3"
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert _get_client_ip(request) == "10.0.0.1"


class TestHealthEndpointExempt:
    """P0-02: /health endpoint is in the exempt paths set."""

    def test_health_in_exempt_paths(self) -> None:
        """The /health path is explicitly exempt from rate limiting."""
        assert "/health" in _EXEMPT_PATHS

    def test_exempt_paths_is_frozenset(self) -> None:
        """Exempt paths is immutable (cannot be modified at runtime)."""
        assert isinstance(_EXEMPT_PATHS, frozenset)


class TestBodyReplayWithoutContentLength:
    """Lines 173-181: body replay when POST has no Content-Length but body < max."""

    def test_post_without_content_length_body_replayed(self) -> None:
        """POST with no Content-Length and body under limit succeeds."""
        from httpx import ASGITransport, AsyncClient

        app = FastAPI()

        @app.post("/echo")
        async def echo_route(request: fastapi.Request) -> dict:
            body = await request.body()
            return {"size": len(body)}

        app.add_middleware(RequestBodySizeLimitMiddleware)

        import asyncio

        async def _run() -> None:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                # Send raw content without Content-Length by using the content kwarg
                # httpx with content=bytes will add Content-Length, so we use
                # a streaming approach to avoid it.
                resp = await ac.post(
                    "/echo",
                    content=b"hello world",
                    headers={"Transfer-Encoding": "chunked"},
                )
                # The middleware should replay the body and the route should succeed
                assert resp.status_code == 200
                assert resp.json()["size"] == 11

        asyncio.get_event_loop().run_until_complete(_run())

    def test_post_without_content_length_under_limit_accepted(self) -> None:
        """POST without Content-Length and small body is accepted (body replayed)."""
        app = FastAPI()

        @app.post("/echo")
        async def echo_route(request: fastapi.Request) -> dict:
            body = await request.body()
            return {"length": len(body)}

        middleware = RequestBodySizeLimitMiddleware(app=app, max_body_size=1024)

        request = MagicMock()
        request.url.path = "/upload"
        request.method = "POST"
        request.headers.get.return_value = None
        request.body = AsyncMock(return_value=b"small payload")

        call_next = AsyncMock()
        expected_response = MagicMock()
        call_next.return_value = expected_response

        import asyncio

        async def _run() -> None:
            response = await middleware.dispatch(request, call_next)
            assert response is expected_response
            # Verify _receive was set (body replay)
            assert hasattr(request, "_receive")
            # Call the _receive closure to verify it returns the correct body
            receive_result = await request._receive()
            assert receive_result["type"] == "http.request"
            assert receive_result["body"] == b"small payload"
            assert receive_result["more_body"] is False

        asyncio.get_event_loop().run_until_complete(_run())
