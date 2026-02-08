"""Integration tests for operational decisions endpoints.

Tests cover:
- GET /api/v1/operational-decisions — list with pagination/filters
- GET /api/v1/operational-decisions/override-stats — override statistics
- GET /api/v1/operational-decisions/{id} — single decision, 404
- POST /api/v1/operational-decisions — create decision (201), 404 alert, 403
- PATCH /api/v1/operational-decisions/{id} — update observed outcomes
- Unauthenticated access (401)
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

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

from .conftest import ORG_A_ID

# Use a valid UUID for user_id because the create_decision endpoint calls
# uuid.UUID(current_user.user_id) to set decided_by.
USER_A_UUID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
DECISION_ID = uuid.UUID("eeeeeeee-0000-0000-0000-000000000001")
ALERT_ID = uuid.UUID("eeeeeeee-0000-0000-0000-000000000002")
OPTION_ID = uuid.UUID("eeeeeeee-0000-0000-0000-000000000003")
DECIDED_BY = uuid.UUID(USER_A_UUID)


def _make_decision_ns(**overrides) -> SimpleNamespace:
    """Build an operational decision SimpleNamespace."""
    now = datetime.now(UTC)
    defaults = {
        "id": DECISION_ID,
        "organization_id": ORG_A_ID,
        "coverage_alert_id": ALERT_ID,
        "recommended_option_id": uuid.uuid4(),
        "chosen_option_id": OPTION_ID,
        "site_id": "site-paris",
        "decision_date": date(2026, 1, 18),
        "shift": ShiftType.AM,
        "horizon": Horizon.J3,
        "gap_h": Decimal("12.00"),
        "is_override": False,
        "override_reason": None,
        "cout_attendu_eur": Decimal("525.00"),
        "service_attendu_pct": Decimal("1.0000"),
        "cout_observe_eur": None,
        "service_observe_pct": None,
        "decided_by": DECIDED_BY,
        "comment": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_alert_ns(**overrides) -> SimpleNamespace:
    """Build a coverage alert SimpleNamespace for create-decision flow."""
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
        "drivers_json": [],
        "acknowledged_at": None,
        "resolved_at": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _jwt_a(role: str = "org_admin") -> JWTPayload:
    return JWTPayload(
        user_id=USER_A_UUID,
        email="user-a@test.com",
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


# ── GET /api/v1/operational-decisions ────────────────────────


async def test_list_decisions_200() -> None:
    """GET /api/v1/operational-decisions returns paginated decisions."""
    decisions = [_make_decision_ns(), _make_decision_ns(id=uuid.uuid4())]
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.list_operational_decisions",
        new_callable=AsyncMock,
        return_value=(decisions, 2),
    ):
        async with await _make_client(session) as client:
            response = await client.get("/api/v1/operational-decisions")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2
    assert data["pagination"]["total"] == 2


async def test_list_decisions_empty() -> None:
    """GET /api/v1/operational-decisions returns empty list."""
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.list_operational_decisions",
        new_callable=AsyncMock,
        return_value=([], 0),
    ):
        async with await _make_client(session) as client:
            response = await client.get("/api/v1/operational-decisions")

    app.dependency_overrides.clear()
    data = response.json()
    assert data["data"] == []
    assert data["pagination"]["total"] == 0
    assert data["pagination"]["totalPages"] == 1


async def test_list_decisions_with_filters() -> None:
    """GET /api/v1/operational-decisions with all filter params."""
    decisions = [_make_decision_ns()]
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.list_operational_decisions",
        new_callable=AsyncMock,
        return_value=(decisions, 1),
    ):
        async with await _make_client(session) as client:
            response = await client.get(
                "/api/v1/operational-decisions",
                params={
                    "site_id": "site-paris",
                    "date_from": "2026-01-01",
                    "date_to": "2026-01-31",
                    "is_override": "false",
                    "horizon": "j3",
                    "page": 1,
                    "page_size": 10,
                },
            )

    app.dependency_overrides.clear()
    assert response.status_code == 200


async def test_list_decisions_pagination_multiple_pages() -> None:
    """GET /api/v1/operational-decisions with pagination showing next page."""
    decisions = [_make_decision_ns()]
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.list_operational_decisions",
        new_callable=AsyncMock,
        return_value=(decisions, 5),
    ):
        async with await _make_client(session) as client:
            response = await client.get(
                "/api/v1/operational-decisions",
                params={"page": 1, "page_size": 2},
            )

    app.dependency_overrides.clear()
    data = response.json()
    assert data["pagination"]["totalPages"] == 3
    assert data["pagination"]["hasNextPage"] is True
    assert data["pagination"]["hasPreviousPage"] is False


async def test_list_decisions_401_no_auth() -> None:
    """GET /api/v1/operational-decisions returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/operational-decisions")
    app.dependency_overrides.clear()
    assert response.status_code == 401


