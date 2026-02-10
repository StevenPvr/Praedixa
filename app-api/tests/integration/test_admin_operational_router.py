"""Integration tests for admin_operational router — 100% coverage.

Tests all four endpoints:
- GET /api/v1/admin/organizations/{target_org_id}/canonical
- GET /api/v1/admin/organizations/{target_org_id}/cost-params
- GET /api/v1/admin/organizations/{target_org_id}/coverage-alerts
- GET /api/v1/admin/organizations/{target_org_id}/proof

Strategy:
- Override get_current_user, get_db_session, get_admin_tenant_filter
  via FastAPI dependency_overrides.
- Mock session.execute to return controlled results.
- Use SimpleNamespace for ORM objects (Pydantic model_validate compat).
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_admin_tenant_filter,
    get_current_user,
    get_db_session,
)
from app.core.security import TenantFilter
from app.main import app
from app.models.operational import (
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
    ShiftType,
)

# -- Fixed test identifiers ------------------------------------------------
ADMIN_USER_ID = "11111111-aaaa-bbbb-cccc-000000000001"
TARGET_ORG_ID = uuid.UUID("cccccccc-1111-1111-1111-111111111111")
ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")

PREFIX = f"/api/v1/admin/organizations/{TARGET_ORG_ID}"


def _make_admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="admin@test.com",
        organization_id=str(ADMIN_ORG_ID),
        role="super_admin",
    )


def _make_tenant() -> TenantFilter:
    tf = MagicMock(spec=TenantFilter)
    tf.organization_id = str(TARGET_ORG_ID)
    tf.apply = MagicMock(side_effect=lambda q, *a, **kw: q)
    return tf


# -- Fixtures --------------------------------------------------------------


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
async def admin_client(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = _make_admin_jwt
    app.dependency_overrides[get_admin_tenant_filter] = _make_tenant

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# -- Helpers ---------------------------------------------------------------


def _make_canonical_record(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": TARGET_ORG_ID,
        "site_id": "site-paris",
        "date": date(2026, 1, 15),
        "shift": ShiftType.AM,
        "competence": "infirmier",
        "charge_units": Decimal("120.00"),
        "capacite_plan_h": Decimal("100.00"),
        "realise_h": Decimal("92.00"),
        "abs_h": Decimal("8.00"),
        "hs_h": Decimal("4.00"),
        "interim_h": Decimal("2.00"),
        "cout_interne_est": Decimal("3500.00"),
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_cost_parameter(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": TARGET_ORG_ID,
        "site_id": "site-paris",
        "version": 1,
        "c_int": Decimal("35.00"),
        "maj_hs": Decimal("0.2500"),
        "c_interim": Decimal("45.00"),
        "premium_urgence": Decimal("0.1000"),
        "c_backlog": Decimal("60.00"),
        "cap_hs_shift": 30,
        "cap_interim_site": 50,
        "lead_time_jours": 2,
        "effective_from": date(2026, 1, 1),
        "effective_until": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_coverage_alert(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": TARGET_ORG_ID,
        "site_id": "site-paris",
        "alert_date": date(2026, 1, 18),
        "shift": ShiftType.AM,
        "horizon": Horizon.J3,
        "p_rupture": Decimal("0.6500"),
        "gap_h": Decimal("12.00"),
        "impact_eur": Decimal("420.00"),
        "severity": CoverageAlertSeverity.HIGH,
        "status": CoverageAlertStatus.OPEN,
        "drivers_json": ["Tendance absences"],
        "acknowledged_at": None,
        "resolved_at": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_proof_record(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": TARGET_ORG_ID,
        "site_id": "site-paris",
        "month": date(2026, 1, 1),
        "cout_bau_eur": Decimal("4800.00"),
        "cout_100_eur": Decimal("2100.00"),
        "cout_reel_eur": Decimal("2500.00"),
        "gain_net_eur": Decimal("2300.00"),
        "service_bau_pct": Decimal("0.6000"),
        "service_reel_pct": Decimal("0.8500"),
        "adoption_pct": Decimal("0.9000"),
        "alertes_emises": 10,
        "alertes_traitees": 9,
        "details_json": {"total_gap_h": "120"},
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _scalar_one_result(value):
    """Mock execute result where scalar_one() returns value."""
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _scalars_all_result(values):
    """Mock execute result where scalars().all() returns values."""
    result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = values
    result.scalars.return_value = scalars_mock
    return result


# ── 1. list_org_canonical ─────────────────────────────────────────────────


class TestListOrgCanonical:
    """GET /api/v1/admin/organizations/{org}/canonical"""

    async def test_returns_paginated_canonical_records(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Returns canonical records with pagination metadata."""
        records = [_make_canonical_record(), _make_canonical_record()]

        with patch(
            "app.routers.admin_operational.list_canonical_records",
            return_value=(records, 2),
        ):
            resp = await admin_client.get(f"{PREFIX}/canonical")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 2
        assert body["pagination"]["total"] == 2
        assert body["pagination"]["page"] == 1
        assert body["pagination"]["pageSize"] == 20
        assert body["pagination"]["totalPages"] == 1
        assert body["pagination"]["hasNextPage"] is False
        assert body["pagination"]["hasPreviousPage"] is False

    async def test_canonical_pagination_page2(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Page 2 with has_previous_page=True."""
        records = [_make_canonical_record()]

        with patch(
            "app.routers.admin_operational.list_canonical_records",
            return_value=(records, 25),
        ):
            resp = await admin_client.get(
                f"{PREFIX}/canonical", params={"page": 2, "page_size": 20}
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pagination"]["hasPreviousPage"] is True
        assert body["pagination"]["hasNextPage"] is False
        assert body["pagination"]["totalPages"] == 2

    async def test_canonical_empty_results(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Empty result set returns valid pagination."""
        with patch(
            "app.routers.admin_operational.list_canonical_records",
            return_value=([], 0),
        ):
            resp = await admin_client.get(f"{PREFIX}/canonical")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["pagination"]["total"] == 0
        assert body["pagination"]["totalPages"] == 1


# ── 2. list_org_cost_params ──────────────────────────────────────────────


class TestListOrgCostParams:
    """GET /api/v1/admin/organizations/{org}/cost-params"""

    async def test_returns_paginated_cost_params(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Returns cost parameters with pagination metadata."""
        params = [_make_cost_parameter(), _make_cost_parameter()]

        with patch(
            "app.routers.admin_operational.list_cost_parameters",
            return_value=(params, 2),
        ):
            resp = await admin_client.get(f"{PREFIX}/cost-params")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 2
        assert body["pagination"]["total"] == 2

    async def test_cost_params_page2(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Cost params page 2 with has_previous_page=True."""
        params = [_make_cost_parameter()]

        with patch(
            "app.routers.admin_operational.list_cost_parameters",
            return_value=(params, 25),
        ):
            resp = await admin_client.get(
                f"{PREFIX}/cost-params", params={"page": 2, "page_size": 20}
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pagination"]["hasPreviousPage"] is True

    async def test_cost_params_empty(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Empty cost params result."""
        with patch(
            "app.routers.admin_operational.list_cost_parameters",
            return_value=([], 0),
        ):
            resp = await admin_client.get(f"{PREFIX}/cost-params")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["pagination"]["total"] == 0


# ── 3. list_org_coverage_alerts ──────────────────────────────────────────


class TestListOrgCoverageAlerts:
    """GET /api/v1/admin/organizations/{org}/coverage-alerts"""

    async def test_returns_paginated_coverage_alerts(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Returns coverage alerts with pagination metadata."""
        alerts = [_make_coverage_alert(), _make_coverage_alert()]

        # The endpoint does inline queries:
        # 1. count query -> scalar_one() -> total
        # 2. items query -> scalars().all() -> alerts
        mock_session.execute.side_effect = [
            _scalar_one_result(2),
            _scalars_all_result(alerts),
        ]

        resp = await admin_client.get(f"{PREFIX}/coverage-alerts")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 2
        assert body["pagination"]["total"] == 2
        assert body["pagination"]["totalPages"] == 1

    async def test_coverage_alerts_page2(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Coverage alerts page 2 with has_previous_page=True."""
        alerts = [_make_coverage_alert()]

        mock_session.execute.side_effect = [
            _scalar_one_result(25),
            _scalars_all_result(alerts),
        ]

        resp = await admin_client.get(
            f"{PREFIX}/coverage-alerts", params={"page": 2, "page_size": 20}
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pagination"]["hasPreviousPage"] is True
        assert body["pagination"]["hasNextPage"] is False

    async def test_coverage_alerts_empty(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Empty coverage alerts."""
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _scalars_all_result([]),
        ]

        resp = await admin_client.get(f"{PREFIX}/coverage-alerts")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["pagination"]["total"] == 0


# ── 4. list_org_proof ────────────────────────────────────────────────────


class TestListOrgProof:
    """GET /api/v1/admin/organizations/{org}/proof"""

    async def test_returns_paginated_proof_records(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Returns proof records with pagination metadata."""
        records = [_make_proof_record(), _make_proof_record()]

        with patch(
            "app.routers.admin_operational.list_proof_records",
            return_value=(records, 2),
        ):
            resp = await admin_client.get(f"{PREFIX}/proof")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 2
        assert body["pagination"]["total"] == 2

    async def test_proof_page2(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Proof records page 2."""
        records = [_make_proof_record()]

        with patch(
            "app.routers.admin_operational.list_proof_records",
            return_value=(records, 25),
        ):
            resp = await admin_client.get(
                f"{PREFIX}/proof", params={"page": 2, "page_size": 20}
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pagination"]["hasPreviousPage"] is True

    async def test_proof_empty(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Empty proof records."""
        with patch(
            "app.routers.admin_operational.list_proof_records",
            return_value=([], 0),
        ):
            resp = await admin_client.get(f"{PREFIX}/proof")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["pagination"]["total"] == 0
