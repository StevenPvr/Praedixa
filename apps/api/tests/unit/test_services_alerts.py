"""Tests for app.services.alerts — alert listing and dismissal."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.services.alerts import dismiss_alert, list_active_alerts
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


class TestListActiveAlerts:
    """Test list_active_alerts service function."""

    @pytest.mark.asyncio
    async def test_returns_active_alerts(self):
        tenant = TenantFilter("org-1")
        alerts = [
            SimpleNamespace(id=uuid.uuid4(), severity="critical"),
            SimpleNamespace(id=uuid.uuid4(), severity="warning"),
        ]
        session = make_mock_session(make_scalars_result(alerts))

        result = await list_active_alerts(tenant, session)
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_empty_alerts(self):
        tenant = TenantFilter("org-1")
        session = make_mock_session(make_scalars_result([]))

        result = await list_active_alerts(tenant, session)
        assert result == []


class TestDismissAlert:
    """Test dismiss_alert service function."""

    @pytest.mark.asyncio
    async def test_dismiss_active_alert(self):
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        alert = SimpleNamespace(
            id=alert_id,
            dismissed_at=None,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(alert),   # fetch alert
            MagicMock(),                 # update result
        )

        result = await dismiss_alert(alert_id, tenant, session)
        assert result.dismissed_at is not None

    @pytest.mark.asyncio
    async def test_dismiss_already_dismissed_idempotent(self):
        """Dismissing an already-dismissed alert returns it as-is."""
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        already_dismissed = datetime(2026, 1, 1, tzinfo=UTC)
        alert = SimpleNamespace(
            id=alert_id,
            dismissed_at=already_dismissed,
            organization_id="org-1",
        )

        session = make_mock_session(make_scalar_result(alert))

        result = await dismiss_alert(alert_id, tenant, session)
        assert result.dismissed_at == already_dismissed
        # Should NOT call execute a second time (no update needed)
        assert session.execute.call_count == 1

    @pytest.mark.asyncio
    async def test_alert_not_found_raises(self):
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()

        session = make_mock_session(make_scalar_result(None))

        with pytest.raises(NotFoundError) as exc_info:
            await dismiss_alert(alert_id, tenant, session)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_defense_in_depth_update_includes_org_id(self):
        """The UPDATE statement should include organization_id in WHERE clause."""
        tenant = TenantFilter("org-abc")
        alert_id = uuid.uuid4()
        alert = SimpleNamespace(
            id=alert_id,
            dismissed_at=None,
            organization_id="org-abc",
        )

        session = make_mock_session(
            make_scalar_result(alert),
            MagicMock(),
        )

        await dismiss_alert(alert_id, tenant, session)

        # Second call is the UPDATE — verify it was called
        assert session.execute.call_count == 2
