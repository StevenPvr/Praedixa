"""Integration tests for exports compatibility endpoints."""

from httpx import AsyncClient


async def test_request_export_202(client_a: AsyncClient) -> None:
    """POST /api/v1/exports/{resource} accepts a supported export."""
    response = await client_a.post(
        "/api/v1/exports/forecasts",
        json={
            "format": "csv",
            "dateRange": {"startDate": "2026-01-01", "endDate": "2026-01-31"},
            "filters": {"status": "completed"},
            "columns": ["id", "status"],
            "includeHeaders": True,
        },
    )

    assert response.status_code == 202
    body = response.json()
    assert body["success"] is True
    assert body["data"]["success"] is True
    assert body["data"]["status"] == "pending"
    assert body["data"]["format"] == "csv"
    assert "exportId" in body["data"]


async def test_request_export_rejects_unsupported_resource(
    client_a: AsyncClient,
) -> None:
    """POST /api/v1/exports/{resource} rejects unknown resources."""
    response = await client_a.post(
        "/api/v1/exports/unsupported-resource",
        json={"format": "json"},
    )
    assert response.status_code == 404


async def test_request_export_401_no_auth(unauth_client: AsyncClient) -> None:
    """POST /api/v1/exports/{resource} requires authentication."""
    response = await unauth_client.post(
        "/api/v1/exports/forecasts",
        json={"format": "csv"},
    )
    assert response.status_code == 401