# ── GET /api/v1/operational-decisions/override-stats ─────────


async def test_override_stats_200() -> None:
    """GET /api/v1/operational-decisions/override-stats returns statistics."""
    stats = {
        "total": 10,
        "override_count": 3,
        "override_pct": Decimal("30.0"),
        "top_reasons": [{"reason": "Too costly", "count": 3}],
        "avg_cost_delta": Decimal("50.00"),
    }
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.get_override_statistics",
        new_callable=AsyncMock,
        return_value=stats,
    ):
        async with await _make_client(session) as client:
            response = await client.get("/api/v1/operational-decisions/override-stats")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["totalDecisions"] == 10


async def test_override_stats_401_no_auth() -> None:
    """GET /api/v1/operational-decisions/override-stats returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/operational-decisions/override-stats")
    app.dependency_overrides.clear()
    assert response.status_code == 401


# ── GET /api/v1/operational-decisions/{decision_id} ─────────


async def test_get_decision_200() -> None:
    """GET /api/v1/operational-decisions/{id} returns a single decision."""
    decision = _make_decision_ns()
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.get_operational_decision",
        new_callable=AsyncMock,
        return_value=decision,
    ):
        async with await _make_client(session) as client:
            response = await client.get(f"/api/v1/operational-decisions/{DECISION_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == str(DECISION_ID)


async def test_get_decision_404() -> None:
    """GET /api/v1/operational-decisions/{id} returns 404 for unknown decision."""
    from app.core.exceptions import NotFoundError

    missing_id = uuid.uuid4()
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.get_operational_decision",
        new_callable=AsyncMock,
        side_effect=NotFoundError("OperationalDecision", str(missing_id)),
    ):
        async with await _make_client(session) as client:
            response = await client.get(f"/api/v1/operational-decisions/{missing_id}")

    app.dependency_overrides.clear()
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"


async def test_get_decision_401_no_auth() -> None:
    """GET /api/v1/operational-decisions/{id} returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/operational-decisions/{DECISION_ID}")
    app.dependency_overrides.clear()
    assert response.status_code == 401


# ── POST /api/v1/operational-decisions ───────────────────────


async def test_create_decision_201() -> None:
    """POST /api/v1/operational-decisions creates a decision."""
    alert = _make_alert_ns()
    decision = _make_decision_ns()

    # Mock session.execute for the inline alert query in the router
    alert_result = MagicMock()
    alert_result.scalar_one_or_none.return_value = alert

    session = AsyncMock()
    session.execute = AsyncMock(return_value=alert_result)
    session.flush = AsyncMock()

    with patch(
        "app.routers.operational_decisions.create_operational_decision",
        new_callable=AsyncMock,
        return_value=decision,
    ):
        async with await _make_client(session, role="org_admin") as client:
            response = await client.post(
                "/api/v1/operational-decisions",
                json={
                    "coverageAlertId": str(ALERT_ID),
                    "chosenOptionId": str(OPTION_ID),
                    "isOverride": False,
                },
            )

    app.dependency_overrides.clear()
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == str(DECISION_ID)


