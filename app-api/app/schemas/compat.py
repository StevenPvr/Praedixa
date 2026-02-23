"""Compatibility schemas for legacy webapp API contracts.

These models back endpoints that exist primarily for frontend contract
compatibility and migration safety.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any, Literal

from pydantic import ConfigDict, Field

from app.schemas.base import CamelModel


class DateRangeRead(CamelModel):
    """Date range payload using shared frontend naming."""

    start_date: date
    end_date: date


class DirectCostsRead(CamelModel):
    """Direct cost breakdown."""

    replacement_costs: float
    overtime_costs: float
    external_contractor_costs: float


class IndirectCostsRead(CamelModel):
    """Indirect cost breakdown."""

    productivity_loss: float
    management_overhead: float
    training_costs: float


class CostComparisonRead(CamelModel):
    """Comparison against previous period."""

    previous_period_cost: float
    percentage_change: float


class CostImpactAnalysisRead(CamelModel):
    """Legacy-compatible cost impact analysis payload."""

    period: DateRangeRead
    department_id: str | None = None
    direct_costs: DirectCostsRead
    indirect_costs: IndirectCostsRead
    total_cost: float
    cost_per_absence_day: float
    comparison: CostComparisonRead | None = None


class ExportDateRangeRequest(CamelModel):
    """Optional date range filter for export generation."""

    model_config = ConfigDict(extra="forbid")

    start_date: date | None = None
    end_date: date | None = None


class ExportRequest(CamelModel):
    """Legacy-compatible export request."""

    model_config = ConfigDict(extra="forbid")

    format: Literal["csv", "xlsx", "pdf", "json"]
    date_range: ExportDateRangeRequest | None = None
    filters: dict[str, Any] | None = None
    columns: list[str] | None = None
    include_headers: bool = True


class ExportResponseData(CamelModel):
    """Legacy-compatible export response embedded in ApiResponse.data."""

    success: bool = True
    export_id: str
    format: Literal["csv", "xlsx", "pdf", "json"]
    status: Literal["pending", "processing", "completed", "failed"]
    download_url: str | None = None
    expires_at: datetime | None = None
    accepted_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC))
