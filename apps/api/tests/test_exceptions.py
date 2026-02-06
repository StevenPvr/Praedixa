"""Tests for the exception hierarchy and exception handlers."""

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    PraedixaError,
)
from app.main import app

# ── Unit tests for exception classes ──────────────────────────────────


def test_praedixa_error_defaults() -> None:
    err = PraedixaError("boom")
    assert err.message == "boom"
    assert err.code == "INTERNAL_ERROR"
    assert err.status_code == 500
    assert err.details is None


def test_praedixa_error_custom() -> None:
    err = PraedixaError("bad", code="CUSTOM", status_code=418, details={"a": 1})
    assert err.code == "CUSTOM"
    assert err.status_code == 418
    assert err.details == {"a": 1}


def test_not_found_error() -> None:
    err = NotFoundError("User", "abc-123")
    assert err.message == "User not found"
    assert err.code == "NOT_FOUND"
    assert err.status_code == 404
    assert err.details == {"resource": "User", "id": "abc-123"}


def test_forbidden_error() -> None:
    err = ForbiddenError()
    assert err.message == "Access denied"
    assert err.code == "FORBIDDEN"
    assert err.status_code == 403


def test_forbidden_error_custom_message() -> None:
    err = ForbiddenError("Not your resource")
    assert err.message == "Not your resource"


def test_conflict_error() -> None:
    err = ConflictError("Duplicate email")
    assert err.message == "Duplicate email"
    assert err.code == "CONFLICT"
    assert err.status_code == 409


# ── Test routes for exception handler coverage ────────────────────────
# These temporary routes exercise the registered exception handlers.

_test_routes_added = False


def _add_test_routes() -> None:
    """Register test-only routes that raise each exception type."""
    global _test_routes_added  # noqa: PLW0603
    if _test_routes_added:
        return
    _test_routes_added = True

    class StrictBody(BaseModel):
        name: str
        age: int

    @app.get("/_test/praedixa-error")
    async def _raise_praedixa_error() -> None:
        raise PraedixaError("test error", code="TEST_001", details={"key": "val"})

    @app.get("/_test/http-error")
    async def _raise_http_error() -> None:
        raise HTTPException(status_code=403, detail="forbidden")

    @app.post("/_test/validation-error")
    async def _validation_endpoint(body: StrictBody) -> StrictBody:
        return body


# ── Integration tests for exception handlers ──────────────────────────


@pytest.fixture
async def client() -> AsyncClient:  # type: ignore[misc]
    _add_test_routes()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac  # type: ignore[misc]


@pytest.mark.asyncio
async def test_404_returns_json(client: AsyncClient) -> None:
    """Non-existent routes should return a JSON 404 response."""
    response = await client.get("/this-does-not-exist")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data or "error" in data


@pytest.mark.asyncio
async def test_praedixa_error_handler(client: AsyncClient) -> None:
    """PraedixaError should return structured error response."""
    response = await client.get("/_test/praedixa-error")
    assert response.status_code == 500
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "TEST_001"
    assert data["error"]["message"] == "test error"
    assert data["error"]["details"] == {"key": "val"}
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_praedixa_error_handler_with_request_id(client: AsyncClient) -> None:
    """PraedixaError handler should pass through X-Request-ID."""
    response = await client.get(
        "/_test/praedixa-error",
        headers={"X-Request-ID": "req-abc"},
    )
    data = response.json()
    assert data["requestId"] == "req-abc"


@pytest.mark.asyncio
async def test_http_exception_handler(client: AsyncClient) -> None:
    """HTTPException should return structured error response."""
    response = await client.get("/_test/http-error")
    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "HTTP_ERROR"
    assert data["error"]["message"] == "forbidden"


@pytest.mark.asyncio
async def test_validation_error_handler(client: AsyncClient) -> None:
    """RequestValidationError should return 422 with structured errors."""
    response = await client.post(
        "/_test/validation-error",
        json={"name": 123},  # wrong type, missing age
    )
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "validationErrors" in data["error"]
    assert len(data["error"]["validationErrors"]) > 0
