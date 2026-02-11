"""Integration tests for /api/v1/product-events/batch."""

from unittest.mock import patch

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user
from app.main import app


def _jwt() -> JWTPayload:
    return JWTPayload(
        user_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        email="ux@test.com",
        organization_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        role="manager",
    )


async def _make_client() -> AsyncClient:
    app.dependency_overrides[get_current_user] = _jwt
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


async def test_ingest_product_events_200() -> None:
    """POST accepts a valid batch and logs every event."""
    with patch("app.routers.product_events.logger.info") as mock_log:
        async with await _make_client() as client:
            response = await client.post(
                "/api/v1/product-events/batch",
                json={
                    "events": [
                        {
                            "name": "decision_queue_opened",
                            "context": {"alertCount": 12},
                        },
                        {
                            "name": "time_to_decision_ms",
                            "occurredAt": "2026-01-22T10:00:00Z",
                            "context": {
                                "nested": {"a": [1, 2, 3]},
                                "note": "x" * 300,
                            },
                        },
                    ]
                },
            )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["accepted"] == 2
    assert mock_log.call_count == 2
    second_context = mock_log.call_args_list[1].kwargs["context"]
    assert second_context["note"] == "x" * 200


async def test_ingest_product_events_422_empty_events() -> None:
    """POST validates minimum list length."""
    async with await _make_client() as client:
        response = await client.post(
            "/api/v1/product-events/batch",
            json={"events": []},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 422


async def test_ingest_product_events_401_no_auth() -> None:
    """Endpoint requires authentication."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/product-events/batch",
            json={"events": [{"name": "decision_queue_opened"}]},
        )
    app.dependency_overrides.clear()
    assert response.status_code == 401
