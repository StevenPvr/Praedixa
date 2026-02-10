"""Arbitrage schemas — request/response models for the scoring engine.

Maps to shared-types: ArbitrageOption, ArbitrageResult.
"""

import uuid

from pydantic import ConfigDict, Field

from app.schemas.base import CamelModel


class ArbitrageOptionRead(CamelModel):
    """Single arbitrage option response."""

    type: str  # overtime, external, redistribution, no_action
    label: str
    cost: float
    delay_days: int
    coverage_impact_pct: float
    risk_level: str  # low, medium, high
    risk_details: str
    pros: list[str]
    cons: list[str]


class ArbitrageResultRead(CamelModel):
    """Complete arbitrage analysis response."""

    alert_id: uuid.UUID
    alert_title: str
    alert_severity: str
    department_name: str
    site_name: str
    deficit_pct: float
    horizon_days: int
    options: list[ArbitrageOptionRead]
    recommendation_index: int


class ValidateArbitrageRequest(CamelModel):
    """Request to validate (accept) an arbitrage option.

    extra='forbid' prevents injection of fields like organization_id or status.
    """

    model_config = ConfigDict(extra="forbid")

    selected_option_index: int = Field(ge=0, le=3)
    notes: str | None = Field(default=None, max_length=2000)
