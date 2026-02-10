"""Dashboard schemas — summary KPIs and alerts.

Maps to shared-types: DashboardAlert, DashboardSummary.
"""

import uuid
from datetime import datetime

from pydantic import ConfigDict

from app.models.dashboard_alert import AlertSeverity, AlertType, RelatedEntityType
from app.schemas.base import CamelModel, TenantEntitySchema


class DashboardSummaryResponse(CamelModel):
    """Dashboard KPI summary — aggregated metrics."""

    coverage_human: float
    coverage_merchandise: float
    active_alerts_count: int
    forecast_accuracy: float | None = None
    last_forecast_date: datetime | None = None


class DashboardAlertRead(TenantEntitySchema):
    """Full dashboard alert response."""

    type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    related_entity_type: RelatedEntityType | None = None
    related_entity_id: uuid.UUID | None = None
    action_url: str | None = None
    action_label: str | None = None
    dismissed_at: datetime | None = None
    expires_at: datetime | None = None


class DashboardAlertDismiss(CamelModel):
    """Dismiss an alert."""

    model_config = ConfigDict(extra="forbid")

    alert_id: uuid.UUID
