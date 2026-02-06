"""Dashboard schemas — alerts and action plans.

Maps to shared-types: DashboardAlert, ActionPlan.
"""

import uuid
from datetime import datetime
from typing import Any

from app.models.action_plan import ActionPlanStatus
from app.models.dashboard_alert import AlertSeverity, AlertType, RelatedEntityType
from app.schemas.base import CamelModel, TenantEntitySchema


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

    alert_id: uuid.UUID


class ActionPlanRead(TenantEntitySchema):
    """Full action plan response."""

    name: str
    description: str
    period: dict[str, Any]
    status: ActionPlanStatus
    decisions: list[dict[str, Any]]
    total_estimated_cost: float
    total_estimated_savings: float
    created_by: uuid.UUID
    approved_by: uuid.UUID | None = None
    approved_at: datetime | None = None


class ActionPlanCreate(CamelModel):
    """Create action plan request."""

    name: str
    description: str
    period: dict[str, Any]
    decision_ids: list[uuid.UUID] = []


class ActionPlanUpdate(CamelModel):
    """Update action plan request."""

    name: str | None = None
    description: str | None = None
    status: ActionPlanStatus | None = None
