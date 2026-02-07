"""Forecast schemas — request/response models.

Maps to shared-types: ForecastRun, DailyForecast, ForecastMetrics.
"""

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import ConfigDict

from app.models.daily_forecast import ForecastDimension
from app.models.forecast_run import ForecastModelType, ForecastStatus
from app.schemas.base import CamelModel, TenantEntitySchema


class ForecastRunRead(TenantEntitySchema):
    """Full forecast run response."""

    model_type: ForecastModelType
    model_version: str | None = None
    horizon_days: int
    status: ForecastStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    accuracy_score: float | None = None
    error_message: str | None = None
    department_id: uuid.UUID | None = None
    config: dict[str, Any]


class ForecastRunSummary(CamelModel):
    """Lightweight forecast run for listings."""

    id: uuid.UUID
    model_type: ForecastModelType
    horizon_days: int
    status: ForecastStatus
    accuracy_score: float | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class DailyForecastRead(TenantEntitySchema):
    """Full daily forecast response."""

    forecast_run_id: uuid.UUID
    department_id: uuid.UUID | None = None
    forecast_date: date
    dimension: ForecastDimension
    predicted_demand: float
    predicted_capacity: float
    gap: float
    risk_score: float
    confidence_lower: float
    confidence_upper: float
    details: dict[str, Any]


class ForecastRequest(CamelModel):
    """Request a new forecast run."""

    model_config = ConfigDict(extra="forbid")

    horizon_days: int
    model_type: ForecastModelType | None = None
    department_id: uuid.UUID | None = None
