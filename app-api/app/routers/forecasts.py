"""Forecasts router — list runs and daily forecast data.

Security:
- All endpoints require authentication.
- TenantFilter enforces org-scoped data access.
- Pagination limits enforced: page_size capped at 100.
- UUID path params are validated by Pydantic/FastAPI automatically.
- ForecastStatus and ForecastDimension are enum-validated (no freeform input).
- Date range validation: start_date must be <= end_date when both are provided.
"""

import uuid
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.models.daily_forecast import DailyForecast, ForecastDimension
from app.models.forecast_run import ForecastStatus
from app.schemas.forecast import (
    DailyForecastCompatRead,
    DailyForecastRead,
    ForecastPeriod,
    ForecastRiskIndicators,
    ForecastRunSummary,
    ForecastSummaryRead,
    WhatIfImpactRead,
    WhatIfResultRead,
    WhatIfScenarioRead,
    WhatIfScenarioRequest,
)
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
)
from app.services.forecasts import (
    get_daily_forecasts,
    get_latest_daily_forecasts,
    list_forecasts,
)

router = APIRouter(prefix="/api/v1/forecasts", tags=["forecasts"])

# Hard cap to prevent resource exhaustion via large page_size
MAX_PAGE_SIZE = 100
_HIGH_RISK_SCORE = 0.7
_CRITICAL_RISK_SCORE = 0.85
_MEDIUM_RISK_SCORE = 0.4
_LOW_CONFIDENCE_WIDTH_RATIO = 0.35
_HIGH_CONFIDENCE_WIDTH_RATIO = 0.15


def _risk_level(score: float) -> str:
    if score >= _CRITICAL_RISK_SCORE:
        return "critical"
    if score >= _HIGH_RISK_SCORE:
        return "high"
    if score >= _MEDIUM_RISK_SCORE:
        return "medium"
    return "low"


def _confidence_label(
    predicted_absences: float,
    lower_bound: float,
    upper_bound: float,
) -> str:
    interval_width = abs(upper_bound - lower_bound)
    baseline = max(predicted_absences, 1.0)
    width_ratio = interval_width / baseline

    if width_ratio <= _HIGH_CONFIDENCE_WIDTH_RATIO:
        return "high"
    if width_ratio <= _LOW_CONFIDENCE_WIDTH_RATIO:
        return "medium"
    return "low"


def _to_compat_daily(item: DailyForecast) -> DailyForecastCompatRead:
    predicted_absences = float(item.predicted_demand)
    predicted_capacity = float(item.predicted_capacity)
    lower_bound = float(item.confidence_lower)
    upper_bound = float(item.confidence_upper)
    risk_score = float(item.risk_score)
    predicted_absence_rate = (
        round((predicted_absences / predicted_capacity) * 100, 2)
        if predicted_capacity > 0
        else 0.0
    )
    confidence = _confidence_label(predicted_absences, lower_bound, upper_bound)
    details = item.details or {}
    by_type = details.get("by_type") if isinstance(details, dict) else None
    by_category = details.get("by_category") if isinstance(details, dict) else None
    normalized_by_type = (
        {str(k): float(v) for k, v in by_type.items()}
        if isinstance(by_type, dict)
        else {}
    )
    normalized_by_category = (
        {str(k): float(v) for k, v in by_category.items()}
        if isinstance(by_category, dict)
        else {}
    )

    return DailyForecastCompatRead(
        forecast_run_id=item.forecast_run_id,
        date=item.forecast_date,
        department_id=item.department_id,
        predicted_absences=round(predicted_absences, 2),
        predicted_absence_rate=predicted_absence_rate,
        lower_bound=round(lower_bound, 2),
        upper_bound=round(upper_bound, 2),
        confidence=confidence,
        by_type=normalized_by_type,
        by_category=normalized_by_category,
        risk_indicators=ForecastRiskIndicators(
            understaffing_risk=round(risk_score * 100, 2),
            operational_impact=round(float(item.gap), 2),
            critical_roles_at_risk=1 if risk_score >= _HIGH_RISK_SCORE else 0,
            departments_at_risk=[],
            risk_level=_risk_level(risk_score),
        ),
    )


