"""Analytics service — compatibility helpers for legacy cost analysis endpoint."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import func, select

from app.models.decision import Decision, DecisionType

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter


@dataclass(frozen=True)
class CostTotals:
    replacement_costs: float
    overtime_costs: float
    external_contractor_costs: float
    training_costs: float
    productivity_loss: float
    decision_count: int


@dataclass(frozen=True)
class CostImpactAnalysisResult:
    start_date: date
    end_date: date
    department_id: str | None
    direct_replacement: float
    direct_overtime: float
    direct_external: float
    indirect_productivity: float
    indirect_management: float
    indirect_training: float
    total_cost: float
    cost_per_absence_day: float
    previous_period_cost: float
    percentage_change: float


def _as_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _date_bounds(
    start_date: date | None,
    end_date: date | None,
) -> tuple[date, date]:
    resolved_end = end_date or datetime.now(tz=UTC).date()
    resolved_start = start_date or (resolved_end - timedelta(days=29))
    if resolved_start > resolved_end:
        msg = "startDate must be before or equal to endDate"
        raise ValueError(msg)
    return resolved_start, resolved_end


async def _summarize_costs(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    start_date: date,
    end_date: date,
    department_id: uuid.UUID | None,
) -> CostTotals:
    period_start = datetime.combine(start_date, datetime.min.time(), tzinfo=UTC)
    period_end = datetime.combine(
        end_date + timedelta(days=1),
        datetime.min.time(),
        tzinfo=UTC,
    )

    query = tenant.apply(
        select(
            Decision.type,
            func.coalesce(func.sum(Decision.estimated_cost), 0),
            func.coalesce(func.sum(Decision.cost_of_inaction), 0),
            func.count(Decision.id),
        ).where(
            Decision.created_at >= period_start,
            Decision.created_at < period_end,
        ),
        Decision,
    )

    if department_id is not None:
        query = query.where(Decision.department_id == department_id)

    query = query.group_by(Decision.type)

    rows = (await session.execute(query)).all()

    replacement = 0.0
    overtime = 0.0
    external = 0.0
    training = 0.0
    productivity_loss = 0.0
    decision_count = 0

    for row in rows:
        decision_type = row[0]
        estimated_cost = _as_float(row[1])
        inaction_cost = _as_float(row[2])
        count = int(row[3] or 0)
        decision_count += count
        productivity_loss += inaction_cost

        if decision_type == DecisionType.REPLACEMENT:
            replacement += estimated_cost
        elif decision_type == DecisionType.OVERTIME:
            overtime += estimated_cost
        elif decision_type == DecisionType.EXTERNAL:
            external += estimated_cost
        elif decision_type == DecisionType.TRAINING:
            training += estimated_cost

    return CostTotals(
        replacement_costs=round(replacement, 2),
        overtime_costs=round(overtime, 2),
        external_contractor_costs=round(external, 2),
        training_costs=round(training, 2),
        productivity_loss=round(productivity_loss, 2),
        decision_count=decision_count,
    )


async def get_cost_impact_analysis(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    department_id: str | None = None,
) -> CostImpactAnalysisResult:
    """Build a cost impact analysis compatible with legacy frontend contracts."""
    resolved_start, resolved_end = _date_bounds(start_date, end_date)
    normalized_department_id: uuid.UUID | None = None
    if department_id is not None:
        try:
            normalized_department_id = uuid.UUID(department_id)
        except ValueError as exc:
            raise ValueError("departmentId must be a valid UUID") from exc

    current = await _summarize_costs(
        session,
        tenant,
        start_date=resolved_start,
        end_date=resolved_end,
        department_id=normalized_department_id,
    )

    period_days = (resolved_end - resolved_start).days + 1
    previous_end = resolved_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=period_days - 1)

    previous = await _summarize_costs(
        session,
        tenant,
        start_date=previous_start,
        end_date=previous_end,
        department_id=normalized_department_id,
    )

    direct_total = (
        current.replacement_costs
        + current.overtime_costs
        + current.external_contractor_costs
    )
    management_overhead = round(direct_total * 0.05, 2)
    indirect_total = (
        current.productivity_loss + current.training_costs + management_overhead
    )
    total_cost = round(direct_total + indirect_total, 2)
    cost_per_absence_day = round(total_cost / max(current.decision_count, 1), 2)

    previous_direct_total = (
        previous.replacement_costs
        + previous.overtime_costs
        + previous.external_contractor_costs
    )
    previous_management_overhead = round(previous_direct_total * 0.05, 2)
    previous_total_cost = round(
        previous_direct_total
        + previous.productivity_loss
        + previous.training_costs
        + previous_management_overhead,
        2,
    )
    percentage_change = (
        round(((total_cost - previous_total_cost) / previous_total_cost) * 100, 2)
        if previous_total_cost > 0
        else 0.0
    )

    return CostImpactAnalysisResult(
        start_date=resolved_start,
        end_date=resolved_end,
        department_id=(
            str(normalized_department_id)
            if normalized_department_id
            else None
        ),
        direct_replacement=current.replacement_costs,
        direct_overtime=current.overtime_costs,
        direct_external=current.external_contractor_costs,
        indirect_productivity=current.productivity_loss,
        indirect_management=management_overhead,
        indirect_training=current.training_costs,
        total_cost=total_cost,
        cost_per_absence_day=cost_per_absence_day,
        previous_period_cost=previous_total_cost,
        percentage_change=percentage_change,
    )
