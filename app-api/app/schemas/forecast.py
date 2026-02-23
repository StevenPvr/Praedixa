"""Forecast schemas — request/response models.

Maps to shared-types: ForecastRun, DailyForecast, ForecastMetrics.
Also includes compatibility models used by legacy frontend endpoints:
- ForecastSummary
- WhatIfResult
"""

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import ConfigDict, Field

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
    capacity_planned_current: float
    capacity_planned_predicted: float
    capacity_optimal_predicted: float
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


class ForecastPeriod(CamelModel):
    """Date range for forecast summary periods."""

    start_date: date
    end_date: date


class ForecastRiskIndicators(CamelModel):
    """Risk indicators compatible with shared frontend ForecastSummary types."""

    understaffing_risk: float
    operational_impact: float
    critical_roles_at_risk: int
    departments_at_risk: list[uuid.UUID] = Field(default_factory=list)
    risk_level: Literal["low", "medium", "high", "critical"]


class DailyForecastCompatRead(CamelModel):
    """Frontend-compatible daily forecast shape (legacy contract)."""

    forecast_run_id: uuid.UUID
    date: date
    department_id: uuid.UUID | None = None
    predicted_absences: float
    predicted_absence_rate: float
    lower_bound: float
    upper_bound: float
    confidence: Literal["low", "medium", "high"]
    by_type: dict[str, float] = Field(default_factory=dict)
    by_category: dict[str, float] = Field(default_factory=dict)
    risk_indicators: ForecastRiskIndicators


class ForecastSummaryRead(CamelModel):
    """Frontend-compatible forecast summary shape (legacy contract)."""

    period: ForecastPeriod
    granularity: Literal["day"] = "day"
    avg_absence_rate: float
    total_absence_days: float
    peak_date: date | None = None
    peak_count: float
    high_risk_days_count: int
    overall_confidence: Literal["low", "medium", "high"]
    daily_forecasts: list[DailyForecastCompatRead]


class WhatIfAdditionalAbsence(CamelModel):
    """Additional planned absences passed to what-if scenarios."""

    model_config = ConfigDict(extra="forbid")

    employee_id: uuid.UUID
    start_date: date
    end_date: date
    type: str = Field(min_length=1, max_length=100)


class WhatIfScenarioRequest(CamelModel):
    """What-if input payload compatible with shared frontend types."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    absence_rate_modifier: float | None = Field(default=None, ge=0)
    type_modifiers: dict[str, float] | None = None
    additional_absences: list[WhatIfAdditionalAbsence] | None = None


class WhatIfScenarioRead(CamelModel):
    """Echoed what-if scenario after server-side normalization."""

    name: str
    description: str | None = None
    absence_rate_modifier: float | None = None
    type_modifiers: dict[str, float] | None = None
    additional_absences: list[WhatIfAdditionalAbsence] = Field(default_factory=list)


class WhatIfImpactRead(CamelModel):
    """Delta between baseline and scenario forecasts."""

    absence_rate_change: float
    additional_risk_days: int
    cost_impact: float | None = None


class WhatIfResultRead(CamelModel):
    """Full what-if response payload compatible with frontend shared types."""

    scenario: WhatIfScenarioRead
    baseline_forecast: ForecastSummaryRead
    scenario_forecast: ForecastSummaryRead
    impact: WhatIfImpactRead
