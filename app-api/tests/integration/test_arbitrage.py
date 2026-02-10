"""Integration tests for arbitrage endpoints.

Tests cover:
- GET /api/v1/arbitrage/{alert_id}/options — 200, 404
- POST /api/v1/arbitrage/{alert_id}/validate — 201, 404, 403, 422
- Tenant isolation (IDOR prevention)
- Unauthenticated access (401)
"""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.main import app
from app.services.arbitrage import ArbitrageOption, ArbitrageResult

from .conftest import ORG_A_ID


def _make_mock_arbitrage_result(
    alert_id: uuid.UUID | None = None,
) -> ArbitrageResult:
    """Create a mock ArbitrageResult value object."""
    aid = alert_id or uuid.uuid4()
    dept_id = uuid.uuid4()
    options = [
        ArbitrageOption(
            type="overtime",
            label="Heures supplementaires",
            cost=1875.00,
            delay_days=0,
            coverage_impact_pct=20.0,
            risk_level="medium",
            risk_details="Fatigue accrue",
            pros=["Immediate", "Pas de formation"],
            cons=["Cout majore"],
            score=0.8,
        ),
        ArbitrageOption(
            type="external",
            label="Personnel interimaire",
            cost=3600.00,
            delay_days=3,
            coverage_impact_pct=80.0,
            risk_level="medium",
            risk_details="Temps de formation",
            pros=["Forte couverture"],
            cons=["Cout eleve"],
            score=0.6,
        ),
        ArbitrageOption(
            type="redistribution",
            label="Reallocation interne",
            cost=450.00,
            delay_days=2,
            coverage_impact_pct=50.0,
            risk_level="low",
            risk_details="Impact departements donneurs",
            pros=["Cout bas"],
            cons=["Couverture limitee"],
            score=0.9,
        ),
        ArbitrageOption(
            type="no_action",
            label="Accepter la degradation",
            cost=0.0,
            delay_days=0,
            coverage_impact_pct=0.0,
            risk_level="high",
            risk_details="Cout indirect eleve",
            pros=["Aucun cout direct"],
            cons=["Impact SLA"],
            score=0.1,
        ),
    ]

    return ArbitrageResult(
        alert_id=aid,
        alert_title="Test Alert",
        alert_severity="warning",
        department_id=dept_id,
        department_name="Expedition",
        site_name="Paris Nord",
        deficit_pct=15.0,
        horizon_days=7,
        options=options,
        recommendation_index=2,
    )


def _make_mock_decision(decision_id: uuid.UUID | None = None) -> SimpleNamespace:
    """Create a mock Decision ORM object for validate endpoint."""
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=decision_id or uuid.uuid4(),
        organization_id=ORG_A_ID,
        forecast_run_id=None,
        department_id=uuid.uuid4(),
        target_period={"startDate": "2026-02-10", "endDate": "2026-02-17"},
        type="overtime",
        priority="high",
        status="pending_review",
        title="Arbitrage: Heures supplementaires - Expedition",
        description="Test description",
        rationale="Test rationale",
        risk_indicators={},
        estimated_cost=1875.00,
        cost_of_inaction=None,
        estimated_roi=None,
        confidence_score=85.0,
        related_employee_id=None,
        suggested_replacement_id=None,
        reviewed_by=None,
        reviewed_at=None,
        manager_notes=None,
        implementation_deadline=None,
        implemented_by=None,
        implemented_at=None,
        outcome=None,
        created_at=now,
        updated_at=now,
    )


# --- GET /api/v1/arbitrage/{alert_id}/options ---


async def test_get_options_200(client_a: AsyncClient) -> None:
    """GET /api/v1/arbitrage/{alert_id}/options returns 4 options."""
    alert_id = uuid.uuid4()
    result = _make_mock_arbitrage_result(alert_id=alert_id)

    with patch(
        "app.routers.arbitrage.get_arbitrage_options",
        new_callable=AsyncMock,
        return_value=result,
    ):
        response = await client_a.get(f"/api/v1/arbitrage/{alert_id}/options")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["options"]) == 4
    assert data["data"]["alertId"] == str(alert_id)
    assert data["data"]["recommendationIndex"] == 2


async def test_get_options_has_all_option_types(client_a: AsyncClient) -> None:
    """GET /api/v1/arbitrage/{alert_id}/options includes all 4 option types."""
    alert_id = uuid.uuid4()
    result = _make_mock_arbitrage_result(alert_id=alert_id)

    with patch(
        "app.routers.arbitrage.get_arbitrage_options",
        new_callable=AsyncMock,
        return_value=result,
    ):
        response = await client_a.get(f"/api/v1/arbitrage/{alert_id}/options")

    data = response.json()
    types = [opt["type"] for opt in data["data"]["options"]]
    assert set(types) == {"overtime", "external", "redistribution", "no_action"}


async def test_get_options_404_not_found(client_a: AsyncClient) -> None:
    """GET /api/v1/arbitrage/{alert_id}/options returns 404 for unknown alert."""
    alert_id = uuid.uuid4()

    with patch(
        "app.routers.arbitrage.get_arbitrage_options",
        new_callable=AsyncMock,
        side_effect=NotFoundError("DashboardAlert", str(alert_id)),
    ):
        response = await client_a.get(f"/api/v1/arbitrage/{alert_id}/options")

    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"


async def test_get_options_404_other_org(client_b: AsyncClient) -> None:
    """GET from org B on org A's alert returns 404 (tenant isolation)."""
    alert_id = uuid.uuid4()

    with patch(
        "app.routers.arbitrage.get_arbitrage_options",
        new_callable=AsyncMock,
        side_effect=NotFoundError("DashboardAlert", str(alert_id)),
    ):
        response = await client_b.get(f"/api/v1/arbitrage/{alert_id}/options")

    assert response.status_code == 404


