"""Security tests: cross-tenant access control for admin endpoints.

Verifies:
1. Super admin CAN access any organization's data (cross-tenant).
2. Non-admin roles CANNOT use admin endpoints to access other orgs (403).
3. Admin cross-org access does not leak into regular user sessions.

Strategy:
- Use two fake organizations (ORG_A, ORG_B).
- Super admin belongs to ORG_A but accesses ORG_B data via admin endpoints.
- Non-admin user from ORG_A cannot access admin endpoints for ORG_B.
- Patch service functions to capture the org_id/TenantFilter argument,
  verifying it matches the requested org, not the admin's own org.

Threat model:
- Confused deputy: admin's JWT org_id leaks into cross-org queries.
- Role bypass: non-admin user accesses admin cross-org endpoints.
- Session bleed: previous admin access contaminates later regular queries.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.core.security import TenantFilter
from app.main import app
from app.models.organization import (
    IndustrySector,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.models.user import UserRole, UserStatus

# ── Fixed identifiers ────────────────────────────────────────────────
ORG_A_ID = uuid.UUID("aaaaaaaa-0001-0001-0001-000000000001")
ORG_B_ID = uuid.UUID("bbbbbbbb-0002-0002-0002-000000000002")
SA_USER_ID = "cccccccc-0003-0003-0003-000000000003"
NON_ADMIN_USER_ID = "dddddddd-0004-0004-0004-000000000004"
USER_IN_ORG_B = uuid.UUID("eeeeeeee-0005-0005-0005-000000000005")


def _sa_jwt() -> JWTPayload:
    """Super admin JWT — belongs to ORG_A."""
    return JWTPayload(
        user_id=SA_USER_ID,
        email="sa@test.com",
        organization_id=str(ORG_A_ID),
        role="super_admin",
    )


def _non_admin_jwt(role: str = "org_admin") -> JWTPayload:
    """Non-admin JWT — belongs to ORG_A."""
    return JWTPayload(
        user_id=NON_ADMIN_USER_ID,
        email="nonadmin@test.com",
        organization_id=str(ORG_A_ID),
        role=role,
    )


def _mock_org(org_id: uuid.UUID, name: str):
    """Mock Organization object."""
    return SimpleNamespace(
        id=org_id,
        name=name,
        slug=name.lower().replace(" ", "-"),
        status=OrganizationStatus.ACTIVE,
        plan=SubscriptionPlan.STARTER,
        sector=IndustrySector.LOGISTICS,
        size=OrganizationSize.MEDIUM,
        headcount=42,
        contact_email=f"admin@{name.lower()}.com",
        legal_name=None,
        siret=None,
        logo_url=None,
        timezone="Europe/Paris",
        locale="fr-FR",
        currency="EUR",
        settings={},
        user_count=5,
        site_count=2,
        department_count=4,
        dataset_count=1,
        created_at=datetime(2024, 1, 1, tzinfo=UTC),
        updated_at=datetime(2024, 1, 1, tzinfo=UTC),
    )


def _mock_user(org_id: uuid.UUID, user_id: uuid.UUID = USER_IN_ORG_B):
    """Mock User object."""
    return SimpleNamespace(
        id=user_id,
        email="user@orgb.com",
        organization_id=org_id,
        role=UserRole.VIEWER,
        status=UserStatus.ACTIVE,
        full_name="User B",
        last_login_at=None,
        created_at=datetime(2024, 1, 1, tzinfo=UTC),
        updated_at=datetime(2024, 1, 1, tzinfo=UTC),
    )


# ── Fixtures ──────────────────────────────────────────────────────────


@pytest.fixture
def mock_session() -> AsyncMock:
    """Mock async DB session."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    session.add = MagicMock()

    mock_count_result = MagicMock()
    mock_count_result.scalar_one.return_value = 0
    mock_items_result = MagicMock()
    mock_items_result.scalars.return_value.all.return_value = []
    session.execute = AsyncMock(side_effect=[mock_count_result, mock_items_result])
    return session