def _overall_confidence(values: list[DailyForecastCompatRead]) -> str:
    if not values:
        return "high"
    counts = {"high": 0, "medium": 0, "low": 0}
    for value in values:
        counts[value.confidence] = counts.get(value.confidence, 0) + 1
    if counts["low"] > 0:
        return "low"
    if counts["medium"] > 0:
        return "medium"
    return "high"


def _build_summary(
    run_id: uuid.UUID | None,
    values: list[DailyForecastCompatRead],
) -> ForecastSummaryRead:
    if not values:
        today = datetime.now(tz=UTC).date()
        return ForecastSummaryRead(
            period=ForecastPeriod(start_date=today, end_date=today),
            avg_absence_rate=0.0,
            total_absence_days=0.0,
            peak_date=None,
            peak_count=0.0,
            high_risk_days_count=0,
            overall_confidence="high",
            daily_forecasts=[],
        )

    start_date = min(item.date for item in values)
    end_date = max(item.date for item in values)
    avg_absence_rate = round(
        sum(item.predicted_absence_rate for item in values) / len(values), 2
    )
    total_absence_days = round(sum(item.predicted_absences for item in values), 2)
    peak = max(values, key=lambda item: item.predicted_absences)
    high_risk_days_count = sum(
        1
        for item in values
        if item.risk_indicators.risk_level in {"high", "critical"}
    )

    normalized_values = values
    if run_id is not None:
        normalized_values = [
            item.model_copy(update={"forecast_run_id": run_id}) for item in values
        ]

    return ForecastSummaryRead(
        period=ForecastPeriod(start_date=start_date, end_date=end_date),
        avg_absence_rate=avg_absence_rate,
        total_absence_days=total_absence_days,
        peak_date=peak.date,
        peak_count=round(peak.predicted_absences, 2),
        high_risk_days_count=high_risk_days_count,
        overall_confidence=_overall_confidence(normalized_values),
        daily_forecasts=normalized_values,
    )


