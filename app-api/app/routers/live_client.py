"""Live client endpoints backed by medallion Gold + mock forecast signals."""
# ruff: noqa: TC001, TC002

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_site_filter,
    get_tenant_filter,
)
from app.core.exceptions import NotFoundError
from app.core.security import SiteFilter, TenantFilter
from app.models.daily_forecast import ForecastDimension
from app.models.forecast_run import ForecastStatus
from app.models.operational import (
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
    ShiftType,
)
from app.schemas.dashboard import DashboardSummaryResponse
from app.schemas.forecast import DailyForecastRead, ForecastRunSummary
from app.schemas.operational import (
    CanonicalQualityDashboard,
    CanonicalRecordRead,
    CoverageAlertRead,
    ParetoFrontierResponse,
    ProofRecordRead,
    ScenarioOptionRead,
)
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
)
from app.schemas.ux import (
    DecisionDiagnosticRead,
    DecisionQueueItemRead,
    DecisionWorkspaceRead,
    GoldCoverageRead,
    GoldProvenanceRead,
    GoldSchemaRead,
    MlMonitoringPointRead,
    MlMonitoringSummaryRead,
    OnboardingStatusRead,
)
from app.services.cost_parameter_service import get_effective_cost_parameter
from app.services.gold_live_data import (
    build_canonical_quality,
    build_canonical_records,
    build_client_onboarding_status,
    build_coverage_alerts,
    build_daily_forecasts,
    build_dashboard_summary,
    build_forecast_runs,
    build_gold_coverage,
    build_gold_provenance,
    build_gold_schema,
    build_ml_monitoring_summary,
    build_ml_monitoring_trend,
    build_proof_records,
    filter_rows,
    get_gold_snapshot,
    resolve_client_slug_for_org,
    resolve_site_code_for_filter,
)
from app.services.scenario_engine_service import (
    build_scenario_option_blueprints,
    compute_pareto_frontier,
    select_recommendation,
)

router = APIRouter(prefix="/api/v1/live", tags=["live-client"])

_HORIZON_TO_HOURS = {
    Horizon.J3: 72,
    Horizon.J7: 168,
    Horizon.J14: 336,
}
_SEVERITY_SCORE = {
    CoverageAlertSeverity.CRITICAL: 4.0,
    CoverageAlertSeverity.HIGH: 3.0,
    CoverageAlertSeverity.MEDIUM: 2.0,
    CoverageAlertSeverity.LOW: 1.0,
}
_MAX_QUEUE_DRIVERS = 5
_RISK_WORSENING_THRESHOLD = 0.65
_RISK_IMPROVING_THRESHOLD = 0.35


async def _scoped_rows(
    *,
    session: AsyncSession,
    tenant: TenantFilter,
    site_filter: SiteFilter,
    requested_site: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[uuid.UUID, list[dict[str, Any]]]:
    snapshot = get_gold_snapshot()
    org_id = uuid.UUID(tenant.organization_id)
    available_client_slugs: set[str] = set()
    client_site_codes: dict[str, set[str]] = {}
    for row in snapshot.rows:
        client_slug = str(row.get("client_slug") or "").strip()
        if not client_slug:
            continue
        available_client_slugs.add(client_slug)
        site_code = str(row.get("site_code") or "").strip().upper()
        if site_code:
            client_site_codes.setdefault(client_slug, set()).add(site_code)

    client_slug = await resolve_client_slug_for_org(
        session,
        org_id,
        available_client_slugs,
        client_site_codes,
    )
    if client_slug is None:
        return org_id, []

    site_code = await resolve_site_code_for_filter(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=requested_site,
        allowed_site_codes=client_site_codes.get(client_slug, set()),
    )
    rows = filter_rows(
        snapshot.rows,
        client_slug=client_slug,
        site_code=site_code,
        date_from=date_from,
        date_to=date_to,
    )
    return org_id, rows


def _paginate[T](items: list[T], page: int, page_size: int) -> tuple[list[T], int]:
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return items[start:end], total


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, Decimal):
        return float(value)
    return None


