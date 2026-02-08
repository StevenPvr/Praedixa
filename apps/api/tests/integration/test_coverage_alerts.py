"""Integration tests for coverage alerts endpoints.

Tests cover:
- GET /api/v1/coverage-alerts — list with pagination, filters, empty result
- GET /api/v1/coverage-alerts/{alert_id} — single alert, 404
- POST /api/v1/coverage-alerts/{alert_id}/acknowledge — 200, 404, 403
- POST /api/v1/coverage-alerts/{alert_id}/resolve — 200, 404, 403
- Unauthenticated access (401)
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.main import app
from app.models.operational import (
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
    ShiftType,
)

from .conftest import ORG_A_ID, USER_A_ID

# Fixed UUIDs for reproducibility
ALERT_ID = uuid.UUID("cccccccc-0000-0000-0000-000000000001")


def _make_coverage_alert_ns(**overrides) -> SimpleNamespace:
    """Build a coverage alert SimpleNamespace with sensible defaults."""
    now = datetime.now(UTC)
    defaults = {
        "id": ALERT_ID,
        "organization_id": ORG_A_ID,
        "site_id": "site-paris",
        "alert_date": date(2026, 1, 18),
        "shift": ShiftType.AM,
        "horizon": Horizon.J3,
        "p_rupture": Decimal("0.6500"),
        "gap_h": Decimal("12.00"),
        "impact_eur": Decimal("420.00"),
        "severity": CoverageAlertSeverity.HIGH,
        "status": CoverageAlertStatus.OPEN,
        "drivers_json": ["Tendance absences", "Charge en hausse"],
        "acknowledged_at": None,
        "resolved_at": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _mock_session_for_list(alerts: list, total: int) -> AsyncMock:
    """Build a mock session that returns count then list results."""
    session = AsyncMock()

    # First call: count query -> scalar_one()
    count_result = MagicMock()
    count_result.scalar_one.return_value = total

    # Second call: data query -> scalars().all()
    data_result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = alerts
    data_result.scalars.return_value = scalars_mock

    session.execute = AsyncMock(side_effect=[count_result, data_result])
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


def _mock_session_for_single(alert) -> AsyncMock:
    """Build a mock session that returns a single alert from scalar_one_or_none."""
    session = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = alert
    session.execute = AsyncMock(return_value=result)
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


def _jwt_a(role: str = "org_admin") -> JWTPayload:
    return JWTPayload(
        user_id=USER_A_ID,
        email=f"{USER_A_ID}@test.com",
        organization_id=str(ORG_A_ID),
        role=role,
    )


async def _make_client(session: AsyncMock, role: str = "org_admin") -> AsyncClient:
    """Create an async client with overrides."""
    jwt = _jwt_a(role)

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# ── GET /api/v1/coverage-alerts ──────────────────────────────


async def test_list_alerts_200() -> None:
    """GET /api/v1/coverage-alerts returns paginated alerts."""
    alerts = [_make_coverage_alert_ns(), _make_coverage_alert_ns(id=uuid.uuid4())]
    session = _mock_session_for_list(alerts, 2)

    async with await _make_client(session) as client:
        response = await client.get("/api/v1/coverage-alerts")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2
    assert data["pagination"]["total"] == 2
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["pageSize"] == 20


async def test_list_alerts_empty() -> None:
    """GET /api/v1/coverage-alerts returns empty list."""
    session = _mock_session_for_list([], 0)

    async with await _make_client(session) as client:
        response = await client.get("/api/v1/coverage-alerts")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["data"] == []
    assert data["pagination"]["total"] == 0
    assert data["pagination"]["totalPages"] == 1


async def test_list_alerts_with_filters() -> None:
    """GET /api/v1/coverage-alerts with all filter params."""
    alerts = [_make_coverage_alert_ns()]
    session = _mock_session_for_list(alerts, 1)

    async with await _make_client(session) as client:
        response = await client.get(
            "/api/v1/coverage-alerts",
            params={
                "site_id": "site-paris",
                "status": "open",
                "severity": "high",
                "horizon": "j3",
                "date_from": "2026-01-01",
                "date_to": "2026-01-31",
                "page": 1,
                "page_size": 10,
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 1


async def test_list_alerts_pagination_multiple_pages() -> None:
    """GET /api/v1/coverage-alerts with page_size=1 and total=2."""
    alerts = [_make_coverage_alert_ns()]
    session = _mock_session_for_list(alerts, 2)

    async with await _make_client(session) as client:
        response = await client.get(
            "/api/v1/coverage-alerts",
            params={"page": 1, "page_size": 1},
        )

    app.dependency_overrides.clear()
    data = response.json()
    assert data["pagination"]["totalPages"] == 2
    assert data["pagination"]["hasNextPage"] is True
    assert data["pagination"]["hasPreviousPage"] is False


async def test_list_alerts_401_no_auth() -> None:
    """GET /api/v1/coverage-alerts returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/coverage-alerts")
    app.dependency_overrides.clear()
    assert response.status_code == 401


