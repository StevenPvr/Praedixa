"""DashboardAlert model — real-time notifications for the dashboard.

Maps to shared-types: DashboardAlert.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, sa_enum


class AlertType(str, enum.Enum):
    RISK = "risk"
    DECISION = "decision"
    FORECAST = "forecast"
    ABSENCE = "absence"
    SYSTEM = "system"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class RelatedEntityType(str, enum.Enum):
    ABSENCE = "absence"
    DECISION = "decision"
    FORECAST = "forecast"
    EMPLOYEE = "employee"
    DEPARTMENT = "department"


class DashboardAlert(TenantMixin, Base):
    """Dashboard alert / notification.

    Alerts are created by the ML pipeline or system events.
    Users can dismiss them; they can also auto-expire.
    """

    __tablename__ = "dashboard_alerts"

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
    type: Mapped[AlertType] = mapped_column(sa_enum(AlertType), nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(
        sa_enum(AlertSeverity), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    related_entity_type: Mapped[RelatedEntityType | None] = mapped_column(
        sa_enum(RelatedEntityType)
    )
    related_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True)
    )
    action_url: Mapped[str | None] = mapped_column(String(500))
    action_label: Mapped[str | None] = mapped_column(String(200))
    dismissed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    def __repr__(self) -> str:
        return f"<DashboardAlert {self.type.value} {self.severity.value}>"
