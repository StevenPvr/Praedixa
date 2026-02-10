"""Integration tests for site-level filtering across all routers.

Tests cover:
- Site-scoped user sees only their site's data (coverage alerts, decisions,
  proof, canonical, cost parameters, dashboard, sites list).
- Org-admin (site_id=None) sees all data (no site restriction).
- Site-scoped user cannot create/mutate records for a different site (403).
- Site isolation: user on site-A cannot see data from site-B.
"""

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
    ShiftType,
)
from app.services.dashboard import DashboardSummary
from tests.integration.conftest import ORG_A_ID, make_mock_site
from tests.unit.conftest import (
    _make_canonical_record,
    _make_cost_parameter,
    _make_operational_decision,
    _make_proof_record,
)

SITE_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
SITE_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
USER_SITE_A = "11111111-1111-1111-1111-111111111111"


def _jwt_site_a(role: str = "manager") -> JWTPayload:
    """JWT for a user restricted to site A."""
    return JWTPayload(
        user_id=USER_SITE_A,
        email="site-a@test.com",
        organization_id=str(ORG_A_ID),
        role=role,
        site_id=SITE_A_ID,
    )


async def _make_site_client(
    session: AsyncMock,
    site_id: str | None = SITE_A_ID,
    role: str = "manager",
) -> AsyncClient:
    """Create a client with site_filter set to the given site."""
    jwt = JWTPayload(
        user_id=USER_SITE_A,
        email="site-user@test.com",
        organization_id=str(ORG_A_ID),
        role=role,
        site_id=site_id,
    )

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))
    app.dependency_overrides[get_site_filter] = lambda: SiteFilter(site_id)

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# ── Coverage Alerts ──────────────────────────────────────────────


async def test_coverage_alerts_site_filter_applied() -> None:
    """Site-scoped user only sees alerts from their site."""
    alert = SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=ORG_A_ID,
        site_id=SITE_A_ID,
        alert_date=date(2026, 1, 18),
        shift=ShiftType.AM,
        horizon=Horizon.J3,
        p_rupture=Decimal("0.65"),
        gap_h=Decimal("12.00"),
        impact_eur=Decimal("420.00"),
        severity=CoverageAlertSeverity.HIGH,
        status=CoverageAlertStatus.OPEN,
        drivers_json=[],
        acknowledged_at=None,
        resolved_at=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    session = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1
    data_result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [alert]
    data_result.scalars.return_value = scalars_mock
    session.execute = AsyncMock(side_effect=[count_result, data_result])

    async with await _make_site_client(session) as client:
        response = await client.get("/api/v1/coverage-alerts")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 1


async def test_coverage_alerts_get_single_site_filtered() -> None:
    """Site-scoped user gets 404 for alert from different site."""
    session = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    session.execute = AsyncMock(return_value=result)

    alert_id = uuid.uuid4()
    async with await _make_site_client(session) as client:
        response = await client.get(f"/api/v1/coverage-alerts/{alert_id}")

    app.dependency_overrides.clear()
    assert response.status_code == 404


# ── Operational Decisions ────────────────────────────────────────


async def test_operational_decisions_site_filter() -> None:
    """Site-scoped user only sees decisions from their site."""
    decisions = [_make_operational_decision(site_id=SITE_A_ID)]

    session = AsyncMock()
    with patch(
        "app.routers.operational_decisions.list_operational_decisions",
        new_callable=AsyncMock,
        return_value=(decisions, 1),
    ) as mock_list:
        async with await _make_site_client(session) as client:
            response = await client.get("/api/v1/operational-decisions")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    mock_list.assert_called_once()
    call_kwargs = mock_list.call_args.kwargs
    assert call_kwargs["site_id"] == SITE_A_ID


async def test_create_decision_site_filter_enforced() -> None:
    """Site-scoped user can create decision for alert in their site."""
    alert = SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=ORG_A_ID,
        site_id=SITE_A_ID,
        alert_date=date(2026, 1, 18),
        shift=ShiftType.AM,
        horizon=Horizon.J3,
        gap_h=Decimal("12.00"),
    )
    decision = _make_operational_decision(site_id=SITE_A_ID)

    alert_result = MagicMock()
    alert_result.scalar_one_or_none.return_value = alert
    session = AsyncMock()
    session.execute = AsyncMock(return_value=alert_result)

    with patch(
        "app.routers.operational_decisions.create_operational_decision",
        new_callable=AsyncMock,
        return_value=decision,
    ):
        async with await _make_site_client(session, role="org_admin") as client:
            response = await client.post(
                "/api/v1/operational-decisions",
                json={
                    "coverageAlertId": str(alert.id),
                    "chosenOptionId": str(uuid.uuid4()),
                    "isOverride": False,
                },
            )

    app.dependency_overrides.clear()
    assert response.status_code == 201


# ── Proof ────────────────────────────────────────────────────────


