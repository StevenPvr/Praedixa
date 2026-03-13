"""Proof-of-value service — ROI calculation comparing BAU vs optimized outcomes.

Generates monthly proof records per site that compare:
- BAU (0%): business-as-usual cost using historical average mix
- 100%: theoretical optimum using recommended scenarios
- Reel: actual observed costs from decision log

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- ProofRecord uses UPSERT (ON CONFLICT UPDATE) via unique constraint
  on (org_id, site_id, month) — no duplicate monthly records.
- No raw SQL — SQLAlchemy ORM queries only.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal
from typing import TYPE_CHECKING, cast

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.pagination import normalize_page_window
from app.models.operational import (
    CoverageAlert,
    OperationalDecision,
    ProofRecord,
    ScenarioOption,
)

if TYPE_CHECKING:
    from datetime import date

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter

_DECEMBER = 12
_DEFAULT_BAU_RATE = Decimal("40.00")
_BAU_METHOD_VERSION_HISTORICAL = "historical_site_rolling_90d_v1"
_BAU_METHOD_VERSION_FALLBACK = "fallback_static_rate_v1"
_BAU_METHOD_VERSION_UNPROVEN = _BAU_METHOD_VERSION_FALLBACK
_DECIMAL_ZERO = Decimal("0.0000")
_DECIMAL_ONE = Decimal("1.0000")
_ProofOutcomeValue = Decimal | str | list[str] | int | None


def _bounded_ratio(
    numerator: int | float | Decimal,
    denominator: int | float | Decimal,
) -> Decimal:
    """Return a 0..1 ratio with four-decimal precision."""
    denominator_decimal = Decimal(str(denominator))
    if denominator_decimal <= 0:
        return _DECIMAL_ZERO

    ratio = Decimal(str(numerator)) / denominator_decimal
    return min(_DECIMAL_ONE, max(_DECIMAL_ZERO, ratio)).quantize(
        Decimal("0.0001")
    )


def _resolve_bau_baseline(
    *,
    total_gap: Decimal,
    cout_reel: Decimal,
    historical_bau_rate: Decimal | None,
    historical_service_bau: Decimal | None,
) -> dict[str, _ProofOutcomeValue]:
    """Resolve whether the BAU baseline is finance-grade or still unproven."""
    if historical_bau_rate is None:
        return {
            "cout_bau": cout_reel,
            "gain_net": Decimal("0.00"),
            "bau_method_version": _BAU_METHOD_VERSION_UNPROVEN,
            "proof_status": "cannot_prove_yet",
            "proof_blockers": ["missing_historical_bau"],
            "historical_bau_status": "cannot_prove_yet",
            "service_bau": None,
            "service_bau_status": "cannot_prove_yet",
        }

    cout_bau = (total_gap * historical_bau_rate).quantize(Decimal("0.01"))
    blockers: list[str] = []
    service_status = "configured"
    proof_status = "proved"

    if historical_service_bau is None:
        blockers.append("missing_service_bau")
        service_status = "cannot_prove_yet"
        proof_status = "cannot_prove_yet"

    return {
        "cout_bau": cout_bau,
        "gain_net": (cout_bau - cout_reel).quantize(Decimal("0.01")),
        "bau_method_version": _BAU_METHOD_VERSION_HISTORICAL,
        "proof_status": proof_status,
        "proof_blockers": blockers,
        "historical_bau_status": "configured",
        "service_bau": historical_service_bau,
        "service_bau_status": service_status,
    }


def _build_observed_decision_aggregate_query(alerts_subq):  # type: ignore[no-untyped-def]
    """Build the observed decision aggregate with distinct alert coverage."""
    return select(
        func.coalesce(func.sum(OperationalDecision.cout_observe_eur), Decimal("0")),
        func.count(func.distinct(OperationalDecision.coverage_alert_id)),
    ).where(
        OperationalDecision.coverage_alert_id.in_(select(alerts_subq.c.id)),
        OperationalDecision.exogenous_event_tag.is_(None),
    )


def _resolve_proof_outcome(
    *,
    cout_bau: Decimal,
    cout_100: Decimal,
    cout_reel: Decimal,
    adoption_pct: Decimal,
    alertes_emises: int,
    alertes_traitees: int,
    recommended_alert_count: int,
    bau_baseline: dict[str, _ProofOutcomeValue],
) -> dict[str, _ProofOutcomeValue]:
    """Resolve proof status from BAU, optimized counterfactual, and observed data."""
    blockers = list(
        cast("list[str]", bau_baseline.get("proof_blockers") or [])
    )

    optimized_status = "configured"
    if alertes_traitees <= 0:
        blockers.append("missing_observed_decisions")

    if recommended_alert_count <= 0 or cout_100 <= 0:
        blockers.append("missing_optimized_counterfactual")
        optimized_status = "cannot_prove_yet"
    elif cout_100 >= cout_bau:
        blockers.append("optimized_counterfactual_not_better_than_bau")
        optimized_status = "no_feasible_solution"

    if "optimized_counterfactual_not_better_than_bau" in blockers:
        proof_status = "no_feasible_solution"
        gain_net = Decimal("0.00")
    elif blockers:
        proof_status = "cannot_prove_yet"
        gain_net = Decimal("0.00")
    else:
        proof_status = "proved"
        gain_net = (cout_bau - cout_reel).quantize(Decimal("0.01"))

    denom = cout_bau - cout_100
    capture_rate = (
        _bounded_ratio(cout_bau - cout_reel, denom)
        if proof_status == "proved" and denom > 0
        else None
    )

    return {
        "proof_status": proof_status,
        "optimized_counterfactual_status": optimized_status,
        "proof_blockers": blockers,
        "gain_net": gain_net,
        "capture_rate": capture_rate,
        "attribution_confidence": _bounded_ratio(adoption_pct, Decimal("1")),
        "alertes_emises": alertes_emises,
        "alertes_traitees": alertes_traitees,
    }


async def _compute_historical_bau_proxy(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    site_id: str,
    month_start: date,
    window_days: int = 90,
) -> tuple[Decimal | None, Decimal | None]:
    """Compute site-level BAU proxies from recent observed decisions.

    Returns (bau_rate_eur_per_gap_h, service_bau_proxy_pct).
    """
    baseline_from = month_start - timedelta(days=window_days)
    q = tenant.apply(
        select(
            func.coalesce(func.sum(OperationalDecision.cout_observe_eur), 0),
            func.coalesce(func.sum(OperationalDecision.gap_h), 0),
            func.avg(OperationalDecision.service_observe_pct),
        ).where(
            OperationalDecision.site_id == site_id,
            OperationalDecision.decision_date >= baseline_from,
            OperationalDecision.decision_date < month_start,
            OperationalDecision.cout_observe_eur.isnot(None),
            OperationalDecision.exogenous_event_tag.is_(None),
        ),
        OperationalDecision,
    )
    result = (await session.execute(q)).one()
    try:
        total_cost_raw = result[0]
        total_gap_raw = result[1]
        _idx_service = 2
        avg_service_raw = result[_idx_service] if len(result) > _idx_service else None
    except Exception:
        return None, None
    total_gap = Decimal(str(total_gap_raw or 0))
    if total_gap <= 0:
        return None, None

    rate = Decimal(str(total_cost_raw or 0)) / total_gap
    service_proxy = (
        Decimal(str(round(float(avg_service_raw), 4))) if avg_service_raw else None
    )
    return rate, service_proxy


async def generate_proof_record(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    site_id: str,
    month: date,
) -> ProofRecord:
    """Generate proof record for a site+month.

    Tenant isolation: all queries scoped by TenantFilter / org_id.

    Calculation:
    - BAU (0%): For each alert's gap, apply historical avg cost
      (avg of all HS + interim costs from canonical data as a proxy).
      Fallback: gap * 40 EUR/h (industry average).
    - 100%: Sum recommended scenario option costs for all alerts in month.
    - Reel: Sum actual cout_observe from decision log.

    gain_net = cout_bau - cout_reel
    adoption = alertes_traitees / alertes_emises

    UPSERT: if record exists for org+site+month, update it.
    """
    org_id = uuid.UUID(tenant.organization_id)

    # First day of month for range calculation
    month_start = month.replace(day=1)
    if month.month == _DECEMBER:
        month_end = month.replace(year=month.year + 1, month=1, day=1)
    else:
        month_end = month.replace(month=month.month + 1, day=1)

    alerts_filter = (
        CoverageAlert.site_id == site_id,
        CoverageAlert.alert_date >= month_start,
        CoverageAlert.alert_date < month_end,
    )

    alerts_agg_q = tenant.apply(
        select(
            func.count(CoverageAlert.id),
            func.coalesce(func.sum(CoverageAlert.gap_h), 0),
        ).where(*alerts_filter),
        CoverageAlert,
    )
    alertes_emises_raw, total_gap_raw = (await session.execute(alerts_agg_q)).one()
    alertes_emises = alertes_emises_raw or 0
    total_gap = Decimal(str(total_gap_raw or 0))

    alerts_subq = tenant.apply(
        select(CoverageAlert.id).where(*alerts_filter),
        CoverageAlert,
    ).subquery()

    # BAU cost: first try historical site proxy, then fallback static rate.
    historical_bau_rate: Decimal | None = None
    historical_service_bau: Decimal | None = None
    if alertes_emises > 0:
        (
            historical_bau_rate,
            historical_service_bau,
        ) = await _compute_historical_bau_proxy(
            session,
            tenant,
            site_id=site_id,
            month_start=month_start,
        )
    if historical_bau_rate is not None:
        bau_rate = historical_bau_rate
        bau_method_version = _BAU_METHOD_VERSION_HISTORICAL
    else:
        bau_rate = _DEFAULT_BAU_RATE
        bau_method_version = _BAU_METHOD_VERSION_FALLBACK
    cout_bau = total_gap * bau_rate

    # 100% cost: sum of recommended options
    cout_100 = Decimal("0.00")
    if alertes_emises > 0:
        opt_q = tenant.apply(
            select(func.coalesce(func.sum(ScenarioOption.cout_total_eur), 0)).where(
                ScenarioOption.coverage_alert_id.in_(select(alerts_subq.c.id)),
                ScenarioOption.is_recommended.is_(True),
            ),
            ScenarioOption,
        )
        cout_100 = Decimal(str((await session.execute(opt_q)).scalar_one() or 0))

    # Real cost: sum of observed costs from decisions
    cout_reel = Decimal("0.00")
    alertes_traitees = 0
    if alertes_emises > 0:
        dec_q = tenant.apply(
            select(
                func.coalesce(
                    func.sum(OperationalDecision.cout_observe_eur), Decimal("0")
                ),
                func.count(OperationalDecision.id),
            ).where(
                OperationalDecision.coverage_alert_id.in_(select(alerts_subq.c.id)),
                OperationalDecision.exogenous_event_tag.is_(None),
            ),
            OperationalDecision,
        )
        dec_result = (await session.execute(dec_q)).one()
        cout_reel = Decimal(str(dec_result[0] or 0))
        alertes_traitees = dec_result[1] or 0

    gain_net = cout_bau - cout_reel
    adoption_pct = (
        Decimal(str(round(alertes_traitees / alertes_emises, 4)))
        if alertes_emises > 0
        else Decimal("0.0000")
    )

    # Service percentages
    service_bau = historical_service_bau or Decimal("0.6000")
    service_reel = (
        Decimal(str(round(alertes_traitees / max(alertes_emises, 1), 4)))
        if alertes_emises > 0
        else None
    )
    denom = cout_bau - cout_100
    capture_rate = (
        Decimal(str(round(float((cout_bau - cout_reel) / denom), 4)))
        if denom > 0
        else None
    )
    attribution_confidence = (
        Decimal(str(round(float(adoption_pct), 4)))
        if bau_method_version == _BAU_METHOD_VERSION_HISTORICAL
        else Decimal(str(round(float(adoption_pct) * 0.7, 4)))
    )

    # UPSERT via ON CONFLICT
    values = {
        "id": uuid.uuid4(),
        "organization_id": org_id,
        "site_id": site_id,
        "month": month_start,
        "cout_bau_eur": cout_bau,
        "cout_100_eur": cout_100,
        "cout_reel_eur": cout_reel,
        "gain_net_eur": gain_net,
        "service_bau_pct": service_bau,
        "service_reel_pct": service_reel,
        "capture_rate": capture_rate,
        "bau_method_version": bau_method_version,
        "attribution_confidence": attribution_confidence,
        "adoption_pct": adoption_pct,
        "alertes_emises": alertes_emises,
        "alertes_traitees": alertes_traitees,
        "details_json": {
            "total_gap_h": str(total_gap),
            "bau_rate": str(bau_rate),
            "bau_source": (
                "historical_rolling_90d"
                if bau_method_version == _BAU_METHOD_VERSION_HISTORICAL
                else "fallback_static_rate"
            ),
        },
    }

    stmt = pg_insert(ProofRecord).values(**values)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_proof_record",
        set_={
            "cout_bau_eur": stmt.excluded.cout_bau_eur,
            "cout_100_eur": stmt.excluded.cout_100_eur,
            "cout_reel_eur": stmt.excluded.cout_reel_eur,
            "gain_net_eur": stmt.excluded.gain_net_eur,
            "service_bau_pct": stmt.excluded.service_bau_pct,
            "service_reel_pct": stmt.excluded.service_reel_pct,
            "capture_rate": stmt.excluded.capture_rate,
            "bau_method_version": stmt.excluded.bau_method_version,
            "attribution_confidence": stmt.excluded.attribution_confidence,
            "adoption_pct": stmt.excluded.adoption_pct,
            "alertes_emises": stmt.excluded.alertes_emises,
            "alertes_traitees": stmt.excluded.alertes_traitees,
            "details_json": stmt.excluded.details_json,
        },
    )
    await session.execute(stmt)
    await session.flush()

    # Fetch the upserted record
    fetch_q = tenant.apply(
        select(ProofRecord).where(
            ProofRecord.site_id == site_id,
            ProofRecord.month == month_start,
        ),
        ProofRecord,
    )
    result = await session.execute(fetch_q)
    record: ProofRecord = result.scalar_one()
    return record


async def list_proof_records(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    site_id: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[ProofRecord], int]:
    """List proof records with optional site filter and pagination.

    Tenant isolation: mandatory WHERE on organization_id via TenantFilter.
    Returns (items, total_count). Ordered by month DESC.
    """
    base = tenant.apply(select(ProofRecord), ProofRecord)
    count_q = tenant.apply(select(func.count(ProofRecord.id)), ProofRecord)

    if site_id is not None:
        base = base.where(ProofRecord.site_id == site_id)
        count_q = count_q.where(ProofRecord.site_id == site_id)

    total = (await session.execute(count_q)).scalar_one() or 0

    _, page_size, offset = normalize_page_window(page, page_size)
    query = base.order_by(ProofRecord.month.desc()).offset(offset).limit(page_size)
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_proof_summary(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    site_id: str | None = None,
) -> dict[str, object]:
    """Aggregate proof across all sites (or a single site if site_id is set).

    Tenant isolation: all queries scoped by TenantFilter.

    Returns:
    - total_gain: sum of gain_net_eur
    - avg_adoption: average adoption_pct
    - avg_service_improvement: average (service_reel - service_bau)
    - per_site: list of per-site aggregates
    """
    base = tenant.apply(select(ProofRecord), ProofRecord)

    if site_id is not None:
        base = base.where(ProofRecord.site_id == site_id)

    if date_from is not None:
        base = base.where(ProofRecord.month >= date_from)

    if date_to is not None:
        base = base.where(ProofRecord.month <= date_to)

    # Aggregate totals
    agg_q = tenant.apply(
        select(
            func.coalesce(func.sum(ProofRecord.gain_net_eur), 0),
            func.avg(ProofRecord.adoption_pct),
            func.avg(ProofRecord.service_reel_pct - ProofRecord.service_bau_pct),
            func.avg(ProofRecord.capture_rate),
        ),
        ProofRecord,
    )
    if site_id is not None:
        agg_q = agg_q.where(ProofRecord.site_id == site_id)
    if date_from is not None:
        agg_q = agg_q.where(ProofRecord.month >= date_from)
    if date_to is not None:
        agg_q = agg_q.where(ProofRecord.month <= date_to)

    agg_result = (await session.execute(agg_q)).one()
    total_gain = Decimal(str(agg_result[0] or 0))
    avg_adoption = (
        Decimal(str(round(float(agg_result[1]), 4))) if agg_result[1] else None
    )
    avg_service_improvement = (
        Decimal(str(round(float(agg_result[2]), 4))) if agg_result[2] else None
    )
    _idx_capture = 3
    avg_capture_raw = (
        agg_result[_idx_capture] if len(agg_result) > _idx_capture else None
    )
    avg_capture_rate = (
        Decimal(str(round(float(avg_capture_raw), 4))) if avg_capture_raw else None
    )

    # Per-site breakdown
    site_q = tenant.apply(
        select(
            ProofRecord.site_id,
            func.sum(ProofRecord.gain_net_eur).label("gain"),
            func.avg(ProofRecord.adoption_pct).label("adoption"),
            func.sum(ProofRecord.alertes_emises).label("emises"),
            func.sum(ProofRecord.alertes_traitees).label("traitees"),
        ),
        ProofRecord,
    ).group_by(ProofRecord.site_id)

    if site_id is not None:
        site_q = site_q.where(ProofRecord.site_id == site_id)
    if date_from is not None:
        site_q = site_q.where(ProofRecord.month >= date_from)
    if date_to is not None:
        site_q = site_q.where(ProofRecord.month <= date_to)

    site_result = await session.execute(site_q)
    per_site = [
        {
            "site_id": row[0],
            "gain_net_eur": Decimal(str(row[1] or 0)),
            "avg_adoption_pct": (
                Decimal(str(round(float(row[2]), 4))) if row[2] else None
            ),
            "alertes_emises": row[3] or 0,
            "alertes_traitees": row[4] or 0,
        }
        for row in site_result.all()
    ]

    return {
        "total_gain": total_gain,
        "avg_adoption": avg_adoption,
        "avg_service_improvement": avg_service_improvement,
        "avg_capture_rate": avg_capture_rate,
        "per_site": per_site,
    }
