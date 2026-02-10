"""Integration tests for dashboard endpoints."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient

from app.services.dashboard import DashboardSummary


async def test_dashboard_summary_200(client_a: AsyncClient) -> None:
    """GET /api/v1/dashboard/summary returns 200 with KPIs."""
    mock_summary = DashboardSummary(
        coverage_human=92.5,
        coverage_merchandise=87.3,
        active_alerts_count=3,
        forecast_accuracy=0.92,
        last_forecast_date=datetime(2026, 2, 5, 14, 0, tzinfo=UTC),
    )

    with patch(
        "app.routers.dashboard.get_dashboard_summary",
        new_callable=AsyncMock,
        return_value=mock_summary,
    ):
        response = await client_a.get("/api/v1/dashboard/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["coverageHuman"] == 92.5
    assert data["data"]["coverageMerchandise"] == 87.3
    assert data["data"]["activeAlertsCount"] == 3
    assert data["data"]["forecastAccuracy"] == 0.92
    assert data["data"]["lastForecastDate"] is not None
    assert "timestamp" in data


async def test_dashboard_summary_empty_db(client_a: AsyncClient) -> None:
    """GET /api/v1/dashboard/summary returns defaults when DB is empty."""
    mock_summary = DashboardSummary(
        coverage_human=0.0,
        coverage_merchandise=0.0,
        active_alerts_count=0,
        forecast_accuracy=None,
        last_forecast_date=None,
    )

    with patch(
        "app.routers.dashboard.get_dashboard_summary",
        new_callable=AsyncMock,
        return_value=mock_summary,
    ):
        response = await client_a.get("/api/v1/dashboard/summary")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["coverageHuman"] == 0.0
    assert data["coverageMerchandise"] == 0.0
    assert data["activeAlertsCount"] == 0
    assert data["forecastAccuracy"] is None
    assert data["lastForecastDate"] is None


async def test_dashboard_summary_401_no_auth(unauth_client: AsyncClient) -> None:
    """GET /api/v1/dashboard/summary returns 401 without auth."""
    response = await unauth_client.get("/api/v1/dashboard/summary")
    assert response.status_code == 401
