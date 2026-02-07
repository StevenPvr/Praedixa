"""ForecastRun model — ML prediction batch metadata.

Maps to shared-types: ForecastRun, ForecastModelType, ForecastStatus,
ForecastMetrics.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, sa_enum


class ForecastModelType(str, enum.Enum):
    ARIMA = "arima"
    PROPHET = "prophet"
    RANDOM_FOREST = "random_forest"
    XGBOOST = "xgboost"
    ENSEMBLE = "ensemble"


class ForecastStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ForecastRun(TenantMixin, Base):
    """A single forecast computation run.

    Produced by the external ML pipeline and written into the
    Data Foundation. The web app reads these records.
    """

    __tablename__ = "forecast_runs"

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
    model_type: Mapped[ForecastModelType] = mapped_column(
        sa_enum(ForecastModelType), nullable=False
    )
    model_version: Mapped[str | None] = mapped_column(String(50))
    horizon_days: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ForecastStatus] = mapped_column(
        sa_enum(ForecastStatus),
        default=ForecastStatus.PENDING,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accuracy_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    error_message: Mapped[str | None] = mapped_column(String(1000))
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        index=True,
    )
    # ForecastMetrics + training data range as JSONB
    config: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, server_default="{}"
    )

    def __repr__(self) -> str:
        return f"<ForecastRun {self.model_type.value} {self.status.value}>"
