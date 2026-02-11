"""Integration tests for decision workspace endpoint."""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_site_filter,
    get_tenant_filter,
)
from app.core.security import SiteFilter, TenantFilter
from app.main import app
from app.models.operational import (
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
    ScenarioOptionType,
    ShiftType,
)

from .conftest import ORG_A_ID, USER_A_ID

ALERT_ID = uuid.UUID("f1111111-0000-0000-0000-000000000001")


def _make_alert_ns(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": ALERT_ID,
        "organization_id": ORG_A_ID,
        "site_id": "site-paris",
        "alert_date": date(2026, 1, 22),
        "shift": ShiftType.AM,
        "horizon": Horizon.J3,
        "p_rupture": Decimal("0.8200"),
        "gap_h": Decimal("12.00"),
        "prediction_interval_low": Decimal("9.00"),
        "prediction_interval_high": Decimal("15.00"),
        "model_version": "v2",
        "calibration_bucket": "high",
        "impact_eur": Decimal("900.00"),
        "severity": CoverageAlertSeverity.HIGH,
        "status": CoverageAlertStatus.OPEN,
        "drivers_json": ["Demand surge", "Unexpected absences"],
        "acknowledged_at": None,
        "resolved_at": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_option_ns(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": ORG_A_ID,
        "coverage_alert_id": ALERT_ID,
        "cost_parameter_id": uuid.uuid4(),
        "option_type": ScenarioOptionType.HS,
        "label": "Heures supplementaires",
        "cout_total_eur": Decimal("450.00"),
        "service_attendu_pct": Decimal("0.9900"),
        "heures_couvertes": Decimal("11.00"),
        "feasibility_score": Decimal("0.9000"),
        "risk_score": Decimal("0.2000"),
        "policy_compliance": True,
        "dominance_reason": "pareto_optimal",
        "recommendation_policy_version": "policy-v1",
        "is_pareto_optimal": True,
        "is_recommended": True,
        "contraintes_json": {"cap_hs_shift": 30},
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _mock_session_for_alert(alert: SimpleNamespace | None) -> AsyncMock:
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
    jwt = _jwt_a(role)

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))
    app.dependency_overrides[get_site_filter] = lambda: SiteFilter(None)

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


async def test_get_decision_workspace_200() -> None:
    """Returns alert context, options, recommendation and diagnostic."""
    alert = _make_alert_ns(p_rupture=Decimal("0.8200"))
    options = [
        _make_option_ns(),
        _make_option_ns(id=uuid.uuid4(), is_recommended=False),
    ]
    session = _mock_session_for_alert(alert)

    with patch(
        "app.routers.decision_workspace.get_scenarios_for_alert",
        new_callable=AsyncMock,
        return_value=options,
    ):
        async with await _make_client(session) as client:
            response = await client.get(f"/api/v1/decision-workspace/{ALERT_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["alert"]["id"] == str(ALERT_ID)
    assert len(payload["data"]["options"]) == 2
    assert payload["data"]["recommendedOptionId"] is not None
    assert payload["data"]["diagnostic"]["riskTrend"] == "worsening"
    assert payload["data"]["diagnostic"]["confidencePct"] == 82.0


async def test_get_decision_workspace_fallback_recommendation() -> None:
    """Falls back to Pareto recommendation when no option is flagged recommended."""
    alert = _make_alert_ns(p_rupture=Decimal("0.2000"))
    candidate = _make_option_ns(is_recommended=False)
    session = _mock_session_for_alert(alert)

    with (
        patch(
            "app.routers.decision_workspace.get_scenarios_for_alert",
            new_callable=AsyncMock,
            return_value=[candidate],
        ),
        patch(
            "app.routers.decision_workspace.compute_pareto_frontier",
            return_value=[candidate],
        ),
        patch(
            "app.routers.decision_workspace.select_recommendation",
            return_value=candidate,
        ),
    ):
        async with await _make_client(session) as client:
            response = await client.get(f"/api/v1/decision-workspace/{ALERT_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["recommendedOptionId"] == str(candidate.id)
    assert payload["data"]["diagnostic"]["riskTrend"] == "improving"


async def test_get_decision_workspace_filters_non_string_drivers() -> None:
    """Diagnostic keeps only string drivers from model payload."""
    alert = _make_alert_ns(p_rupture=Decimal("0.5000"), drivers_json=["x", 1, "y"])
    session = _mock_session_for_alert(alert)

    with patch(
        "app.routers.decision_workspace.get_scenarios_for_alert",
        new_callable=AsyncMock,
        return_value=[],
    ):
        async with await _make_client(session) as client:
            response = await client.get(f"/api/v1/decision-workspace/{ALERT_ID}")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["recommendedOptionId"] is None
    assert payload["data"]["diagnostic"]["confidencePct"] == 50.0
    assert payload["data"]["diagnostic"]["riskTrend"] == "stable"
    assert payload["data"]["diagnostic"]["topDrivers"] == ["x", "y"]


async def test_get_decision_workspace_404() -> None:
    """Unknown alert returns 404."""
    session = _mock_session_for_alert(None)
    missing_id = uuid.uuid4()

    async with await _make_client(session) as client:
        response = await client.get(f"/api/v1/decision-workspace/{missing_id}")

    app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_get_decision_workspace_401_no_auth() -> None:
    """Endpoint requires authentication."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/decision-workspace/{ALERT_ID}")
    app.dependency_overrides.clear()
    assert response.status_code == 401