async def test_get_options_401_no_auth(unauth_client: AsyncClient) -> None:
    """GET /api/v1/arbitrage/{alert_id}/options returns 401 without auth."""
    alert_id = uuid.uuid4()
    response = await unauth_client.get(f"/api/v1/arbitrage/{alert_id}/options")
    assert response.status_code == 401


# --- POST /api/v1/arbitrage/{alert_id}/validate ---


async def test_validate_option_201(client_a: AsyncClient) -> None:
    """POST /api/v1/arbitrage/{alert_id}/validate creates a decision."""
    alert_id = uuid.uuid4()
    result = _make_mock_arbitrage_result(alert_id=alert_id)
    decision = _make_mock_decision()

    with (
        patch(
            "app.routers.arbitrage.get_arbitrage_options",
            new_callable=AsyncMock,
            return_value=result,
        ),
        patch(
            "app.routers.arbitrage.create_decision",
            new_callable=AsyncMock,
            return_value=decision,
        ),
    ):
        response = await client_a.post(
            f"/api/v1/arbitrage/{alert_id}/validate",
            json={"selectedOptionIndex": 0},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True


async def test_validate_option_with_notes_201(client_a: AsyncClient) -> None:
    """POST /api/v1/arbitrage/{alert_id}/validate accepts optional notes."""
    alert_id = uuid.uuid4()
    result = _make_mock_arbitrage_result(alert_id=alert_id)
    decision = _make_mock_decision()

    with (
        patch(
            "app.routers.arbitrage.get_arbitrage_options",
            new_callable=AsyncMock,
            return_value=result,
        ),
        patch(
            "app.routers.arbitrage.create_decision",
            new_callable=AsyncMock,
            return_value=decision,
        ),
    ):
        response = await client_a.post(
            f"/api/v1/arbitrage/{alert_id}/validate",
            json={
                "selectedOptionIndex": 2,
                "notes": "Preferred option per team discussion",
            },
        )

    assert response.status_code == 201


async def test_validate_option_422_invalid_index(client_a: AsyncClient) -> None:
    """POST /api/v1/arbitrage/{alert_id}/validate rejects index > 3."""
    alert_id = uuid.uuid4()

    response = await client_a.post(
        f"/api/v1/arbitrage/{alert_id}/validate",
        json={"selectedOptionIndex": 5},
    )

    assert response.status_code == 422


async def test_validate_option_422_negative_index(client_a: AsyncClient) -> None:
    """POST /api/v1/arbitrage/{alert_id}/validate rejects negative index."""
    alert_id = uuid.uuid4()

    response = await client_a.post(
        f"/api/v1/arbitrage/{alert_id}/validate",
        json={"selectedOptionIndex": -1},
    )

    assert response.status_code == 422


async def test_validate_option_404_alert_not_found(client_a: AsyncClient) -> None:
    """POST /api/v1/arbitrage/{alert_id}/validate returns 404 for unknown alert."""
    alert_id = uuid.uuid4()

    with patch(
        "app.routers.arbitrage.get_arbitrage_options",
        new_callable=AsyncMock,
        side_effect=NotFoundError("DashboardAlert", str(alert_id)),
    ):
        response = await client_a.post(
            f"/api/v1/arbitrage/{alert_id}/validate",
            json={"selectedOptionIndex": 0},
        )

    assert response.status_code == 404


async def test_validate_option_403_viewer_role(mock_session: AsyncMock) -> None:
    """POST /api/v1/arbitrage/{alert_id}/validate returns 403 for viewer role."""
    from collections.abc import AsyncGenerator

    viewer_jwt = JWTPayload(
        user_id="viewer-001",
        email="viewer@test.com",
        organization_id=str(ORG_A_ID),
        role="viewer",
    )

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: viewer_jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    alert_id = uuid.uuid4()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/arbitrage/{alert_id}/validate",
            json={"selectedOptionIndex": 0},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_validate_option_422_index_exceeds_available(
    client_a: AsyncClient,
) -> None:
    """POST validate returns 422 when index exceeds options."""
    alert_id = uuid.uuid4()
    # Create result with only 2 options instead of 4
    dept_id = uuid.uuid4()
    short_result = ArbitrageResult(
        alert_id=alert_id,
        alert_title="Short",
        alert_severity="info",
        department_id=dept_id,
        department_name="Test",
        site_name="Test",
        deficit_pct=5.0,
        horizon_days=3,
        options=[
            ArbitrageOption(
                type="overtime",
                label="OT",
                cost=100,
                delay_days=0,
                coverage_impact_pct=10,
                risk_level="low",
                risk_details="ok",
                pros=["a"],
                cons=["b"],
                score=0.5,
            ),
            ArbitrageOption(
                type="no_action",
                label="NA",
                cost=0,
                delay_days=0,
                coverage_impact_pct=0,
                risk_level="high",
                risk_details="bad",
                pros=["c"],
                cons=["d"],
                score=0.1,
            ),
        ],
        recommendation_index=0,
    )

    with patch(
        "app.routers.arbitrage.get_arbitrage_options",
        new_callable=AsyncMock,
        return_value=short_result,
    ):
        response = await client_a.post(
            f"/api/v1/arbitrage/{alert_id}/validate",
            json={"selectedOptionIndex": 3},
        )

    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


async def test_validate_option_401_no_auth(unauth_client: AsyncClient) -> None:
    """POST /api/v1/arbitrage/{alert_id}/validate returns 401 without auth."""
    alert_id = uuid.uuid4()
    response = await unauth_client.post(
        f"/api/v1/arbitrage/{alert_id}/validate",
        json={"selectedOptionIndex": 0},
    )
    assert response.status_code == 401
