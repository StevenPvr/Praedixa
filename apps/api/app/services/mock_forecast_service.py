"""Mock forecast service — heuristic-based coverage alert generation.

Generates probabilistic coverage alerts from canonical data patterns.
Used in demo/staging environments to simulate the real forecast engine
without requiring ML model training.

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- Random seed is deterministic per (org_id + date) for reproducibility.
- drivers_json is server-computed, never from client input.
- No raw SQL — SQLAlchemy ORM queries only.
"""

from __future__ import annotations

import hashlib
import math
import random
import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import select

from app.models.operational import (
    CanonicalRecord,
    CoverageAlert,
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
    ShiftType,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter


def _sigmoid(x: float) -> float:
    """Standard sigmoid function bounded to (0, 1)."""
    return 1.0 / (1.0 + math.exp(-x))


def _deterministic_seed(org_id: str, ref_date: date) -> int:
    """Create a deterministic seed from org_id + date for reproducibility."""
    raw = f"{org_id}:{ref_date.isoformat()}"
    return int(hashlib.sha256(raw.encode()).hexdigest()[:8], 16)


def _severity_from_p(p_rupture: float) -> CoverageAlertSeverity:
    """Map probability to severity level."""
    if p_rupture >= 0.7:
        return CoverageAlertSeverity.CRITICAL
    if p_rupture >= 0.5:
        return CoverageAlertSeverity.HIGH
    if p_rupture >= 0.3:
        return CoverageAlertSeverity.MEDIUM
    return CoverageAlertSeverity.LOW


def _generate_drivers(
    rng: random.Random,
    avg_gap: float,
    trend: float,
) -> list[str]:
    """Generate top 3 explanation drivers for an alert."""
    candidates = []

    if trend > 0:
        candidates.append("Tendance absences \u2191")
    if avg_gap > 5:
        candidates.append("Charge en hausse")
    if avg_gap > 3:
        candidates.append("Capacit\u00e9 int\u00e9rim r\u00e9duite")
    candidates.append("Variabilit\u00e9 saisonni\u00e8re")
    candidates.append("Turn-over \u00e9quipes")
    candidates.append("Formation en cours")

    rng.shuffle(candidates)
    return candidates[:3]


async def generate_mock_forecasts(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    days_lookback: int = 30,
) -> int:
    """Generate mock coverage alerts based on canonical data heuristics.

    Tenant isolation: all queries and inserts scoped by TenantFilter / org_id.

    Algorithm:
    1. Read last `days_lookback` days of canonical records grouped by site+shift
    2. For each site+shift:
       - Calculate avg gap = capacite_plan_h - realise_h (weighted moving avg)
       - Calculate trend (is gap growing?)
       - Compute P(rupture) = sigmoid(gap_normalized + trend_factor + noise)
       - Determine severity from probability
       - Generate top 3 drivers
    3. Create CoverageAlert records for alerts with P(rupture) > 0.2
    4. Generate for 3 horizons: J+3, J+7, J+14

    Returns number of alerts generated.
    """
    org_id = uuid.UUID(tenant.organization_id)
    from datetime import UTC
    from datetime import datetime as _dt

    today = _dt.now(tz=UTC).date()
    cutoff = today - timedelta(days=days_lookback)

    # Deterministic RNG
    seed = _deterministic_seed(tenant.organization_id, today)
    rng = random.Random(seed)

    # Fetch canonical records in the lookback window
    query = tenant.apply(
        select(CanonicalRecord).where(CanonicalRecord.date >= cutoff),
        CanonicalRecord,
    ).order_by(CanonicalRecord.date.asc())

    result = await session.execute(query)
    records = list(result.scalars().all())

    if not records:
        return 0

    # Group by (site_id, shift)
    groups: dict[tuple[str, str], list[CanonicalRecord]] = {}
    for rec in records:
        shift_val = rec.shift.value if isinstance(rec.shift, ShiftType) else rec.shift
        key = (rec.site_id, shift_val)
        groups.setdefault(key, []).append(rec)

    alerts_created = 0
    horizons = [
        (Horizon.J3, 3, 1.0),
        (Horizon.J7, 7, 0.85),
        (Horizon.J14, 14, 0.7),
    ]

    for (site_id, shift_str), group_records in groups.items():
        shift_enum = ShiftType(shift_str)

        # Calculate weighted gaps (recent days weighted more)
        gaps: list[float] = []
        for rec in group_records:
            cap = float(rec.capacite_plan_h or 0)
            real = float(rec.realise_h or cap)
            gap = max(cap - real, 0)
            gaps.append(gap)

        if not gaps:  # pragma: no cover — defensive: groups always have >= 1 record
            continue

        # Weighted moving average: recent records get higher weight
        total_weight = 0.0
        weighted_sum = 0.0
        for i, gap in enumerate(gaps):
            weight = 1.0 + i * 0.5  # More recent = higher index = higher weight
            weighted_sum += gap * weight
            total_weight += weight

        avg_gap = weighted_sum / total_weight if total_weight > 0 else 0

        # Trend: compare last third vs first third
        third = max(len(gaps) // 3, 1)
        early_avg = sum(gaps[:third]) / third
        late_avg = sum(gaps[-third:]) / third
        trend = late_avg - early_avg

        # For each horizon, compute alert probability
        for horizon_enum, days_ahead, decay in horizons:
            gap_normalized = avg_gap / 10.0  # Normalize to ~[-1, 1] range
            trend_factor = trend / 5.0
            noise = rng.gauss(0, 0.15)

            raw_score = gap_normalized + trend_factor + noise
            p_rupture = _sigmoid(raw_score) * decay

            if p_rupture <= 0.2:
                continue

            severity = _severity_from_p(p_rupture)
            drivers = _generate_drivers(rng, avg_gap, trend)

            alert_date = today + timedelta(days=days_ahead)
            gap_h = Decimal(str(round(avg_gap * decay, 2)))
            impact = gap_h * Decimal("35.00")  # Rough cost per hour estimate

            alert = CoverageAlert(
                organization_id=org_id,
                site_id=site_id,
                alert_date=alert_date,
                shift=shift_enum,
                horizon=horizon_enum,
                p_rupture=Decimal(str(round(p_rupture, 4))),
                gap_h=gap_h,
                impact_eur=impact,
                severity=severity,
                status=CoverageAlertStatus.OPEN,
                drivers_json=drivers,
            )
            session.add(alert)
            alerts_created += 1

    if alerts_created > 0:
        await session.flush()

    return alerts_created
