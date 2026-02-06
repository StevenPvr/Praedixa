"""DailyForecast model — per-day prediction output.

Maps to shared-types: DailyForecast, RiskIndicators.

The design doc specifies two forecast dimensions: human capacity and
merchandise volume. The `dimension` enum supports both.
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin


class ForecastDimension(str, enum.Enum):
    HUMAN = "human"
    MERCHANDISE = "merchandise"


class DailyForecast(TenantMixin, Base):
    """One forecast data point: a single day, department, and dimension.

    Pre-computed by the ML pipeline and stored in the Data Foundation.
    The web app reads these to render forecast charts and risk maps.
    """

    __tablename__ = "daily_forecasts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    forecast_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forecast_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        index=True,
    )
    forecast_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True
    )
    dimension: Mapped[ForecastDimension] = mapped_column(nullable=False)
    predicted_demand: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    predicted_capacity: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    gap: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    risk_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    confidence_lower: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    confidence_upper: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    # RiskIndicators + breakdown by type as JSONB
    details: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )

    def __repr__(self) -> str:
        return f"<DailyForecast {self.forecast_date} {self.dimension.value}>"
