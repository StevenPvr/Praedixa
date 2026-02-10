"""Security tests for admin site_id filtering — prevents cross-org data leakage.

Validates that:
- site_id query parameter is validated against the target organization.
- Invalid UUIDs are rejected with 404.
- Sites belonging to a different org are rejected with 404.
- Valid site_id filters results correctly.
- All admin operational + alerts endpoints support site_id filtering.

These tests serve as contractual evidence for site-level access control
in the admin back-office.
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
ADMIN_USER_ID = "11111111-aaaa-bbbb-cccc-000000000009"
TARGET_ORG_ID = uuid.UUID("cccccccc-9999-9999-9999-999999999999")
ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000009")
VALID_SITE_ID = uuid.UUID("dddddddd-1111-1111-1111-111111111111")
OTHER_ORG_SITE_ID = uuid.UUID("dddddddd-2222-2222-2222-222222222222")

PREFIX = f"/api/v1/admin/organizations/{TARGET_ORG_ID}"


def _make_admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="admin@sitefilter.com",
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


def _scalar_one_result(value):
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _scalar_one_or_none_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _scalars_all_result(values):
    result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = values
    result.scalars.return_value = scalars_mock
    return result


def _make_coverage_alert(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": TARGET_ORG_ID,
        "site_id": str(VALID_SITE_ID),
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


# ── 1. Site validation for coverage-alerts endpoint ──────────────────────


class TestSiteFilterCoverageAlerts:
    """GET /api/v1/admin/organizations/{org}/coverage-alerts?site_id=..."""

    async def test_valid_site_id_filters_results(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Valid site_id belonging to org filters coverage alerts."""
        alerts = [_make_coverage_alert()]

        # 1. site validation query -> site exists
        # 2. count query -> 1
        # 3. items query -> alerts
        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(VALID_SITE_ID),
            _scalar_one_result(1),
            _scalars_all_result(alerts),
        ]

        resp = await admin_client.get(
            f"{PREFIX}/coverage-alerts",
            params={"site_id": str(VALID_SITE_ID)},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 1

    async def test_site_from_different_org_returns_404(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Site that does not belong to target org returns 404."""
        # site validation query -> None (site not found in org)
        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(None),
        ]

        resp = await admin_client.get(
            f"{PREFIX}/coverage-alerts",
            params={"site_id": str(OTHER_ORG_SITE_ID)},
        )

        assert resp.status_code == 404

    async def test_invalid_uuid_site_id_returns_404(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Non-UUID site_id string returns 404."""
        resp = await admin_client.get(
            f"{PREFIX}/coverage-alerts",
            params={"site_id": "not-a-valid-uuid"},
        )

        assert resp.status_code == 404

    async def test_no_site_id_returns_all(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """No site_id returns all alerts without filtering."""
        alerts = [_make_coverage_alert(), _make_coverage_alert()]

        mock_session.execute.side_effect = [
            _scalar_one_result(2),
            _scalars_all_result(alerts),
        ]

        resp = await admin_client.get(f"{PREFIX}/coverage-alerts")

        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 2


# ── 2. Site validation for canonical endpoint ────────────────────────────


class TestSiteFilterCanonical:
    """GET /api/v1/admin/organizations/{org}/canonical?site_id=..."""

    async def test_valid_site_id_passes_to_service(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Valid site_id is passed through to list_canonical_records."""
        # site validation succeeds
        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(VALID_SITE_ID),
        ]

        with patch(
            "app.routers.admin_operational.list_canonical_records",
            return_value=([], 0),
        ) as mock_list:
            resp = await admin_client.get(
                f"{PREFIX}/canonical",
                params={"site_id": str(VALID_SITE_ID)},
            )

        assert resp.status_code == 200
        # Verify site_id was passed to the service
        mock_list.assert_awaited_once()
        call_kwargs = mock_list.call_args
        assert call_kwargs.kwargs["site_id"] == str(VALID_SITE_ID)

    async def test_invalid_site_returns_404(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Site not in org returns 404 for canonical endpoint."""
        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(None),
        ]

        resp = await admin_client.get(
            f"{PREFIX}/canonical",
            params={"site_id": str(OTHER_ORG_SITE_ID)},
        )

        assert resp.status_code == 404


# ── 3. Site validation for cost-params endpoint ──────────────────────────


class TestSiteFilterCostParams:
    """GET /api/v1/admin/organizations/{org}/cost-params?site_id=..."""

    async def test_valid_site_id_passes_to_service(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Valid site_id is passed through to list_cost_parameters."""
        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(VALID_SITE_ID),
        ]

        with patch(
            "app.routers.admin_operational.list_cost_parameters",
            return_value=([], 0),
        ) as mock_list:
            resp = await admin_client.get(
                f"{PREFIX}/cost-params",
                params={"site_id": str(VALID_SITE_ID)},
            )

        assert resp.status_code == 200
        mock_list.assert_awaited_once()
        assert mock_list.call_args.kwargs["site_id"] == str(VALID_SITE_ID)

    async def test_invalid_site_returns_404(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Site not in org returns 404 for cost-params."""
        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(None),
        ]

        resp = await admin_client.get(
            f"{PREFIX}/cost-params",
            params={"site_id": str(OTHER_ORG_SITE_ID)},
        )

        assert resp.status_code == 404


# ── 4. Site validation for proof endpoint ────────────────────────────────


class TestSiteFilterProof:
    """GET /api/v1/admin/organizations/{org}/proof?site_id=..."""

    async def test_valid_site_id_passes_to_service(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Valid site_id is passed through to list_proof_records."""
        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(VALID_SITE_ID),
        ]

        with patch(
            "app.routers.admin_operational.list_proof_records",
            return_value=([], 0),
        ) as mock_list:
            resp = await admin_client.get(
                f"{PREFIX}/proof",
                params={"site_id": str(VALID_SITE_ID)},
            )

        assert resp.status_code == 200
        mock_list.assert_awaited_once()
        assert mock_list.call_args.kwargs["site_id"] == str(VALID_SITE_ID)

    async def test_invalid_site_returns_404(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Site not in org returns 404 for proof."""
        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(None),
        ]

        resp = await admin_client.get(
            f"{PREFIX}/proof",
            params={"site_id": str(OTHER_ORG_SITE_ID)},
        )

        assert resp.status_code == 404


# ── 5. Site validation for alerts overview endpoint ──────────────────────


class TestSiteFilterAlertsOverview:
    """GET /api/v1/admin/organizations/{org}/alerts?site_id=..."""

    async def test_valid_site_id_filters_alerts(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Valid site_id filters alerts in the overview endpoint."""
        alerts = [_make_coverage_alert()]

        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(VALID_SITE_ID),
            _scalar_one_result(1),
            _scalars_all_result(alerts),
        ]

        resp = await admin_client.get(
            f"{PREFIX}/alerts",
            params={"site_id": str(VALID_SITE_ID)},
        )

        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1

    async def test_invalid_site_returns_404(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Site not in org returns 404 for alerts overview."""
        mock_session.execute.side_effect = [
            _scalar_one_or_none_result(None),
        ]

        resp = await admin_client.get(
            f"{PREFIX}/alerts",
            params={"site_id": str(OTHER_ORG_SITE_ID)},
        )

        assert resp.status_code == 404


# ── 6. Validate site_id utility function directly ────────────────────────


class TestValidateSiteBelongsToOrg:
    """Direct tests for _validate_site_belongs_to_org."""

    async def test_valid_site_returns_uuid(self) -> None:
        """Valid site_id returns parsed UUID."""
        from app.routers.admin_operational import _validate_site_belongs_to_org

        session = AsyncMock()
        session.execute.return_value = _scalar_one_or_none_result(VALID_SITE_ID)

        result = await _validate_site_belongs_to_org(
            session, TARGET_ORG_ID, str(VALID_SITE_ID)
        )

        assert result == VALID_SITE_ID

    async def test_invalid_uuid_raises_not_found(self) -> None:
        """Non-UUID string raises NotFoundError."""
        from app.core.exceptions import NotFoundError
        from app.routers.admin_operational import _validate_site_belongs_to_org

        session = AsyncMock()

        with pytest.raises(NotFoundError):
            await _validate_site_belongs_to_org(session, TARGET_ORG_ID, "not-a-uuid")

    async def test_site_not_in_org_raises_not_found(self) -> None:
        """Site UUID not belonging to org raises NotFoundError."""
        from app.core.exceptions import NotFoundError
        from app.routers.admin_operational import _validate_site_belongs_to_org

        session = AsyncMock()
        session.execute.return_value = _scalar_one_or_none_result(None)

        with pytest.raises(NotFoundError):
            await _validate_site_belongs_to_org(
                session, TARGET_ORG_ID, str(OTHER_ORG_SITE_ID)
            )
