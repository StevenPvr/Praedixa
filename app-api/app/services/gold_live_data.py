"""Read and project medallion Gold dataset for client-facing live endpoints."""
# ruff: noqa: PLR0911, PLR0912, PLR0915, PLR2004

from __future__ import annotations

import csv
import threading
import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, time
from pathlib import Path
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from app.models.organization import Organization
from app.models.site import Site

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import SiteFilter, TenantFilter
    from app.models.daily_forecast import ForecastDimension

_ROOT = Path(__file__).resolve().parents[3]
_GOLD_PATH = _ROOT / "data-ready" / "gold" / "gold_site_day.csv"
_SILVER_QUALITY_REPORT_PATH = (
    _ROOT / "data-ready" / "reports" / "silver_quality_report.json"
)
_GOLD_QUALITY_REPORT_PATH = (
    _ROOT / "data-ready" / "reports" / "gold_feature_quality_report.json"
)
_LAST_RUN_SUMMARY_PATH = _ROOT / "data-ready" / "reports" / "last_run_summary.json"

_ORG_CLIENT_FALLBACKS: dict[str, str] = {
    "praedixa_demo": "acme-logistics",
    "praedixa-demo": "acme-logistics",
    "demo_org": "acme-logistics",
}

_CACHE_LOCK = threading.Lock()


@dataclass(frozen=True)
class GoldSnapshot:
    rows: list[dict[str, Any]]
    columns: list[str]
    revision: str
    loaded_at: str
    source_path: Path


@dataclass
class _GoldCache:
    mtime_ns: int
    size: int
    snapshot: GoldSnapshot


_CACHE: _GoldCache | None = None


def _normalize_slug(value: str) -> str:
    lowered = value.strip().lower()
    out: list[str] = []
    prev_dash = False
    for char in lowered:
        if char.isalnum():
            out.append(char)
            prev_dash = False
            continue
        if not prev_dash:
            out.append("-")
            prev_dash = True
    return "".join(out).strip("-")


def _parse_scalar(raw: str | None) -> Any:
    if raw is None:
        return None
    token = raw.strip()
    if not token:
        return None

    lowered = token.lower()
    if lowered in {"none", "null", "na", "n/a", "-"}:
        return None
    if lowered in {"true", "false"}:
        return lowered == "true"

    compact = token.replace(" ", "").replace("\u00a0", "")
    if "," in compact and "." in compact:
        if compact.rfind(",") > compact.rfind("."):
            compact = compact.replace(".", "").replace(",", ".")
        else:
            compact = compact.replace(",", "")
    elif "," in compact:
        compact = compact.replace(",", ".")

    try:
        value = float(compact)
    except ValueError:
        return token
    if value.is_integer():
        return int(value)
    return value