@router.get("")
async def list_forecast_runs(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(
        default=20, ge=1, le=MAX_PAGE_SIZE, description="Items per page"
    ),
    status: ForecastStatus | None = Query(default=None, description="Filter by status"),
) -> PaginatedResponse[ForecastRunSummary]:
    """Return paginated forecast runs for the current organization."""
    offset = (page - 1) * page_size

    items, total = await list_forecasts(
        tenant=tenant,
        session=session,
        limit=page_size,
        offset=offset,
        status_filter=status,
    )

    data = [ForecastRunSummary.model_validate(item) for item in items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/latest/daily")
async def get_latest_daily_forecast_data(
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
    dimension: ForecastDimension | None = Query(
        default=None,
        description="Filter by dimension",
    ),
) -> ApiResponse[list[DailyForecastRead]]:
    """Return daily forecasts for the latest completed run of this organization."""
    items = await get_latest_daily_forecasts(
        tenant=tenant,
        session=session,
        dimension=dimension,
    )

    return ApiResponse(
        success=True,
        data=[DailyForecastRead.model_validate(item) for item in items],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{run_id}/daily")
async def get_daily_forecast_data(
    run_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
    dimension: ForecastDimension | None = Query(
        default=None, description="Filter by dimension"
    ),
    start_date: date | None = Query(default=None, description="Start date (inclusive)"),
    end_date: date | None = Query(default=None, description="End date (inclusive)"),
) -> ApiResponse[list[DailyForecastRead]]:
    """Return daily forecasts for a specific run."""
    # Validate date range: start_date must be <= end_date
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="start_date must be before or equal to end_date",
        )

    items = await get_daily_forecasts(
        run_id=run_id,
        tenant=tenant,
        session=session,
        dimension=dimension,
        date_from=start_date,
        date_to=end_date,
    )

    return ApiResponse(
        success=True,
        data=[DailyForecastRead.model_validate(item) for item in items],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/{run_id}/summary")
async def get_forecast_summary(
    run_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
    dimension: ForecastDimension | None = Query(
        default=None,
        description="Optional dimension filter",
    ),
) -> ApiResponse[ForecastSummaryRead]:
    """Return a legacy-compatible summary for a forecast run."""
    daily = await get_daily_forecasts(
        run_id=run_id,
        tenant=tenant,
        session=session,
        dimension=dimension,
    )
    compat_values = [_to_compat_daily(item) for item in daily]
    summary = _build_summary(run_id, compat_values)

    return ApiResponse(
        success=True,
        data=summary,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/what-if")
async def run_what_if_scenario(
    body: WhatIfScenarioRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[WhatIfResultRead]:
    """Run a lightweight what-if simulation on top of latest daily forecasts."""
    baseline_daily = await get_latest_daily_forecasts(
        tenant=tenant,
        session=session,
        dimension=None,
    )
    baseline_compat = [_to_compat_daily(item) for item in baseline_daily]
    baseline_summary = _build_summary(None, baseline_compat)

    absence_rate_modifier = body.absence_rate_modifier or 1.0
    normalized_type_modifiers = body.type_modifiers or {}
    type_multiplier = 1.0
    if normalized_type_modifiers:
        values = [
            max(0.0, float(value))
            for value in normalized_type_modifiers.values()
        ]
        if values:
            type_multiplier = sum(values) / len(values)

    additional_absences = body.additional_absences or []
    additional_absence_multiplier = (
        1.0 + (len(additional_absences) / max(len(baseline_compat), 1) * 0.05)
    )
    total_multiplier = (
        absence_rate_modifier * type_multiplier * additional_absence_multiplier
    )

    scenario_daily: list[DailyForecastCompatRead] = []
    for item in baseline_compat:
        predicted_absences = round(item.predicted_absences * total_multiplier, 2)
        predicted_absence_rate = round(
            item.predicted_absence_rate * total_multiplier,
            2,
        )
        lower_bound = round(item.lower_bound * total_multiplier, 2)
        upper_bound = round(item.upper_bound * total_multiplier, 2)
        adjusted_risk = max(
            0.0,
            min(100.0, item.risk_indicators.understaffing_risk * total_multiplier),
        )

        scenario_daily.append(
            item.model_copy(
                update={
                    "predicted_absences": predicted_absences,
                    "predicted_absence_rate": predicted_absence_rate,
                    "lower_bound": lower_bound,
                    "upper_bound": upper_bound,
                    "confidence": _confidence_label(
                        predicted_absences,
                        lower_bound,
                        upper_bound,
                    ),
                    "risk_indicators": ForecastRiskIndicators(
                        understaffing_risk=round(adjusted_risk, 2),
                        operational_impact=round(
                            item.risk_indicators.operational_impact * total_multiplier,
                            2,
                        ),
                        critical_roles_at_risk=(
                            1 if adjusted_risk / 100 >= _HIGH_RISK_SCORE else 0
                        ),
                        departments_at_risk=item.risk_indicators.departments_at_risk,
                        risk_level=_risk_level(adjusted_risk / 100),
                    ),
                }
            )
        )

    scenario_summary = _build_summary(None, scenario_daily)
    baseline_risk_days = sum(
        1
        for item in baseline_summary.daily_forecasts
        if item.risk_indicators.risk_level in {"high", "critical"}
    )
    scenario_risk_days = sum(
        1
        for item in scenario_summary.daily_forecasts
        if item.risk_indicators.risk_level in {"high", "critical"}
    )

    result = WhatIfResultRead(
        scenario=WhatIfScenarioRead(
            name=body.name,
            description=body.description,
            absence_rate_modifier=body.absence_rate_modifier,
            type_modifiers=body.type_modifiers,
            additional_absences=additional_absences,
        ),
        baseline_forecast=baseline_summary,
        scenario_forecast=scenario_summary,
        impact=WhatIfImpactRead(
            absence_rate_change=round(
                scenario_summary.avg_absence_rate - baseline_summary.avg_absence_rate,
                2,
            ),
            additional_risk_days=scenario_risk_days - baseline_risk_days,
            cost_impact=round(
                (
                    scenario_summary.total_absence_days
                    - baseline_summary.total_absence_days
                )
                * 120.0,
                2,
            ),
        ),
    )

    return ApiResponse(
        success=True,
        data=result,
        timestamp=datetime.now(UTC).isoformat(),
    )
