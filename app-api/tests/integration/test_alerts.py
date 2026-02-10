"""Integration tests for alerts endpoints."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient

from app.core.exceptions import NotFoundError


def _make_mock_alert(
    alert_id: uuid.UUID | None = None,
    dismissed: bool = False,
) -> SimpleNamespace:
    """Create a mock DashboardAlert ORM object."""
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=alert_id or uuid.uuid4(),
        organization_id=uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001"),
        type="risk",
        severity="warning",
        title="Test Alert",
        message="This is a test alert.",
        related_entity_type=None,
        related_entity_id=None,
        action_url=None,
        action_label=None,
        dismissed_at=now if dismissed else None,
        expires_at=None,
        created_at=now,
        updated_at=now,
    )


async def test_list_active_alerts_200(client_a: AsyncClient) -> None:
    """GET /api/v1/alerts returns active alerts."""
    alerts = [_make_mock_alert(), _make_mock_alert()]

    with patch(
        "app.routers.alerts.list_active_alerts",
        new_callable=AsyncMock,
        return_value=alerts,
    ):
        response = await client_a.get("/api/v1/alerts")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2


async def test_list_active_alerts_empty(client_a: AsyncClient) -> None:
    """GET /api/v1/alerts returns empty list when no active alerts."""
    with patch(
        "app.routers.alerts.list_active_alerts",
        new_callable=AsyncMock,
        return_value=[],
    ):
        response = await client_a.get("/api/v1/alerts")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []


async def test_dismiss_alert_200(client_a: AsyncClient) -> None:
    """PATCH /api/v1/alerts/{id}/dismiss returns dismissed alert."""
    alert_id = uuid.uuid4()
    dismissed_alert = _make_mock_alert(alert_id=alert_id, dismissed=True)

    with patch(
        "app.routers.alerts.dismiss_alert",
        new_callable=AsyncMock,
        return_value=dismissed_alert,
    ):
        response = await client_a.patch(f"/api/v1/alerts/{alert_id}/dismiss")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["dismissedAt"] is not None


async def test_dismiss_alert_404_not_found(client_a: AsyncClient) -> None:
    """PATCH /api/v1/alerts/{id}/dismiss returns 404 for unknown alert."""
    alert_id = uuid.uuid4()

    with patch(
        "app.routers.alerts.dismiss_alert",
        new_callable=AsyncMock,
        side_effect=NotFoundError("DashboardAlert", str(alert_id)),
    ):
        response = await client_a.patch(f"/api/v1/alerts/{alert_id}/dismiss")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


async def test_dismiss_alert_404_other_org(client_b: AsyncClient) -> None:
    """PATCH from org B on org A's alert returns 404 (tenant isolation)."""
    alert_id = uuid.uuid4()

    with patch(
        "app.routers.alerts.dismiss_alert",
        new_callable=AsyncMock,
        side_effect=NotFoundError("DashboardAlert", str(alert_id)),
    ):
        response = await client_b.patch(f"/api/v1/alerts/{alert_id}/dismiss")

    assert response.status_code == 404


async def test_list_alerts_401_no_auth(unauth_client: AsyncClient) -> None:
    """GET /api/v1/alerts returns 401 without auth."""
    response = await unauth_client.get("/api/v1/alerts")
    assert response.status_code == 401


async def test_dismiss_alert_401_no_auth(unauth_client: AsyncClient) -> None:
    """PATCH /api/v1/alerts/{id}/dismiss returns 401 without auth."""
    alert_id = uuid.uuid4()
    response = await unauth_client.patch(f"/api/v1/alerts/{alert_id}/dismiss")
    assert response.status_code == 401