async def test_proof_list_site_filter() -> None:
    """Site-scoped user only sees proof records from their site."""
    records = [_make_proof_record(site_id=SITE_A_ID)]

    session = AsyncMock()
    with patch(
        "app.routers.proof.list_proof_records",
        new_callable=AsyncMock,
        return_value=(records, 1),
    ) as mock_list:
        async with await _make_site_client(session) as client:
            response = await client.get("/api/v1/proof")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    mock_list.assert_called_once()
    call_kwargs = mock_list.call_args.kwargs
    assert call_kwargs["site_id"] == SITE_A_ID


async def test_proof_generate_403_wrong_site() -> None:
    """Site-scoped user cannot generate proof for a different site."""
    session = AsyncMock()

    async with await _make_site_client(session, role="org_admin") as client:
        response = await client.post(
            "/api/v1/proof/generate",
            json={"siteId": SITE_B_ID, "month": "2026-01-01"},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_proof_generate_201_own_site() -> None:
    """Site-scoped user can generate proof for their own site."""
    record = _make_proof_record(site_id=SITE_A_ID)
    session = AsyncMock()

    with patch(
        "app.routers.proof.generate_proof_record",
        new_callable=AsyncMock,
        return_value=record,
    ):
        async with await _make_site_client(session, role="org_admin") as client:
            response = await client.post(
                "/api/v1/proof/generate",
                json={"siteId": SITE_A_ID, "month": "2026-01-01"},
            )

    app.dependency_overrides.clear()
    assert response.status_code == 201


async def test_proof_pdf_403_wrong_site() -> None:
    """Site-scoped user cannot generate PDF for a different site."""
    session = AsyncMock()

    async with await _make_site_client(session) as client:
        response = await client.get(
            f"/api/v1/proof/pdf?site_id={SITE_B_ID}&month=2026-01-01"
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


# ── Canonical ────────────────────────────────────────────────────


async def test_canonical_list_site_filter() -> None:
    """Site-scoped user only sees canonical records from their site."""
    records = [_make_canonical_record(site_id=SITE_A_ID)]

    session = AsyncMock()
    with patch(
        "app.routers.canonical.list_canonical_records",
        new_callable=AsyncMock,
        return_value=(records, 1),
    ) as mock_list:
        async with await _make_site_client(session) as client:
            response = await client.get("/api/v1/canonical")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    mock_list.assert_called_once()
    call_kwargs = mock_list.call_args.kwargs
    assert call_kwargs["site_id"] == SITE_A_ID


async def test_canonical_create_403_wrong_site() -> None:
    """Site-scoped user cannot create record for a different site."""
    session = AsyncMock()

    async with await _make_site_client(session, role="org_admin") as client:
        response = await client.post(
            "/api/v1/canonical",
            json={
                "siteId": SITE_B_ID,
                "date": "2026-01-15",
                "shift": "am",
                "capacitePlanH": "100.00",
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


async def test_canonical_create_201_own_site() -> None:
    """Site-scoped user can create record for their own site."""
    record = _make_canonical_record(site_id=SITE_A_ID)
    session = AsyncMock()

    with patch(
        "app.routers.canonical.create_canonical_record",
        new_callable=AsyncMock,
        return_value=record,
    ):
        async with await _make_site_client(session, role="org_admin") as client:
            response = await client.post(
                "/api/v1/canonical",
                json={
                    "siteId": SITE_A_ID,
                    "date": "2026-01-15",
                    "shift": "am",
                    "capacitePlanH": "100.00",
                },
            )

    app.dependency_overrides.clear()
    assert response.status_code == 201


async def test_canonical_bulk_import_403_wrong_site() -> None:
    """Site-scoped user cannot bulk import records for a different site."""
    session = AsyncMock()

    async with await _make_site_client(session, role="org_admin") as client:
        response = await client.post(
            "/api/v1/canonical/bulk",
            json={
                "records": [
                    {
                        "siteId": SITE_B_ID,
                        "date": "2026-01-15",
                        "shift": "am",
                        "capacitePlanH": "100.00",
                    }
                ],
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


# ── Cost Parameters ──────────────────────────────────────────────


async def test_cost_params_list_site_filter() -> None:
    """Site-scoped user only sees cost params for their site."""
    params = [_make_cost_parameter(site_id=SITE_A_ID)]

    session = AsyncMock()
    with patch(
        "app.routers.cost_parameters.list_cost_parameters",
        new_callable=AsyncMock,
        return_value=(params, 1),
    ) as mock_list:
        async with await _make_site_client(session) as client:
            response = await client.get("/api/v1/cost-parameters")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    mock_list.assert_called_once()
    call_kwargs = mock_list.call_args.kwargs
    assert call_kwargs["site_id"] == SITE_A_ID


async def test_cost_params_effective_site_filter() -> None:
    """Site-scoped user gets effective cost param for their site."""
    param = _make_cost_parameter(site_id=SITE_A_ID)

    session = AsyncMock()
    with patch(
        "app.routers.cost_parameters.get_effective_cost_parameter",
        new_callable=AsyncMock,
        return_value=param,
    ) as mock_get:
        async with await _make_site_client(session) as client:
            response = await client.get("/api/v1/cost-parameters/effective")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    call_kwargs = mock_get.call_args.kwargs
    assert call_kwargs["site_id"] == SITE_A_ID


async def test_cost_params_history_site_filter() -> None:
    """Site-scoped user gets history for their site."""
    params = [_make_cost_parameter(site_id=SITE_A_ID)]

    session = AsyncMock()
    with patch(
        "app.routers.cost_parameters.get_cost_parameter_history",
        new_callable=AsyncMock,
        return_value=params,
    ) as mock_history:
        async with await _make_site_client(session) as client:
            response = await client.get("/api/v1/cost-parameters/history")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    call_kwargs = mock_history.call_args.kwargs
    assert call_kwargs["site_id"] == SITE_A_ID


async def test_cost_params_create_403_wrong_site() -> None:
    """Site-scoped user cannot create cost param for a different site."""
    session = AsyncMock()

    async with await _make_site_client(session, role="org_admin") as client:
        response = await client.post(
            "/api/v1/cost-parameters",
            json={
                "siteId": SITE_B_ID,
                "cInt": "35.00",
                "majHs": "0.25",
                "cInterim": "45.00",
                "premiumUrgence": "0.10",
                "cBacklog": "60.00",
                "capHsShift": 30,
                "capInterimSite": 50,
                "leadTimeJours": 2,
                "effectiveFrom": "2026-01-01",
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


# ── Dashboard ────────────────────────────────────────────────────


async def test_dashboard_summary_with_site_filter() -> None:
    """Dashboard passes site_id to get_dashboard_summary."""
    mock_summary = DashboardSummary(
        coverage_human=92.5,
        coverage_merchandise=87.3,
        active_alerts_count=3,
        forecast_accuracy=0.92,
        last_forecast_date=datetime(2026, 2, 5, 14, 0, tzinfo=UTC),
    )

    session = AsyncMock()
    with patch(
        "app.routers.dashboard.get_dashboard_summary",
        new_callable=AsyncMock,
        return_value=mock_summary,
    ) as mock_fn:
        async with await _make_site_client(session) as client:
            response = await client.get("/api/v1/dashboard/summary")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    call_kwargs = mock_fn.call_args.kwargs
    assert call_kwargs["site_id"] == SITE_A_ID


async def test_dashboard_summary_org_admin_no_site() -> None:
    """Org admin gets site_id=None passed to dashboard service."""
    mock_summary = DashboardSummary(
        coverage_human=92.5,
        coverage_merchandise=87.3,
        active_alerts_count=3,
        forecast_accuracy=0.92,
        last_forecast_date=datetime(2026, 2, 5, 14, 0, tzinfo=UTC),
    )

    session = AsyncMock()
    with patch(
        "app.routers.dashboard.get_dashboard_summary",
        new_callable=AsyncMock,
        return_value=mock_summary,
    ) as mock_fn:
        async with await _make_site_client(
            session, site_id=None, role="org_admin"
        ) as client:
            response = await client.get("/api/v1/dashboard/summary")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    call_kwargs = mock_fn.call_args.kwargs
    assert call_kwargs["site_id"] is None


# ── Organizations (Sites list) ───────────────────────────────────


async def test_sites_list_filtered_by_site() -> None:
    """Site-scoped user only sees their own site in the list."""
    site_a = make_mock_site(site_id=uuid.UUID(SITE_A_ID), name="Site A")
    site_b = make_mock_site(site_id=uuid.UUID(SITE_B_ID), name="Site B")

    session = AsyncMock()
    with patch(
        "app.routers.organizations.list_sites",
        new_callable=AsyncMock,
        return_value=[site_a, site_b],
    ):
        async with await _make_site_client(session) as client:
            response = await client.get("/api/v1/sites")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["name"] == "Site A"


async def test_sites_list_org_admin_sees_all() -> None:
    """Org admin sees all sites."""
    site_a = make_mock_site(site_id=uuid.UUID(SITE_A_ID), name="Site A")
    site_b = make_mock_site(site_id=uuid.UUID(SITE_B_ID), name="Site B")

    session = AsyncMock()
    with patch(
        "app.routers.organizations.list_sites",
        new_callable=AsyncMock,
        return_value=[site_a, site_b],
    ):
        async with await _make_site_client(
            session, site_id=None, role="org_admin"
        ) as client:
            response = await client.get("/api/v1/sites")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 2


# ── Proof Summary with site filter ──────────────────────────────


async def test_proof_summary_site_filter() -> None:
    """Proof summary passes site_id from site_filter."""
    summary = {
        "total_gain": Decimal("5000.00"),
        "avg_adoption": Decimal("0.85"),
        "avg_service_improvement": Decimal("0.15"),
        "per_site": [],
    }
    records = [_make_proof_record(site_id=SITE_A_ID)]

    session = AsyncMock()
    with (
        patch(
            "app.routers.proof.get_proof_summary",
            new_callable=AsyncMock,
            return_value=summary,
        ) as mock_summary,
        patch(
            "app.routers.proof.list_proof_records",
            new_callable=AsyncMock,
            return_value=(records, 1),
        ) as mock_list,
    ):
        async with await _make_site_client(session) as client:
            response = await client.get("/api/v1/proof/summary")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert mock_summary.call_args.kwargs["site_id"] == SITE_A_ID
    assert mock_list.call_args.kwargs["site_id"] == SITE_A_ID