def _to_float(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None
    parsed = _parse_scalar(value)
    if isinstance(parsed, (int, float)):
        return float(parsed)
    return None


def _to_date(value: Any) -> date | None:
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None
    token = value.strip()
    if len(token) < 10:
        return None
    try:
        return date.fromisoformat(token[:10])
    except ValueError:
        return None


def _date_range(rows: list[dict[str, Any]]) -> tuple[date | None, date | None]:
    parsed = [_to_date(row.get("date")) for row in rows]
    dates = [d for d in parsed if d is not None]
    if not dates:
        return None, None
    return min(dates), max(dates)


def _load_csv_rows(path: Path) -> GoldSnapshot:
    if not path.exists():
        return GoldSnapshot(
            rows=[],
            columns=[],
            revision="missing",
            loaded_at=datetime.now(UTC).isoformat(),
            source_path=path,
        )

    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = [{k: _parse_scalar(v) for k, v in row.items()} for row in reader]
        columns = list(reader.fieldnames or [])

    stat = path.stat()
    revision = f"{stat.st_mtime_ns}-{stat.st_size}"
    return GoldSnapshot(
        rows=rows,
        columns=columns,
        revision=revision,
        loaded_at=datetime.now(UTC).isoformat(),
        source_path=path,
    )


def get_gold_snapshot(path: Path | None = None) -> GoldSnapshot:
    target = path or _GOLD_PATH
    if not target.exists():
        return _load_csv_rows(target)

    stat = target.stat()
    global _CACHE
    with _CACHE_LOCK:
        if (
            _CACHE is not None
            and _CACHE.mtime_ns == stat.st_mtime_ns
            and _CACHE.size == stat.st_size
            and _CACHE.snapshot.source_path == target
        ):
            return _CACHE.snapshot

        snapshot = _load_csv_rows(target)
        _CACHE = _GoldCache(
            mtime_ns=stat.st_mtime_ns,
            size=stat.st_size,
            snapshot=snapshot,
        )
        return snapshot


def _deterministic_uuid(token: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, token)


async def resolve_client_slug_for_org(
    session: AsyncSession,
    organization_id: uuid.UUID,
    available_client_slugs: set[str],
    client_site_codes: dict[str, set[str]] | None = None,
) -> str | None:
    if not available_client_slugs:
        return None

    org_query = select(Organization.slug, Organization.name).where(
        Organization.id == organization_id
    )
    row = (await session.execute(org_query)).one_or_none()
    if row is None:
        return None

    org_slug = str(row[0])
    org_name = str(row[1] or "")
    candidates = [
        org_slug,
        _normalize_slug(org_slug),
        _normalize_slug(org_name),
        _ORG_CLIENT_FALLBACKS.get(org_slug),
        _ORG_CLIENT_FALLBACKS.get(_normalize_slug(org_slug)),
    ]
    for candidate in candidates:
        if candidate and candidate in available_client_slugs:
            return candidate

    # Heuristic fallback: match by maximum overlap between org site codes
    # and client site codes found in Gold data.
    if client_site_codes:
        site_query = select(Site.code).where(Site.organization_id == organization_id)
        org_site_codes = {
            str(code).strip().upper()
            for code in (await session.execute(site_query)).scalars().all()
            if isinstance(code, str) and code.strip()
        }
        if org_site_codes:
            scored_matches: list[tuple[int, str]] = []
            for slug in available_client_slugs:
                overlap = len(org_site_codes & client_site_codes.get(slug, set()))
                if overlap > 0:
                    scored_matches.append((overlap, slug))
            scored_matches.sort(key=lambda item: item[0], reverse=True)
            if scored_matches:
                best_score = scored_matches[0][0]
                best_slugs = [
                    slug for overlap, slug in scored_matches if overlap == best_score
                ]
                if len(best_slugs) == 1:
                    return best_slugs[0]

    if len(available_client_slugs) == 1:
        return next(iter(available_client_slugs))
    return None


async def resolve_site_code_for_filter(
    *,
    session: AsyncSession,
    tenant: TenantFilter,
    site_filter: SiteFilter,
    requested_site: str | None,
) -> str | None:
    candidate = site_filter.site_id or requested_site
    if not candidate:
        return None

    normalized = candidate.strip()
    if not normalized:
        return None

    try:
        site_uuid = uuid.UUID(normalized)
    except ValueError:
        return normalized.upper()

    query = tenant.apply(select(Site.code).where(Site.id == site_uuid), Site)
    site_code = (await session.execute(query)).scalar_one_or_none()
    if isinstance(site_code, str) and site_code.strip():
        return site_code.strip().upper()
    return normalized.upper()


def filter_rows(
    rows: list[dict[str, Any]],
    *,
    client_slug: str,
    site_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        if str(row.get("client_slug") or "") != client_slug:
            continue
        if site_code and str(row.get("site_code") or "").upper() != site_code.upper():
            continue
        d = _to_date(row.get("date"))
        if d is None:
            continue
        if date_from and d < date_from:
            continue
        if date_to and d > date_to:
            continue
        out.append(row)
    out.sort(key=lambda item: str(item.get("date") or ""))
    return out


def build_dashboard_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        return {
            "coverage_human": 0.0,
            "coverage_merchandise": 0.0,
            "active_alerts_count": 0,
            "forecast_accuracy": None,
            "last_forecast_date": None,
        }

    human_pairs: list[tuple[float, float]] = []
    merch_pairs: list[tuple[float, float]] = []
    risk_values: list[float] = []
    mape_values: list[float] = []
    last_date: date | None = None

    for row in rows:
        d = _to_date(row.get("date"))
        if d is not None and (last_date is None or d > last_date):
            last_date = d

        required_fte = _to_float(
            row.get("mock_forecasts_daily__predicted_required_fte")
            or row.get("workforce_daily__required_fte")
        )
        present_fte = _to_float(row.get("workforce_daily__present_fte"))
        if required_fte and required_fte > 0 and present_fte is not None:
            human_pairs.append((present_fte, required_fte))

        forecasted_orders = _to_float(
            row.get("mock_forecasts_daily__forecasted_orders")
        )
        processed_orders = _to_float(row.get("operations_daily__orders_processed"))
        if forecasted_orders and forecasted_orders > 0 and processed_orders is not None:
            merch_pairs.append((processed_orders, forecasted_orders))

        risk_pct = _to_float(
            row.get("mock_forecasts_daily__predicted_service_risk_pct")
        )
        if risk_pct is not None:
            risk_values.append(risk_pct)

        mape = _to_float(row.get("model_monitoring_daily__mape_orders_pct"))
        if mape is not None:
            mape_values.append(mape)

    def _coverage(values: list[tuple[float, float]]) -> float:
        if not values:
            return 0.0
        num = sum(v[0] for v in values)
        den = sum(v[1] for v in values)
        if den <= 0:
            return 0.0
        return round((num / den) * 100, 2)

    risk_threshold = 25.0
    active_alerts_count = sum(1 for value in risk_values if value >= risk_threshold)
    forecast_accuracy: float | None = None
    if mape_values:
        avg_mape = sum(mape_values) / len(mape_values)
        forecast_accuracy = round(max(0.0, 1.0 - (avg_mape / 100.0)), 4)

    return {
        "coverage_human": _coverage(human_pairs),
        "coverage_merchandise": _coverage(merch_pairs),
        "active_alerts_count": active_alerts_count,
        "forecast_accuracy": forecast_accuracy,
        "last_forecast_date": last_date,
    }


def build_daily_forecasts(
    *,
    rows: list[dict[str, Any]],
    organization_id: uuid.UUID,
    dimension: ForecastDimension | None,
) -> list[dict[str, Any]]:
    dim_value = "human" if dimension is None else dimension.value
    grouped: dict[date, dict[str, float]] = {}

    for row in rows:
        d = _to_date(row.get("date"))
        if d is None:
            continue

        bucket = grouped.setdefault(
            d,
            {
                "predicted_demand": 0.0,
                "predicted_capacity": 0.0,
                "capacity_planned_current": 0.0,
                "capacity_planned_predicted": 0.0,
                "capacity_optimal_predicted": 0.0,
                "confidence_lower": 0.0,
                "confidence_upper": 0.0,
                "risk_score": 0.0,
                "risk_count": 0.0,
            },
        )

        if dim_value == "human":
            demand = _to_float(
                row.get("mock_forecasts_daily__predicted_required_fte")
                or row.get("workforce_daily__required_fte")
            )
            capacity = _to_float(row.get("workforce_daily__present_fte"))
            planned = _to_float(row.get("workforce_daily__planned_fte"))
            interim = _to_float(row.get("workforce_daily__interim_fte"))

            if demand is not None:
                bucket["predicted_demand"] += demand
                bucket["capacity_optimal_predicted"] += demand
                bucket["confidence_lower"] += max(demand * 0.9, 0.0)
                bucket["confidence_upper"] += demand * 1.1
            if capacity is not None:
                bucket["predicted_capacity"] += capacity
            if planned is not None:
                bucket["capacity_planned_current"] += planned
                bucket["capacity_planned_predicted"] += planned
            if interim is not None:
                bucket["capacity_planned_predicted"] += interim
        else:
            demand = _to_float(row.get("mock_forecasts_daily__forecasted_orders"))
            capacity = _to_float(row.get("operations_daily__orders_processed"))
            planned = _to_float(row.get("operations_daily__orders_received"))
            backlog = _to_float(row.get("operations_daily__backlog_orders"))
            conf_low = _to_float(row.get("mock_forecasts_daily__confidence_low_orders"))
            conf_high = _to_float(
                row.get("mock_forecasts_daily__confidence_high_orders")
            )

            if demand is not None:
                bucket["predicted_demand"] += demand
                bucket["capacity_optimal_predicted"] += demand
            if capacity is not None:
                bucket["predicted_capacity"] += capacity
            if planned is not None:
                bucket["capacity_planned_current"] += planned
                bucket["capacity_planned_predicted"] += planned
            if backlog is not None:
                bucket["capacity_planned_predicted"] += backlog
            if conf_low is not None:
                bucket["confidence_lower"] += conf_low
            if conf_high is not None:
                bucket["confidence_upper"] += conf_high

        risk = _to_float(row.get("mock_forecasts_daily__predicted_service_risk_pct"))
        if risk is not None:
            bucket["risk_score"] += risk
            bucket["risk_count"] += 1.0

    if not grouped:
        return []

    run_token = f"{organization_id}:{dim_value}:{max(grouped.keys()).isoformat()}"
    run_id = _deterministic_uuid(f"forecast-run:{run_token}")
    now = datetime.now(UTC)
    out: list[dict[str, Any]] = []
    for d in sorted(grouped):
        bucket = grouped[d]
        demand = bucket["predicted_demand"]
        capacity = bucket["predicted_capacity"]
        if bucket["confidence_lower"] == 0.0 and demand > 0:
            bucket["confidence_lower"] = max(demand * 0.9, 0.0)
        if bucket["confidence_upper"] == 0.0 and demand > 0:
            bucket["confidence_upper"] = demand * 1.1

        risk_score = 0.0
        if bucket["risk_count"] > 0:
            risk_score = bucket["risk_score"] / bucket["risk_count"]
        elif demand > 0:
            risk_score = max(0.0, min(100.0, ((demand - capacity) / demand) * 100.0))

        row_id = _deterministic_uuid(f"daily-forecast:{run_id}:{d.isoformat()}")
        out.append(
            {
                "id": row_id,
                "organization_id": organization_id,
                "created_at": now,
                "updated_at": now,
                "forecast_run_id": run_id,
                "department_id": None,
                "forecast_date": d,
                "dimension": dim_value,
                "predicted_demand": round(demand, 2),
                "predicted_capacity": round(capacity, 2),
                "capacity_planned_current": round(
                    bucket["capacity_planned_current"], 2
                ),
                "capacity_planned_predicted": round(
                    bucket["capacity_planned_predicted"], 2
                ),
                "capacity_optimal_predicted": round(
                    bucket["capacity_optimal_predicted"], 2
                ),
                "gap": round(demand - capacity, 2),
                "risk_score": round(risk_score, 2),
                "confidence_lower": round(bucket["confidence_lower"], 2),
                "confidence_upper": round(bucket["confidence_upper"], 2),
                "details": {"source": "gold_dataset"},
            }
        )
    return out


def build_canonical_records(
    *,
    rows: list[dict[str, Any]],
    organization_id: uuid.UUID,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        d = _to_date(row.get("date"))
        site_code = str(row.get("site_code") or "").strip().upper()
        if d is None or not site_code:
            continue

        planned_fte = _to_float(row.get("workforce_daily__planned_fte")) or 0.0
        present_fte = _to_float(row.get("workforce_daily__present_fte"))
        absent_fte = _to_float(row.get("workforce_daily__absent_fte")) or 0.0
        interim_fte = _to_float(row.get("workforce_daily__interim_fte")) or 0.0
        overtime_h = _to_float(row.get("workforce_daily__overtime_hours")) or 0.0
        charge_units = _to_float(row.get("operations_daily__orders_received"))
        cout_interne_est = _to_float(row.get("labor_cost_daily__wage_eur"))

        base_h = 7.2
        realised_h = None
        if present_fte is not None:
            realised_h = present_fte * base_h

        record_id = _deterministic_uuid(
            f"canonical:{organization_id}:{site_code}:{d.isoformat()}:am"
        )
        timestamp = datetime.combine(d, time.min, tzinfo=UTC)
        out.append(
            {
                "id": record_id,
                "organization_id": organization_id,
                "created_at": timestamp,
                "updated_at": timestamp,
                "site_id": site_code,
                "date": d,
                "shift": "am",
                "competence": None,
                "charge_units": charge_units,
                "capacite_plan_h": round(planned_fte * base_h, 2),
                "realise_h": round(realised_h, 2) if realised_h is not None else None,
                "abs_h": round(absent_fte * base_h, 2),
                "hs_h": round(overtime_h, 2),
                "interim_h": round(interim_fte * base_h, 2),
                "cout_interne_est": round(cout_interne_est, 2)
                if cout_interne_est is not None
                else None,
            }
        )
    out.sort(key=lambda item: (item["date"], item["site_id"]))
    return out


def build_canonical_quality(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        return {
            "total_records": 0,
            "coverage_pct": 0.0,
            "sites": 0,
            "date_range": [],
            "missing_shifts_pct": 0.0,
            "avg_abs_pct": 0.0,
        }

    site_set = {str(row.get("site_code") or "").strip().upper() for row in rows}
    total = len(rows)
    present_values = [
        _to_float(row.get("workforce_daily__present_fte")) for row in rows
    ]
    filled = sum(1 for value in present_values if value is not None)

    abs_rates: list[float] = []
    for row in rows:
        absent = _to_float(row.get("workforce_daily__absent_fte"))
        present = _to_float(row.get("workforce_daily__present_fte"))
        if absent is None or present is None:
            continue
        denom = absent + present
        if denom <= 0:
            continue
        abs_rates.append((absent / denom) * 100)

    min_date, max_date = _date_range(rows)
    date_range = []
    if min_date and max_date:
        date_range = [min_date.isoformat(), max_date.isoformat()]

    coverage_pct = round((filled / total) * 100, 2) if total else 0.0
    missing_pct = round(100.0 - coverage_pct, 2) if total else 0.0
    avg_abs_pct = round(sum(abs_rates) / len(abs_rates), 2) if abs_rates else 0.0

    return {
        "total_records": total,
        "coverage_pct": coverage_pct,
        "sites": len([s for s in site_set if s]),
        "date_range": date_range,
        "missing_shifts_pct": missing_pct,
        "avg_abs_pct": avg_abs_pct,
    }


def build_coverage_alerts(
    *,
    rows: list[dict[str, Any]],
    organization_id: uuid.UUID,
) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    now = datetime.now(UTC)
    for row in rows:
        d = _to_date(row.get("date"))
        site_code = str(row.get("site_code") or "").strip().upper()
        if d is None or not site_code:
            continue

        risk_pct = _to_float(
            row.get("mock_forecasts_daily__predicted_service_risk_pct")
        )
        required = _to_float(
            row.get("mock_forecasts_daily__predicted_required_fte")
            or row.get("workforce_daily__required_fte")
        )
        present = _to_float(row.get("workforce_daily__present_fte"))
        if required is None or present is None:
            continue

        gap_h = max(required - present, 0.0) * 7.2
        if risk_pct is None and required > 0:
            risk_pct = max(0.0, ((required - present) / required) * 100.0)
        if risk_pct is None:
            continue
        if risk_pct < 12.0 and gap_h <= 1.0:
            continue

        if risk_pct >= 35.0:
            severity = "critical"
            horizon = "j3"
        elif risk_pct >= 25.0:
            severity = "high"
            horizon = "j7"
        elif risk_pct >= 15.0:
            severity = "medium"
            horizon = "j7"
        else:
            severity = "low"
            horizon = "j14"

        drivers: list[str] = []
        absent_fte = _to_float(row.get("workforce_daily__absent_fte")) or 0.0
        backlog = _to_float(row.get("operations_daily__backlog_orders")) or 0.0
        on_time = _to_float(row.get("operations_daily__on_time_rate_pct")) or 100.0
        precip = _to_float(row.get("weather_precip_mm")) or 0.0

        if absent_fte >= 8:
            drivers.append("Absenteisme eleve")
        if backlog >= 500:
            drivers.append("Backlog en hausse")
        if on_time < 92:
            drivers.append("Service degrade")
        if precip >= 6:
            drivers.append("Meteo defavorable")
        if not drivers:
            drivers.append("Demande previsionnelle elevee")

        impact_eur = gap_h * 45.0
        low = max(gap_h * 0.8, 0.0)
        high = gap_h * 1.2
        alert_id = _deterministic_uuid(
            f"coverage-alert:{organization_id}:{site_code}:{d.isoformat()}"
        )
        alerts.append(
            {
                "id": alert_id,
                "organization_id": organization_id,
                "created_at": now,
                "updated_at": now,
                "site_id": site_code,
                "alert_date": d,
                "shift": "am",
                "horizon": horizon,
                "p_rupture": round(max(0.0, min(risk_pct / 100.0, 1.0)), 4),
                "gap_h": round(gap_h, 2),
                "prediction_interval_low": round(low, 2),
                "prediction_interval_high": round(high, 2),
                "model_version": str(
                    row.get("mock_forecasts_daily__model_version") or ""
                ),
                "calibration_bucket": "gold_live_v1",
                "impact_eur": round(impact_eur, 2),
                "severity": severity,
                "status": "open",
                "drivers_json": drivers[:5],
                "acknowledged_at": None,
                "resolved_at": None,
            }
        )
    alerts.sort(key=lambda item: (item["alert_date"], item["severity"]), reverse=True)
    return alerts


def build_proof_records(
    *,
    rows: list[dict[str, Any]],
    organization_id: uuid.UUID,
) -> list[dict[str, Any]]:
    per_site_month: dict[tuple[str, date], dict[str, Any]] = {}
    for row in rows:
        d = _to_date(row.get("date"))
        site_code = str(row.get("site_code") or "").strip().upper()
        if d is None or not site_code:
            continue
        month_start = d.replace(day=1)
        key = (site_code, month_start)
        current = per_site_month.get(key)
        if current is None or _to_date(current.get("date")) < d:
            per_site_month[key] = row

    out: list[dict[str, Any]] = []
    now = datetime.now(UTC)
    for (site_code, month_start), row in sorted(
        per_site_month.items(),
        key=lambda item: item[0][1],
        reverse=True,
    ):
        labor_cost = _to_float(row.get("finance_monthly__labor_cost_eur")) or 0.0
        savings = _to_float(row.get("roi_monthly__savings_eur")) or 0.0
        avoided = _to_float(row.get("roi_monthly__avoided_cost_eur")) or 0.0
        net_gain = _to_float(row.get("roi_monthly__net_gain_eur"))
        if net_gain is None:
            net_gain = savings

        cout_reel = max(labor_cost, 0.0)
        cout_bau = max(cout_reel + savings, 0.0)
        cout_100 = max(cout_reel - max(avoided, 0.0) * 0.25, 0.0)
        adoption_pct = (
            _to_float(row.get("actions_adoption_daily__adoption_rate_pct")) or 0.0
        ) / 100.0
        service_reel_pct = (
            _to_float(row.get("operations_daily__on_time_rate_pct")) or 0.0
        ) / 100.0
        service_bau_pct = max(service_reel_pct - 0.03, 0.0)

        alerts_emises = int(
            _to_float(row.get("quality_incidents_daily__quality_incidents")) or 0
        )
        alerts_traitees = int(
            _to_float(row.get("actions_adoption_daily__executed_actions_count")) or 0
        )

        record_id = _deterministic_uuid(
            f"proof:{organization_id}:{site_code}:{month_start.isoformat()}"
        )
        out.append(
            {
                "id": record_id,
                "organization_id": organization_id,
                "created_at": now,
                "updated_at": now,
                "site_id": site_code,
                "month": month_start,
                "cout_bau_eur": round(cout_bau, 2),
                "cout_100_eur": round(cout_100, 2),
                "cout_reel_eur": round(cout_reel, 2),
                "gain_net_eur": round(net_gain, 2),
                "service_bau_pct": round(service_bau_pct, 4),
                "service_reel_pct": round(service_reel_pct, 4),
                "capture_rate": round(adoption_pct, 4),
                "bau_method_version": "gold_live_v1",
                "attribution_confidence": round(min(adoption_pct + 0.15, 1.0), 4),
                "adoption_pct": round(adoption_pct, 4),
                "alertes_emises": alerts_emises,
                "alertes_traitees": alerts_traitees,
                "details_json": {"source": "gold_dataset"},
            }
        )
    return out


def build_forecast_runs(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records: list[tuple[date, str, float]] = []
    for row in rows:
        d = _to_date(row.get("date"))
        if d is None:
            continue
        mape = _to_float(row.get("model_monitoring_daily__mape_orders_pct"))
        if mape is None:
            continue
        model_version = str(
            row.get("model_monitoring_daily__model_version") or "gold_live_v1"
        )
        accuracy = max(0.0, 1.0 - (mape / 100.0))
        records.append((d, model_version, accuracy))

    if not records:
        return []

    records.sort(key=lambda item: item[0], reverse=True)
    out: list[dict[str, Any]] = []
    seen: set[date] = set()
    for d, model_version, accuracy in records:
        if d in seen:
            continue
        seen.add(d)
        run_id = _deterministic_uuid(
            f"forecast-run-summary:{d.isoformat()}:{model_version}"
        )
        started = datetime.combine(d, time(5, 0), tzinfo=UTC)
        completed = datetime.combine(d, time(6, 0), tzinfo=UTC)
        out.append(
            {
                "id": run_id,
                "model_type": "ensemble",
                "horizon_days": 14,
                "status": "completed",
                "accuracy_score": round(accuracy, 4),
                "started_at": started,
                "completed_at": completed,
            }
        )
        if len(out) >= 50:
            break
    return out


def load_json_report(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        import json

        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return payload if isinstance(payload, dict) else {}


def load_live_quality_reports() -> dict[str, Any]:
    return {
        "silver_quality": load_json_report(_SILVER_QUALITY_REPORT_PATH),
        "gold_feature_quality": load_json_report(_GOLD_QUALITY_REPORT_PATH),
        "last_run_summary": load_json_report(_LAST_RUN_SUMMARY_PATH),
    }
