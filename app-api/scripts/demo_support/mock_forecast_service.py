"""Seed-only mock forecast service for demo data generation.

This helper generates synthetic coverage alerts from canonical data patterns.
It is intentionally scoped to the demo seed pipeline and must not be imported
from production runtime services.

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- Random seed is deterministic per (org_id + date) for reproducibility.
- drivers_json is server-computed, never from client input.
- No raw SQL - SQLAlchemy ORM queries only.
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

_CRITICAL_THRESHOLD = 0.7
_HIGH_THRESHOLD = 0.5
_MEDIUM_THRESHOLD = 0.3
_MIN_ALERT_THRESHOLD = 0.2

_HIGH_GAP_THRESHOLD = 5
_MODERATE_GAP_THRESHOLD = 3


def _sigmoid(x: float) -> float:
    """Standard sigmoid function bounded to (0, 1)."""
    return 1.0 / (1.0 + math.exp(-x))


def _deterministic_seed(org_id: str, ref_date: date) -> int:
    """Create a deterministic seed from org_id + date for reproducibility."""
    raw = f"{org_id}:{ref_date.isoformat()}"
    return int(hashlib.sha256(raw.encode()).hexdigest()[:8], 16)


def _severity_from_p(p_rupture: float) -> CoverageAlertSeverity:
    """Map probability to severity level."""
    if p_rupture >= _CRITICAL_THRESHOLD:
        return CoverageAlertSeverity.CRITICAL
    if p_rupture >= _HIGH_THRESHOLD:
        return CoverageAlertSeverity.HIGH
    if p_rupture >= _MEDIUM_THRESHOLD:
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
    if avg_gap > _HIGH_GAP_THRESHOLD:
        candidates.append("Charge en hausse")
    if avg_gap > _MODERATE_GAP_THRESHOLD:
        candidates.append("Capacit\u00e9 int\u00e9rim r\u00e9duite")
    candidates.append("Variabilit\u00e9 saisonni\u00e8re")
    candidates.append("Turn-over \u00e9quipes")
    candidates.append("Formation en cours")

    rng.shuffle(candidates)
    return candidates[:3]


def _compute_gap_stats(
    group_records: list[CanonicalRecord],
) -> tuple[float, float] | None:
    """Compute weighted average gap and trend for a site+shift group."""
    gaps: list[float] = []
    for rec in group_records:
        cap = float(rec.capacite_plan_h or 0)
        real = float(rec.realise_h or cap)
        gap = max(cap - real, 0)
        gaps.append(gap)

    if not gaps:  # pragma: no cover -- defensive: groups always have >= 1 record
        return None

    total_weight = 0.0
    weighted_sum = 0.0
    for i, gap in enumerate(gaps):
        weight = 1.0 + i * 0.5
        weighted_sum += gap * weight
        total_weight += weight

    avg_gap = weighted_sum / total_weight if total_weight > 0 else 0

    third = max(len(gaps) // 3, 1)
    early_avg = sum(gaps[:third]) / third
    late_avg = sum(gaps[-third:]) / third
    trend = late_avg - early_avg

    return avg_gap, trend


async def generate_mock_forecasts(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    days_lookback: int = 30,
) -> int:
    """Generate demo-only coverage alerts based on canonical data heuristics."""
    org_id = uuid.UUID(tenant.organization_id)
    from datetime import UTC
    from datetime import datetime as _dt

    today = _dt.now(tz=UTC).date()
    cutoff = today - timedelta(days=days_lookback)

    seed = _deterministic_seed(tenant.organization_id, today)
    rng = random.Random(seed)  # noqa: S311

    query = tenant.apply(
        select(CanonicalRecord).where(CanonicalRecord.date >= cutoff),
        CanonicalRecord,
    ).order_by(CanonicalRecord.date.asc())

    result = await session.execute(query)
    records = list(result.scalars().all())

    if not records:
        return 0

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

        gap_stats = _compute_gap_stats(group_records)
        if gap_stats is None:  # pragma: no cover -- defensive
            continue
        avg_gap, trend = gap_stats

        for horizon_enum, days_ahead, decay in horizons:
            gap_normalized = avg_gap / 10.0
            trend_factor = trend / 5.0
            noise = rng.gauss(0, 0.15)

            raw_score = gap_normalized + trend_factor + noise
            p_rupture = _sigmoid(raw_score) * decay

            if p_rupture <= _MIN_ALERT_THRESHOLD:
                continue

            severity = _severity_from_p(p_rupture)
            drivers = _generate_drivers(rng, avg_gap, trend)
            if p_rupture >= _CRITICAL_THRESHOLD:
                calibration_bucket = "critical_bin"
            elif p_rupture >= _HIGH_THRESHOLD:
                calibration_bucket = "high_bin"
            elif p_rupture >= _MEDIUM_THRESHOLD:
                calibration_bucket = "medium_bin"
            else:
                calibration_bucket = "low_bin"

            alert_date = today + timedelta(days=days_ahead)
            gap_h = Decimal(str(round(avg_gap * decay, 2)))
            interval_low = max(gap_h * Decimal("0.80"), Decimal("0.00"))
            interval_high = gap_h * Decimal("1.20")
            impact = gap_h * Decimal("35.00")

            alert = CoverageAlert(
                organization_id=org_id,
                site_id=site_id,
                alert_date=alert_date,
                shift=shift_enum,
                horizon=horizon_enum,
                p_rupture=Decimal(str(round(p_rupture, 4))),
                gap_h=gap_h,
                prediction_interval_low=interval_low.quantize(Decimal("0.01")),
                prediction_interval_high=interval_high.quantize(Decimal("0.01")),
                model_version="mock_forecast_v2",
                calibration_bucket=calibration_bucket,
                impact_eur=impact,
                severity=severity,
                status=CoverageAlertStatus.OPEN,
                drivers_json=drivers,
            )
            session.add(alert)
            alerts_created += 1

    await session.flush()
    return alerts_created