@pytest.fixture
async def sa_client(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """Super admin client (belongs to ORG_A)."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = _sa_jwt

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


def _make_non_admin_client(role: str):
    """Factory for non-admin client fixtures."""

    @pytest.fixture
    async def _client(
        mock_session: AsyncMock,
    ) -> AsyncGenerator[AsyncClient, None]:
        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: _non_admin_jwt(role)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
        app.dependency_overrides.clear()

    return _client


org_admin_client = _make_non_admin_client("org_admin")
hr_manager_client = _make_non_admin_client("hr_manager")
viewer_client = _make_non_admin_client("viewer")


# ── 1. Super admin cross-org data access ──────────────────────────────


class TestSuperAdminCrossOrgAccess:
    """Super admin (ORG_A) can access ORG_B data via admin endpoints."""

    async def test_admin_can_read_other_org_detail(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Admin from ORG_A can GET /organizations/{ORG_B}."""
        mock_org_b = _mock_org(ORG_B_ID, "Org B")
        with (
            patch(
                "app.routers.admin_orgs.get_organization",
                new_callable=AsyncMock,
                return_value=mock_org_b,
            ) as mock_svc,
            patch(
                "app.routers.admin_orgs.get_org_counts",
                new_callable=AsyncMock,
                return_value={
                    "users_count": 5,
                    "sites_count": 2,
                    "departments_count": 4,
                    "datasets_count": 1,
                    "forecast_runs_count": 0,
                },
            ),
            patch(
                "app.routers.admin_orgs.get_org_hierarchy",
                new_callable=AsyncMock,
                return_value=[],
            ),
            patch(
                "app.routers.admin_orgs.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await sa_client.get(f"/api/v1/admin/organizations/{ORG_B_ID}")

        assert resp.status_code == 200
        # Service was called with ORG_B's ID, not ORG_A's
        mock_svc.assert_awaited_once()
        assert mock_svc.call_args[0][1] == ORG_B_ID

    async def test_admin_can_list_other_org_users(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Admin from ORG_A can list ORG_B's users."""
        with (
            patch(
                "app.routers.admin_users.list_org_users",
                new_callable=AsyncMock,
                return_value=([], 0),
            ) as mock_svc,
            patch(
                "app.routers.admin_users.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await sa_client.get(f"/api/v1/admin/organizations/{ORG_B_ID}/users")

        assert resp.status_code == 200
        # Verify org_id passed to service is ORG_B
        call_args = mock_svc.call_args
        assert call_args[0][1] == ORG_B_ID

    async def test_admin_can_invite_user_to_other_org(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Admin from ORG_A can invite a user to ORG_B."""
        mock_user = _mock_user(ORG_B_ID)
        mock_user.status = UserStatus.PENDING
        with (
            patch(
                "app.routers.admin_users.invite_user",
                new_callable=AsyncMock,
                return_value=mock_user,
            ) as mock_svc,
            patch(
                "app.routers.admin_users.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await sa_client.post(
                f"/api/v1/admin/organizations/{ORG_B_ID}/users/invite",
                json={"email": "new@orgb.com", "role": "viewer"},
            )

        assert resp.status_code == 201
        call_kwargs = mock_svc.call_args.kwargs
        assert call_kwargs["org_id"] == ORG_B_ID

    async def test_admin_can_change_other_org_user_role(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Admin from ORG_A can change a user's role in ORG_B."""
        mock_user = _mock_user(ORG_B_ID)
        mock_user.role = UserRole.MANAGER
        with (
            patch(
                "app.routers.admin_users.change_user_role",
                new_callable=AsyncMock,
                return_value=mock_user,
            ) as mock_svc,
            patch(
                "app.routers.admin_users.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await sa_client.patch(
                f"/api/v1/admin/organizations/{ORG_B_ID}/users/{USER_IN_ORG_B}/role",
                json={"role": "manager"},
            )

        assert resp.status_code == 200
        call_kwargs = mock_svc.call_args.kwargs
        assert call_kwargs["org_id"] == ORG_B_ID

    async def test_admin_can_suspend_other_org(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Admin from ORG_A can suspend ORG_B."""
        mock_org_b = _mock_org(ORG_B_ID, "Org B")
        mock_org_b.status = OrganizationStatus.SUSPENDED
        with (
            patch(
                "app.routers.admin_orgs.change_org_status",
                new_callable=AsyncMock,
                return_value=mock_org_b,
            ) as mock_svc,
            patch(
                "app.routers.admin_orgs.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await sa_client.post(
                f"/api/v1/admin/organizations/{ORG_B_ID}/suspend"
            )

        assert resp.status_code == 200
        # Verify the correct org was targeted
        assert mock_svc.call_args[0][1] == ORG_B_ID

    async def test_admin_can_view_other_org_billing(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Admin from ORG_A can view ORG_B's billing."""
        with (
            patch(
                "app.routers.admin_billing.get_billing_info",
                new_callable=AsyncMock,
                return_value={
                    "organization_id": ORG_B_ID,
                    "plan": SubscriptionPlan.PROFESSIONAL,
                    "limits": {},
                    "usage": {},
                },
            ),
            patch(
                "app.routers.admin_billing.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await sa_client.get(
                f"/api/v1/admin/billing/organizations/{ORG_B_ID}"
            )

        assert resp.status_code == 200
        # The plan in the response is ORG_B's plan, not ORG_A's
        assert resp.json()["data"]["plan"] == "professional"

    async def test_admin_can_view_other_org_forecasts(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Admin from ORG_A can list ORG_B's forecasts."""
        with (
            patch(
                "app.routers.admin_data.list_forecasts",
                new_callable=AsyncMock,
                return_value=([], 0),
            ) as mock_svc,
            patch(
                "app.routers.admin_data.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await sa_client.get(
                f"/api/v1/admin/organizations/{ORG_B_ID}/forecasts"
            )

        assert resp.status_code == 200
        # The TenantFilter passed to list_forecasts uses ORG_B
        tenant_arg = mock_svc.call_args[0][0]
        assert isinstance(tenant_arg, TenantFilter)
        assert tenant_arg.organization_id == str(ORG_B_ID)

    async def test_admin_can_view_other_org_decisions(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Admin from ORG_A can list ORG_B's decisions."""
        with (
            patch(
                "app.routers.admin_data.list_decisions",
                new_callable=AsyncMock,
                return_value=([], 0),
            ) as mock_svc,
            patch(
                "app.routers.admin_data.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            resp = await sa_client.get(
                f"/api/v1/admin/organizations/{ORG_B_ID}/decisions"
            )

        assert resp.status_code == 200
        tenant_arg = mock_svc.call_args[0][0]
        assert isinstance(tenant_arg, TenantFilter)
        assert tenant_arg.organization_id == str(ORG_B_ID)

    async def test_admin_can_view_other_org_datasets(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Admin from ORG_A can list ORG_B's datasets via direct DB query."""
        # The datasets endpoint uses direct SQLAlchemy queries (not a service)
        mock_count = MagicMock()
        mock_count.scalar_one.return_value = 0
        mock_items = MagicMock()
        mock_items.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(side_effect=[mock_count, mock_items])

        with patch(
            "app.routers.admin_data.log_admin_action",
            new_callable=AsyncMock,
        ):
            resp = await sa_client.get(
                f"/api/v1/admin/organizations/{ORG_B_ID}/datasets"
            )

        assert resp.status_code == 200

    async def test_admin_cross_org_audit_records_target_org(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Cross-org access audit entry records target org, not admin's org."""
        with (
            patch(
                "app.routers.admin_orgs.list_organizations",
                new_callable=AsyncMock,
                return_value=([], 0),
            ),
            patch(
                "app.routers.admin_orgs.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            await sa_client.get("/api/v1/admin/organizations")

        mock_audit.assert_awaited_once()
        # The admin's own ORG_A should NOT appear as target
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["admin_user_id"] == SA_USER_ID
        # target_org_id is None for list-all (no specific org)
        assert call_kwargs.get("target_org_id") is None


# ── 2. Non-admin cannot use admin endpoints for cross-org access ──────


class TestNonAdminBlockedFromCrossOrg:
    """Non-admin users cannot use admin endpoints, even for their own org."""

    @pytest.mark.parametrize(
        ("method", "path", "body"),
        [
            ("GET", f"/api/v1/admin/organizations/{ORG_B_ID}", None),
            ("GET", f"/api/v1/admin/organizations/{ORG_B_ID}/users", None),
            (
                "POST",
                f"/api/v1/admin/organizations/{ORG_B_ID}/users/invite",
                {"email": "x@x.com", "role": "viewer"},
            ),
            ("POST", f"/api/v1/admin/organizations/{ORG_B_ID}/suspend", None),
            (
                "GET",
                f"/api/v1/admin/billing/organizations/{ORG_B_ID}",
                None,
            ),
            (
                "GET",
                f"/api/v1/admin/monitoring/organizations/{ORG_B_ID}",
                None,
            ),
            ("GET", f"/api/v1/admin/organizations/{ORG_B_ID}/datasets", None),
            ("GET", f"/api/v1/admin/organizations/{ORG_B_ID}/forecasts", None),
        ],
        ids=[
            "get_org",
            "list_users",
            "invite_user",
            "suspend_org",
            "get_billing",
            "monitoring_org",
            "list_datasets",
            "list_forecasts",
        ],
    )
    async def test_org_admin_blocked_from_other_org_admin_endpoint(
        self,
        org_admin_client: AsyncClient,
        method: str,
        path: str,
        body: dict | None,
    ) -> None:
        """org_admin of ORG_A cannot access ORG_B via admin endpoints."""
        if method == "GET":
            resp = await org_admin_client.get(path)
        elif method == "POST":
            resp = (
                await org_admin_client.post(path, json=body)
                if body
                else await org_admin_client.post(path)
            )
        else:
            resp = await org_admin_client.patch(path, json=body)

        assert resp.status_code == 403

    @pytest.mark.parametrize(
        ("method", "path"),
        [
            ("GET", f"/api/v1/admin/organizations/{ORG_A_ID}"),
            ("GET", f"/api/v1/admin/organizations/{ORG_A_ID}/users"),
            ("GET", f"/api/v1/admin/billing/organizations/{ORG_A_ID}"),
        ],
        ids=["own_org_detail", "own_org_users", "own_org_billing"],
    )
    async def test_org_admin_blocked_even_for_own_org(
        self,
        org_admin_client: AsyncClient,
        method: str,
        path: str,
    ) -> None:
        """org_admin cannot use admin endpoints even for their own org (ORG_A)."""
        resp = await org_admin_client.get(path)
        assert resp.status_code == 403

    @pytest.mark.parametrize("role", ["hr_manager", "manager", "employee", "viewer"])
    async def test_lower_roles_blocked_from_admin_cross_org(
        self,
        mock_session: AsyncMock,
        role: str,
    ) -> None:
        """Roles below org_admin also cannot access admin cross-org endpoints."""

        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: _non_admin_jwt(role)

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                resp = await client.get(f"/api/v1/admin/organizations/{ORG_B_ID}")

            assert resp.status_code == 403
        finally:
            app.dependency_overrides.clear()


# ── 3. Admin TenantFilter uses path org_id, not JWT org_id ───────────


class TestAdminTenantFilterIsolation:
    """Admin's TenantFilter is created from path param, not JWT org_id.

    This is critical: _admin_tenant(org_id) creates TenantFilter(str(org_id))
    where org_id comes from the URL path. The admin's JWT org_id is irrelevant
    for these queries.
    """

    async def test_forecasts_tenant_uses_path_not_jwt(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """TenantFilter for forecasts uses ORG_B from path, not ORG_A from JWT."""
        with (
            patch(
                "app.routers.admin_data.list_forecasts",
                new_callable=AsyncMock,
                return_value=([], 0),
            ) as mock_svc,
            patch(
                "app.routers.admin_data.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            await sa_client.get(f"/api/v1/admin/organizations/{ORG_B_ID}/forecasts")

        tenant = mock_svc.call_args[0][0]
        assert isinstance(tenant, TenantFilter)
        # Must be ORG_B (from path), NOT ORG_A (from JWT)
        assert tenant.organization_id == str(ORG_B_ID)
        assert tenant.organization_id != str(ORG_A_ID)

    async def test_decisions_tenant_uses_path_not_jwt(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """TenantFilter for decisions uses ORG_B from path, not ORG_A from JWT."""
        with (
            patch(
                "app.routers.admin_data.list_decisions",
                new_callable=AsyncMock,
                return_value=([], 0),
            ) as mock_svc,
            patch(
                "app.routers.admin_data.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            await sa_client.get(f"/api/v1/admin/organizations/{ORG_B_ID}/decisions")

        tenant = mock_svc.call_args[0][0]
        assert tenant.organization_id == str(ORG_B_ID)

    async def test_consecutive_cross_org_calls_use_different_tenants(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Consecutive admin calls to different orgs get distinct TenantFilters."""
        captured_tenants = []

        async def mock_list_forecasts(tenant, session, **kwargs):
            captured_tenants.append(tenant.organization_id)
            return ([], 0)

        with (
            patch(
                "app.routers.admin_data.list_forecasts",
                side_effect=mock_list_forecasts,
            ),
            patch(
                "app.routers.admin_data.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            # First call: ORG_A
            await sa_client.get(f"/api/v1/admin/organizations/{ORG_A_ID}/forecasts")
            # Second call: ORG_B
            await sa_client.get(f"/api/v1/admin/organizations/{ORG_B_ID}/forecasts")

        assert len(captured_tenants) == 2
        assert captured_tenants[0] == str(ORG_A_ID)
        assert captured_tenants[1] == str(ORG_B_ID)

    async def test_admin_cross_org_does_not_mutate_shared_state(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """Accessing ORG_B doesn't affect a subsequent ORG_A access."""
        captured_orgs = []

        async def mock_get_billing(session, org_id):
            captured_orgs.append(str(org_id))
            return {
                "organization_id": org_id,
                "plan": SubscriptionPlan.STARTER,
                "limits": {},
                "usage": {},
            }

        with (
            patch(
                "app.routers.admin_billing.get_billing_info",
                side_effect=mock_get_billing,
            ),
            patch(
                "app.routers.admin_billing.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            # Access ORG_B first
            resp_b = await sa_client.get(
                f"/api/v1/admin/billing/organizations/{ORG_B_ID}"
            )
            # Then access ORG_A
            resp_a = await sa_client.get(
                f"/api/v1/admin/billing/organizations/{ORG_A_ID}"
            )

        assert resp_b.status_code == 200
        assert resp_a.status_code == 200
        # Each call received its own org_id
        assert captured_orgs == [str(ORG_B_ID), str(ORG_A_ID)]


# ── 4. Admin cannot escalate from admin endpoint to regular endpoint ──


class TestAdminDoesNotBypassRegularTenantIsolation:
    """Admin cross-org access via admin endpoints does NOT grant access
    to the same org via regular (non-admin) endpoints.

    Regular endpoints derive TenantFilter from the JWT's organization_id,
    not from the path. Even a super_admin's regular endpoints should only
    return their own org's data.
    """

    async def test_regular_dashboard_only_sees_jwt_org(
        self,
        sa_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """After admin access to ORG_B, /dashboard/summary still scopes to ORG_A."""
        # First, do an admin cross-org access to ORG_B
        with (
            patch(
                "app.routers.admin_data.list_forecasts",
                new_callable=AsyncMock,
                return_value=([], 0),
            ),
            patch(
                "app.routers.admin_data.log_admin_action",
                new_callable=AsyncMock,
            ),
        ):
            await sa_client.get(f"/api/v1/admin/organizations/{ORG_B_ID}/forecasts")

        # Now call the regular dashboard endpoint
        # The dashboard uses get_dashboard_summary(tenant=..., session=...)
        with patch(
            "app.routers.dashboard.get_dashboard_summary",
            new_callable=AsyncMock,
        ) as mock_dashboard:
            mock_dashboard.return_value = SimpleNamespace(
                coverage_human=90.0,
                coverage_merchandise=85.0,
                active_alerts_count=2,
                forecast_accuracy=95.0,
                last_forecast_date="2024-06-01",
            )
            resp = await sa_client.get("/api/v1/dashboard/summary")

        assert resp.status_code == 200
        # The dashboard service is called with tenant kwarg
        tenant_arg = mock_dashboard.call_args.kwargs["tenant"]
        assert isinstance(tenant_arg, TenantFilter)
        # Must use JWT's ORG_A, NOT the previously accessed ORG_B
        assert tenant_arg.organization_id == str(ORG_A_ID)
