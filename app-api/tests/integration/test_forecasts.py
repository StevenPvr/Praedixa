"""Integration tests for forecast endpoints."""

import uuid
from datetime import UTC, date, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient

from app.core.exceptions import NotFoundError
from app.models.forecast_run import ForecastModelType, ForecastStatus


def _make_mock_forecast_run(
    run_id: uuid.UUID | None = None,
    status: ForecastStatus = ForecastStatus.COMPLETED,
) -> SimpleNamespace:
    """Create a mock ForecastRun ORM object."""
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=run_id or uuid.uuid4(),
        organization_id=uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001"),
        model_type=ForecastModelType.ENSEMBLE,
        model_version="1.0.0",
        horizon_days=14,
        status=status,
        started_at=datetime(2026, 2, 5, 12, 0, tzinfo=UTC),
        completed_at=datetime(2026, 2, 5, 13, 0, tzinfo=UTC),
        accuracy_score=0.92,
        error_message=None,
        department_id=None,
        config={},
        created_at=now,
        updated_at=now,
    )


def _make_mock_daily_forecast(
    forecast_date_str: str = "2026-02-05",
) -> SimpleNamespace:
    """Create a mock DailyForecast ORM object."""
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001"),
        forecast_run_id=uuid.uuid4(),
        department_id=None,
        forecast_date=date.fromisoformat(forecast_date_str),
        dimension="human",
        predicted_demand=120.0,
        predicted_capacity=110.0,
        capacity_planned_current=115.0,
        capacity_planned_predicted=110.0,
        capacity_optimal_predicted=120.0,
        gap=-10.0,
        risk_score=0.35,
        confidence_lower=108.0,
        confidence_upper=132.0,
        details={},
        created_at=now,
        updated_at=now,
    )


async def test_list_forecasts_200(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts returns paginated forecast runs."""
    runs = [_make_mock_forecast_run() for _ in range(3)]

    with patch(
        "app.routers.forecasts.list_forecasts",
        new_callable=AsyncMock,
        return_value=(runs, 3),
    ):
        response = await client_a.get("/api/v1/forecasts")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 3
    assert data["pagination"]["total"] == 3
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["pageSize"] == 20


async def test_list_forecasts_pagination(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts respects page and page_size params."""
    runs = [_make_mock_forecast_run()]

    with patch(
        "app.routers.forecasts.list_forecasts",
        new_callable=AsyncMock,
        return_value=(runs, 10),
    ):
        response = await client_a.get("/api/v1/forecasts?page=2&page_size=5")

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["pageSize"] == 5
    assert data["pagination"]["totalPages"] == 2
    assert data["pagination"]["hasNextPage"] is False
    assert data["pagination"]["hasPreviousPage"] is True


async def test_list_forecasts_status_filter(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts filters by status."""
    runs = [_make_mock_forecast_run(status=ForecastStatus.COMPLETED)]

    with patch(
        "app.routers.forecasts.list_forecasts",
        new_callable=AsyncMock,
        return_value=(runs, 1),
    ) as mock_fn:
        response = await client_a.get("/api/v1/forecasts?status=completed")

    assert response.status_code == 200
    call_kwargs = mock_fn.call_args
    assert call_kwargs.kwargs["status_filter"] == ForecastStatus.COMPLETED


async def test_daily_forecasts_200(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts/{run_id}/daily returns daily data."""
    run_id = uuid.uuid4()
    forecasts = [_make_mock_daily_forecast()]

    with patch(
        "app.routers.forecasts.get_daily_forecasts",
        new_callable=AsyncMock,
        return_value=forecasts,
    ):
        response = await client_a.get(f"/api/v1/forecasts/{run_id}/daily")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 1


async def test_latest_daily_forecasts_200(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts/latest/daily returns latest run daily data."""
    forecasts = [_make_mock_daily_forecast()]

    with patch(
        "app.routers.forecasts.get_latest_daily_forecasts",
        new_callable=AsyncMock,
        return_value=forecasts,
    ) as mock_fn:
        response = await client_a.get("/api/v1/forecasts/latest/daily?dimension=human")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 1
    assert mock_fn.call_args.kwargs["dimension"].value == "human"


async def test_latest_daily_forecasts_empty_list(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts/latest/daily returns empty list when no run exists."""
    with patch(
        "app.routers.forecasts.get_latest_daily_forecasts",
        new_callable=AsyncMock,
        return_value=[],
    ):
        response = await client_a.get("/api/v1/forecasts/latest/daily")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []


async def test_daily_forecasts_404_not_found(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts/{run_id}/daily returns 404 if run not found."""
    run_id = uuid.uuid4()

    with patch(
        "app.routers.forecasts.get_daily_forecasts",
        new_callable=AsyncMock,
        side_effect=NotFoundError("ForecastRun", str(run_id)),
    ):
        response = await client_a.get(f"/api/v1/forecasts/{run_id}/daily")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


async def test_list_forecasts_401_no_auth(unauth_client: AsyncClient) -> None:
    """GET /api/v1/forecasts returns 401 without auth."""
    response = await unauth_client.get("/api/v1/forecasts")
    assert response.status_code == 401


async def test_daily_forecasts_invalid_date_range(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts/{run_id}/daily rejects start_date > end_date."""
    run_id = uuid.uuid4()
    response = await client_a.get(
        f"/api/v1/forecasts/{run_id}/daily?start_date=2026-02-10&end_date=2026-02-05"
    )
    assert response.status_code == 422


async def test_list_forecasts_invalid_page_size(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts rejects page_size > 100."""
    response = await client_a.get("/api/v1/forecasts?page_size=200")
    assert response.status_code == 422


async def test_forecast_summary_200(client_a: AsyncClient) -> None:
    """GET /api/v1/forecasts/{run_id}/summary returns compatibility payload."""
    run_id = uuid.uuid4()
    forecasts = [
        _make_mock_daily_forecast("2026-02-05"),
        _make_mock_daily_forecast("2026-02-06"),
    ]
    for forecast in forecasts:
        forecast.forecast_run_id = run_id

    with patch(
        "app.routers.forecasts.get_daily_forecasts",
        new_callable=AsyncMock,
        return_value=forecasts,
    ):
        response = await client_a.get(f"/api/v1/forecasts/{run_id}/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["period"]["startDate"] == "2026-02-05"
    assert body["data"]["period"]["endDate"] == "2026-02-06"
    assert len(body["data"]["dailyForecasts"]) == 2
    assert body["data"]["dailyForecasts"][0]["forecastRunId"] == str(run_id)


async def test_forecast_what_if_200(client_a: AsyncClient) -> None:
    """POST /api/v1/forecasts/what-if returns baseline + scenario summaries."""
    run_id = uuid.uuid4()
    baseline = [_make_mock_daily_forecast("2026-02-07")]
    baseline[0].forecast_run_id = run_id

    with patch(
        "app.routers.forecasts.get_latest_daily_forecasts",
        new_callable=AsyncMock,
        return_value=baseline,
    ):
        response = await client_a.post(
            "/api/v1/forecasts/what-if",
            json={
                "name": "Stress test",
                "description": "Peak season simulation",
                "absenceRateModifier": 1.2,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["scenario"]["name"] == "Stress test"
    assert "baselineForecast" in body["data"]
    assert "scenarioForecast" in body["data"]
    assert "impact" in body["data"]
    assert body["data"]["impact"]["absenceRateChange"] >= 0