def _serialize_gold_value(value: Any) -> Any:
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def _serialize_gold_row(row: dict[str, Any], columns: list[str]) -> dict[str, Any]:
    return {column: _serialize_gold_value(row.get(column)) for column in columns}


def _row_matches_search(row: dict[str, Any], token: str) -> bool:
    lower_token = token.strip().lower()
    if not lower_token:
        return True
    for value in row.values():
        if value is None:
            continue
        if lower_token in str(value).lower():
            return True
    return False


def _queue_drivers(alert: dict[str, Any]) -> list[str]:
    drivers: list[str] = []
    for item in alert.get("drivers_json", []):
        if not isinstance(item, str):
            continue
        token = item.strip()
        if not token:
            continue
        drivers.append(token[:120])
        if len(drivers) >= _MAX_QUEUE_DRIVERS:
            break
    return drivers


def _queue_impact_eur(alert: dict[str, Any]) -> float:
    model_impact = _as_float(alert.get("impact_eur"))
    if model_impact is not None:
        return model_impact
    gap_h = _as_float(alert.get("gap_h")) or 0.0
    return gap_h * 45.0


def _queue_time_to_breach_hours(alert: dict[str, Any]) -> float:
    raw_horizon = str(alert.get("horizon") or Horizon.J7.value)
    try:
        horizon = Horizon(raw_horizon)
    except ValueError:
        horizon = Horizon.J7
    horizon_hours = _HORIZON_TO_HOURS[horizon]
    rupture = _as_float(alert.get("p_rupture")) or 0.0
    rupture = max(0.0, min(1.0, rupture))
    return round(horizon_hours * (1.0 - rupture), 1)


def _queue_priority_score(alert: dict[str, Any]) -> float:
    raw_severity = str(alert.get("severity") or CoverageAlertSeverity.LOW.value)
    severity = CoverageAlertSeverity(raw_severity)
    severity_score = _SEVERITY_SCORE[severity]
    rupture = _as_float(alert.get("p_rupture")) or 0.0
    gap_h = _as_float(alert.get("gap_h")) or 0.0
    impact_k = _queue_impact_eur(alert) / 1000.0
    return round((severity_score * 100.0) + (rupture * 100.0) + gap_h + impact_k, 2)


def _build_queue_items(
    alerts: list[dict[str, Any]],
    *,
    limit: int,
) -> list[DecisionQueueItemRead]:
    items = [
        DecisionQueueItemRead(
            id=alert["id"],
            site_id=str(alert.get("site_id") or ""),
            alert_date=alert["alert_date"],
            shift=alert["shift"],
            severity=alert["severity"],
            horizon=alert.get("horizon"),
            gap_h=float(alert.get("gap_h") or 0.0),
            p_rupture=_as_float(alert.get("p_rupture")),
            drivers_json=_queue_drivers(alert),
            priority_score=_queue_priority_score(alert),
            estimated_impact_eur=round(_queue_impact_eur(alert), 2),
            time_to_breach_hours=_queue_time_to_breach_hours(alert),
        )
        for alert in alerts
    ]
    items.sort(
        key=lambda item: (
            item.priority_score or 0.0,
            item.estimated_impact_eur or 0.0,
            item.gap_h,
        ),
        reverse=True,
    )
    return items[:limit]


def _build_live_diagnostic(alert: dict[str, Any]) -> DecisionDiagnosticRead:
    rupture = _as_float(alert.get("p_rupture"))
    confidence_pct = None
    risk_trend: str | None = None
    note: str | None = None
    if rupture is not None:
        rupture = max(0.0, min(1.0, rupture))
        confidence_pct = round(rupture * 100.0, 1)
        if rupture >= _RISK_WORSENING_THRESHOLD:
            risk_trend = "worsening"
            note = "High rupture probability. Prioritize action today."
        elif rupture <= _RISK_IMPROVING_THRESHOLD:
            risk_trend = "improving"
            note = "Risk is relatively contained but should be monitored."
        else:
            risk_trend = "stable"
            note = "Risk remains material. Keep monitoring this alert."

    return DecisionDiagnosticRead(
        top_drivers=_queue_drivers(alert),
        confidence_pct=confidence_pct,
        risk_trend=risk_trend,
        note=note,
    )