# ── GET /api/v1/coverage-alerts/{alert_id} ──────────────────


async def test_get_single_alert_200() -> None:
    """GET /api/v1/coverage-alerts/{id} returns the alert."""
    alert = _make_coverage_alert_ns()
    session = _mock_session_for_single(alert)

    async with await _make_client(session) as client:
        response = await client.get(f"/api/v1/coverage-alerts/{ALERT_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == str(ALERT_ID)


async def test_get_single_alert_404() -> None:
    """GET /api/v1/coverage-alerts/{id} returns 404 for unknown alert."""
    session = _mock_session_for_single(None)
    missing_id = uuid.uuid4()

    async with await _make_client(session) as client:
        response = await client.get(f"/api/v1/coverage-alerts/{missing_id}")

    app.dependency_overrides.clear()
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


async def test_get_single_alert_401_no_auth() -> None:
    """GET /api/v1/coverage-alerts/{id} returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/coverage-alerts/{ALERT_ID}")
    app.dependency_overrides.clear()
    assert response.status_code == 401


# ── POST /api/v1/coverage-alerts/{alert_id}/acknowledge ─────


async def test_acknowledge_alert_200() -> None:
    """POST /api/v1/coverage-alerts/{id}/acknowledge sets status to ACKNOWLEDGED."""
    alert = _make_coverage_alert_ns()
    session = _mock_session_for_single(alert)

    async with await _make_client(session, role="org_admin") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{ALERT_ID}/acknowledge",
            json={},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # The router modifies alert.status in place
    assert alert.status == CoverageAlertStatus.ACKNOWLEDGED
    assert alert.acknowledged_at is not None


async def test_acknowledge_alert_manager_role_200() -> None:
    """POST /api/v1/coverage-alerts/{id}/acknowledge allowed for manager role."""
    alert = _make_coverage_alert_ns()
    session = _mock_session_for_single(alert)

    async with await _make_client(session, role="manager") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{ALERT_ID}/acknowledge",
            json={},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200


async def test_acknowledge_alert_404() -> None:
    """POST /api/v1/coverage-alerts/{id}/acknowledge returns 404 for unknown alert."""
    session = _mock_session_for_single(None)
    missing_id = uuid.uuid4()

    async with await _make_client(session, role="org_admin") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{missing_id}/acknowledge",
            json={},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_acknowledge_alert_403_viewer() -> None:
    """POST /api/v1/coverage-alerts/{id}/acknowledge returns 403 for viewer role."""
    alert = _make_coverage_alert_ns()
    session = _mock_session_for_single(alert)

    async with await _make_client(session, role="viewer") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{ALERT_ID}/acknowledge",
            json={},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_acknowledge_alert_401_no_auth() -> None:
    """POST /api/v1/coverage-alerts/{id}/acknowledge returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{ALERT_ID}/acknowledge",
            json={},
        )
    app.dependency_overrides.clear()
    assert response.status_code == 401


# ── POST /api/v1/coverage-alerts/{alert_id}/resolve ─────────


async def test_resolve_alert_200() -> None:
    """POST /api/v1/coverage-alerts/{id}/resolve sets status to RESOLVED."""
    alert = _make_coverage_alert_ns()
    session = _mock_session_for_single(alert)

    async with await _make_client(session, role="org_admin") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{ALERT_ID}/resolve",
            json={},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert alert.status == CoverageAlertStatus.RESOLVED
    assert alert.resolved_at is not None


async def test_resolve_alert_manager_role_200() -> None:
    """POST /api/v1/coverage-alerts/{id}/resolve allowed for manager role."""
    alert = _make_coverage_alert_ns()
    session = _mock_session_for_single(alert)

    async with await _make_client(session, role="manager") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{ALERT_ID}/resolve",
            json={},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200


async def test_resolve_alert_404() -> None:
    """POST /api/v1/coverage-alerts/{id}/resolve returns 404 for unknown alert."""
    session = _mock_session_for_single(None)
    missing_id = uuid.uuid4()

    async with await _make_client(session, role="org_admin") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{missing_id}/resolve",
            json={},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_resolve_alert_403_viewer() -> None:
    """POST /api/v1/coverage-alerts/{id}/resolve returns 403 for viewer role."""
    alert = _make_coverage_alert_ns()
    session = _mock_session_for_single(alert)

    async with await _make_client(session, role="viewer") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{ALERT_ID}/resolve",
            json={},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_resolve_alert_401_no_auth() -> None:
    """POST /api/v1/coverage-alerts/{id}/resolve returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/coverage-alerts/{ALERT_ID}/resolve",
            json={},
        )
    app.dependency_overrides.clear()
    assert response.status_code == 401
