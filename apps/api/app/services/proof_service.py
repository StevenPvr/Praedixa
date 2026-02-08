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
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

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

    # BAU cost: gap * 40 EUR/h (conservative industry average)
    bau_rate = Decimal("40.00")
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
    service_bau = Decimal("0.6000")  # BAU assumed 60% service level
    service_reel = (
        Decimal(str(round(alertes_traitees / max(alertes_emises, 1), 4)))
        if alertes_emises > 0
        else None
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
        "adoption_pct": adoption_pct,
        "alertes_emises": alertes_emises,
        "alertes_traitees": alertes_traitees,
        "details_json": {
            "total_gap_h": str(total_gap),
            "bau_rate": str(bau_rate),
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

    offset = (page - 1) * page_size
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
) -> dict[str, object]:
    """Aggregate proof across all sites.

    Tenant isolation: all queries scoped by TenantFilter.

    Returns:
    - total_gain: sum of gain_net_eur
    - avg_adoption: average adoption_pct
    - avg_service_improvement: average (service_reel - service_bau)
    - per_site: list of per-site aggregates
    """
    base = tenant.apply(select(ProofRecord), ProofRecord)

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
        ),
        ProofRecord,
    )
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
        "per_site": per_site,
    }