async def test_create_decision_alert_not_found_404() -> None:
    """POST /api/v1/operational-decisions returns 404 when alert not found."""
    # The router fetches the alert inline before calling the service
    alert_result = MagicMock()
    alert_result.scalar_one_or_none.return_value = None

    session = AsyncMock()
    session.execute = AsyncMock(return_value=alert_result)

    async with await _make_client(session, role="org_admin") as client:
        response = await client.post(
            "/api/v1/operational-decisions",
            json={
                "coverageAlertId": str(uuid.uuid4()),
                "chosenOptionId": str(OPTION_ID),
                "isOverride": False,
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"


async def test_create_decision_manager_role_201() -> None:
    """POST /api/v1/operational-decisions allowed for manager role."""
    alert = _make_alert_ns()
    decision = _make_decision_ns()

    alert_result = MagicMock()
    alert_result.scalar_one_or_none.return_value = alert

    session = AsyncMock()
    session.execute = AsyncMock(return_value=alert_result)
    session.flush = AsyncMock()

    with patch(
        "app.routers.operational_decisions.create_operational_decision",
        new_callable=AsyncMock,
        return_value=decision,
    ):
        async with await _make_client(session, role="manager") as client:
            response = await client.post(
                "/api/v1/operational-decisions",
                json={
                    "coverageAlertId": str(ALERT_ID),
                    "chosenOptionId": str(OPTION_ID),
                    "isOverride": False,
                },
            )

    app.dependency_overrides.clear()
    assert response.status_code == 201


async def test_create_decision_403_viewer() -> None:
    """POST /api/v1/operational-decisions returns 403 for viewer role."""
    session = AsyncMock()

    async with await _make_client(session, role="viewer") as client:
        response = await client.post(
            "/api/v1/operational-decisions",
            json={
                "coverageAlertId": str(ALERT_ID),
                "chosenOptionId": str(OPTION_ID),
                "isOverride": False,
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_create_decision_401_no_auth() -> None:
    """POST /api/v1/operational-decisions returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/operational-decisions",
            json={
                "coverageAlertId": str(ALERT_ID),
                "chosenOptionId": str(OPTION_ID),
                "isOverride": False,
            },
        )
    app.dependency_overrides.clear()
    assert response.status_code == 401


# ── PATCH /api/v1/operational-decisions/{decision_id} ────────


async def test_update_decision_200() -> None:
    """PATCH /api/v1/operational-decisions/{id} updates observed outcomes."""
    decision = _make_decision_ns(
        cout_observe_eur=Decimal("480.00"),
        service_observe_pct=Decimal("0.9500"),
        comment="Observed values",
    )
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.update_operational_decision",
        new_callable=AsyncMock,
        return_value=decision,
    ):
        async with await _make_client(session, role="org_admin") as client:
            response = await client.patch(
                f"/api/v1/operational-decisions/{DECISION_ID}",
                json={
                    "coutObserveEur": "480.00",
                    "serviceObservePct": "0.95",
                    "comment": "Observed values",
                },
            )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


async def test_update_decision_manager_role_200() -> None:
    """PATCH /api/v1/operational-decisions/{id} allowed for manager role."""
    decision = _make_decision_ns()
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.update_operational_decision",
        new_callable=AsyncMock,
        return_value=decision,
    ):
        async with await _make_client(session, role="manager") as client:
            response = await client.patch(
                f"/api/v1/operational-decisions/{DECISION_ID}",
                json={"comment": "Updated"},
            )

    app.dependency_overrides.clear()
    assert response.status_code == 200


async def test_update_decision_404() -> None:
    """PATCH /api/v1/operational-decisions/{id} returns 404 for unknown decision."""
    from app.core.exceptions import NotFoundError

    missing_id = uuid.uuid4()
    session = AsyncMock()

    with patch(
        "app.routers.operational_decisions.update_operational_decision",
        new_callable=AsyncMock,
        side_effect=NotFoundError("OperationalDecision", str(missing_id)),
    ):
        async with await _make_client(session, role="org_admin") as client:
            response = await client.patch(
                f"/api/v1/operational-decisions/{missing_id}",
                json={"comment": "nope"},
            )

    app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_update_decision_403_viewer() -> None:
    """PATCH /api/v1/operational-decisions/{id} returns 403 for viewer role."""
    session = AsyncMock()

    async with await _make_client(session, role="viewer") as client:
        response = await client.patch(
            f"/api/v1/operational-decisions/{DECISION_ID}",
            json={"comment": "nope"},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_update_decision_401_no_auth() -> None:
    """PATCH /api/v1/operational-decisions/{id} returns 401 without auth."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/api/v1/operational-decisions/{DECISION_ID}",
            json={"comment": "nope"},
        )
    app.dependency_overrides.clear()
    assert response.status_code == 401