async def _build_live_pareto(
    *,
    session: AsyncSession,
    tenant: TenantFilter,
    organization_id: uuid.UUID,
    alert: dict[str, Any],
) -> ParetoFrontierResponse:
    alert_id = uuid.UUID(str(alert["id"]))
    target_date = alert.get("alert_date")
    if not isinstance(target_date, date):
        raise NotFoundError("CoverageAlert", str(alert_id))
    site_id = alert.get("site_id")
    scoped_site = site_id if isinstance(site_id, str) and site_id.strip() else None
    cost_param = await get_effective_cost_parameter(
        session,
        tenant,
        site_id=scoped_site,
        target_date=target_date,
    )

    options_data = build_scenario_option_blueprints(
        gap=Decimal(str(alert.get("gap_h") or 0)),
        cost_param=cost_param,
        horizon=alert.get("horizon"),
    )
    now = datetime.now(UTC)
    options: list[SimpleNamespace] = []
    for item in options_data:
        raw_type = item.get("option_type")
        type_token = getattr(raw_type, "value", str(raw_type))
        option_id = uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"live-scenario:{alert_id}:{type_token}",
        )
        options.append(
            SimpleNamespace(
                id=option_id,
                organization_id=organization_id,
                created_at=now,
                updated_at=now,
                coverage_alert_id=alert_id,
                cost_parameter_id=cost_param.id,
                option_type=item["option_type"],
                label=item["label"],
                cout_total_eur=item["cout_total_eur"],
                service_attendu_pct=item["service_attendu_pct"],
                heures_couvertes=item["heures_couvertes"],
                feasibility_score=item.get("feasibility_score"),
                risk_score=item.get("risk_score"),
                policy_compliance=bool(item.get("policy_compliance", False)),
                dominance_reason=item.get("dominance_reason"),
                recommendation_policy_version=item.get("recommendation_policy_version"),
                is_pareto_optimal=False,
                is_recommended=False,
                contraintes_json=item.get("contraintes_json", {}),
            )
        )

    pareto = compute_pareto_frontier(options)
    for option in pareto:
        option.is_pareto_optimal = True
        option.dominance_reason = "pareto_optimal"

    recommended = select_recommendation(pareto)
    if recommended is not None:
        recommended.is_recommended = True

    for option in options:
        if not option.is_pareto_optimal and not option.dominance_reason:
            option.dominance_reason = "dominated_by_pareto"

    parsed_options = [ScenarioOptionRead.model_validate(option) for option in options]
    parsed_pareto = [ScenarioOptionRead.model_validate(option) for option in pareto]
    parsed_recommended = (
        ScenarioOptionRead.model_validate(recommended)
        if recommended is not None
        else None
    )
    return ParetoFrontierResponse(
        alert_id=alert_id,
        options=parsed_options,
        pareto_frontier=parsed_pareto,
        recommended=parsed_recommended,
    )


