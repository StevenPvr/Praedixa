"""Integration tests for analytics compatibility endpoints."""

from datetime import date
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient

from app.services.analytics import CostImpactAnalysisResult


async def test_costs_analysis_200(client_a: AsyncClient) -> None:
    """GET /api/v1/analytics/costs returns compatibility payload."""
    result = CostImpactAnalysisResult(
        start_date=date(2026, 1, 1),
        end_date=date(2026, 1, 31),
        department_id="aaaaaaaa-0000-0000-0000-000000000111",
        direct_replacement=1200.0,
        direct_overtime=800.0,
        direct_external=500.0,
        indirect_productivity=300.0,
        indirect_management=125.0,
        indirect_training=200.0,
        total_cost=3125.0,
        cost_per_absence_day=156.25,
        previous_period_cost=2500.0,
        percentage_change=25.0,
    )

    with patch(
        "app.routers.analytics.get_cost_impact_analysis",
        new_callable=AsyncMock,
        return_value=result,
    ):
        response = await client_a.get(
            "/api/v1/analytics/costs?"
            "startDate=2026-01-01&endDate=2026-01-31&"
            "departmentId=aaaaaaaa-0000-0000-0000-000000000111"
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["period"]["startDate"] == "2026-01-01"
    assert body["data"]["directCosts"]["replacementCosts"] == 1200.0
    assert body["data"]["comparison"]["percentageChange"] == 25.0


async def test_costs_analysis_invalid_date_range(client_a: AsyncClient) -> None:
    """GET /api/v1/analytics/costs rejects invalid date ranges."""
    with patch(
        "app.routers.analytics.get_cost_impact_analysis",
        new_callable=AsyncMock,
        side_effect=ValueError("startDate must be before or equal to endDate"),
    ):
        response = await client_a.get(
            "/api/v1/analytics/costs?startDate=2026-02-01&endDate=2026-01-01"
        )

    assert response.status_code == 422


async def test_costs_analysis_401_no_auth(unauth_client: AsyncClient) -> None:
    """GET /api/v1/analytics/costs requires authentication."""
    response = await unauth_client.get("/api/v1/analytics/costs")
    assert response.status_code == 401