@router.get("/dashboard/summary")
async def get_live_dashboard_summary(
    site_id: str | None = Query(default=None, max_length=80),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[DashboardSummaryResponse]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    summary = build_dashboard_summary(rows)
    return ApiResponse(
        success=True,
        data=DashboardSummaryResponse.model_validate(summary),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/forecasts/latest/daily")
async def get_live_latest_daily_forecasts(
    site_id: str | None = Query(default=None, max_length=80),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
    dimension: ForecastDimension | None = Query(default=None),
) -> ApiResponse[list[DailyForecastRead]]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    forecasts = build_daily_forecasts(
        rows=rows,
        organization_id=org_id,
        dimension=dimension,
    )
    return ApiResponse(
        success=True,
        data=[DailyForecastRead.model_validate(item) for item in forecasts],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/forecasts")
async def list_live_forecast_runs(
    site_id: str | None = Query(default=None, max_length=80),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
    status: ForecastStatus | None = Query(default=None),
) -> ApiResponse[list[ForecastRunSummary]]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    runs = build_forecast_runs(rows)
    if status is not None:
        runs = [run for run in runs if run["status"] == status]
    return ApiResponse(
        success=True,
        data=[ForecastRunSummary.model_validate(item) for item in runs],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/canonical")
async def list_live_canonical_records(
    site_id: str | None = Query(default=None, max_length=80),
    shift: ShiftType | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[CanonicalRecordRead]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
        date_from=date_from,
        date_to=date_to,
    )
    records = build_canonical_records(rows=rows, organization_id=org_id)
    if shift is not None:
        records = [record for record in records if record["shift"] == shift]
    page_items, total = _paginate(records, page, page_size)
    data = [CanonicalRecordRead.model_validate(item) for item in page_items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/canonical/quality")
async def get_live_canonical_quality(
    site_id: str | None = Query(default=None, max_length=80),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[CanonicalQualityDashboard]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    quality = build_canonical_quality(rows)
    return ApiResponse(
        success=True,
        data=CanonicalQualityDashboard.model_validate(quality),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/gold/schema")
async def get_live_gold_schema(
    site_id: str | None = Query(default=None, max_length=80),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[GoldSchemaRead]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    snapshot = get_gold_snapshot()
    schema = build_gold_schema(snapshot, rows=rows)
    return ApiResponse(
        success=True,
        data=GoldSchemaRead.model_validate(schema),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/gold/rows")
async def list_live_gold_rows(
    site_id: str | None = Query(default=None, max_length=80),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    search: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[dict[str, Any]]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
        date_from=date_from,
        date_to=date_to,
    )
    if search:
        rows = [row for row in rows if _row_matches_search(row, search)]

    snapshot = get_gold_snapshot()
    page_items, total = _paginate(rows, page, page_size)
    data = [_serialize_gold_row(row, snapshot.columns) for row in page_items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/gold/coverage")
async def get_live_gold_coverage(
    site_id: str | None = Query(default=None, max_length=80),
    _tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[GoldCoverageRead]:
    _org_id, _rows = await _scoped_rows(
        session=session,
        tenant=_tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    snapshot = get_gold_snapshot()
    coverage = build_gold_coverage(snapshot)
    return ApiResponse(
        success=True,
        data=GoldCoverageRead.model_validate(coverage),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/gold/provenance")
async def get_live_gold_provenance(
    site_id: str | None = Query(default=None, max_length=80),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[GoldProvenanceRead]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    snapshot = get_gold_snapshot()
    payload = build_gold_provenance(snapshot, rows=rows)
    return ApiResponse(
        success=True,
        data=GoldProvenanceRead.model_validate(payload),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/ml-monitoring/summary")
async def get_live_ml_monitoring_summary(
    site_id: str | None = Query(default=None, max_length=80),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[MlMonitoringSummaryRead]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    summary = build_ml_monitoring_summary(rows)
    return ApiResponse(
        success=True,
        data=MlMonitoringSummaryRead.model_validate(summary),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/ml-monitoring/drift")
async def get_live_ml_monitoring_trend(
    site_id: str | None = Query(default=None, max_length=80),
    limit_days: int = Query(default=60, ge=1, le=365),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[list[MlMonitoringPointRead]]:
    _org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    trend = build_ml_monitoring_trend(rows, limit_days=limit_days)
    return ApiResponse(
        success=True,
        data=[MlMonitoringPointRead.model_validate(item) for item in trend],
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/onboarding/status")
async def get_live_onboarding_status(
    site_id: str | None = Query(default=None, max_length=80),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[OnboardingStatusRead]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    payload = build_client_onboarding_status(rows=rows, organization_id=org_id)
    return ApiResponse(
        success=True,
        data=OnboardingStatusRead.model_validate(payload),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/coverage-alerts")
async def list_live_coverage_alerts(
    site_id: str | None = Query(default=None, max_length=80),
    status: CoverageAlertStatus | None = Query(default=None),
    severity: CoverageAlertSeverity | None = Query(default=None),
    horizon: Horizon | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[CoverageAlertRead]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
        date_from=date_from,
        date_to=date_to,
    )
    alerts = build_coverage_alerts(rows=rows, organization_id=org_id)
    if status is not None:
        alerts = [alert for alert in alerts if alert["status"] == status]
    if severity is not None:
        alerts = [alert for alert in alerts if alert["severity"] == severity]
    if horizon is not None:
        alerts = [alert for alert in alerts if alert["horizon"] == horizon]

    page_items, total = _paginate(alerts, page, page_size)
    data = [CoverageAlertRead.model_validate(item) for item in page_items]
    return make_paginated_response(data, total, page, page_size)


@router.get("/coverage-alerts/queue")
async def list_live_decision_queue(
    site_id: str | None = Query(default=None, max_length=80),
    status: CoverageAlertStatus | None = Query(default=CoverageAlertStatus.OPEN),
    severity: CoverageAlertSeverity | None = Query(default=None),
    horizon: Horizon | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[list[DecisionQueueItemRead]]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
        date_from=date_from,
        date_to=date_to,
    )
    alerts = build_coverage_alerts(rows=rows, organization_id=org_id)
    if status is not None:
        alerts = [alert for alert in alerts if alert["status"] == status]
    if severity is not None:
        alerts = [alert for alert in alerts if alert["severity"] == severity]
    if horizon is not None:
        alerts = [alert for alert in alerts if alert["horizon"] == horizon]

    queue = _build_queue_items(alerts, limit=limit)
    return ApiResponse(
        success=True,
        data=queue,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/scenarios/alert/{alert_id}")
async def get_live_alert_scenarios(
    alert_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[ParetoFrontierResponse]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
    )
    alerts = build_coverage_alerts(rows=rows, organization_id=org_id)
    selected = next((item for item in alerts if item["id"] == alert_id), None)
    if selected is None:
        raise NotFoundError("CoverageAlert", str(alert_id))

    frontier = await _build_live_pareto(
        session=session,
        tenant=tenant,
        organization_id=org_id,
        alert=selected,
    )
    return ApiResponse(
        success=True,
        data=frontier,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/decision-workspace/{alert_id}")
async def get_live_decision_workspace(
    alert_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[DecisionWorkspaceRead]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
    )
    alerts = build_coverage_alerts(rows=rows, organization_id=org_id)
    selected = next((item for item in alerts if item["id"] == alert_id), None)
    if selected is None:
        raise NotFoundError("CoverageAlert", str(alert_id))

    frontier = await _build_live_pareto(
        session=session,
        tenant=tenant,
        organization_id=org_id,
        alert=selected,
    )
    workspace = DecisionWorkspaceRead(
        alert=CoverageAlertRead.model_validate(selected),
        options=frontier.options,
        recommended_option_id=(
            frontier.recommended.id if frontier.recommended is not None else None
        ),
        diagnostic=_build_live_diagnostic(selected),
    )
    return ApiResponse(
        success=True,
        data=workspace,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/proof")
async def list_live_proof_records(
    site_id: str | None = Query(default=None, max_length=80),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    site_filter: SiteFilter = Depends(get_site_filter),
    _user: JWTPayload = Depends(get_current_user),
) -> PaginatedResponse[ProofRecordRead]:
    org_id, rows = await _scoped_rows(
        session=session,
        tenant=tenant,
        site_filter=site_filter,
        requested_site=site_id,
    )
    records = build_proof_records(rows=rows, organization_id=org_id)
    page_items, total = _paginate(records, page, page_size)
    data = [ProofRecordRead.model_validate(item) for item in page_items]
    return make_paginated_response(data, total, page, page_size)
