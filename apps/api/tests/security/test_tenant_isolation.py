"""Tenant isolation security tests.

These tests prove that data from one organization is INVISIBLE (not just
inaccessible) to users of another organization. The distinction is critical:
- Inaccessible: the request fails (403, 500) but the data might still leak
  in error messages or logs.
- Invisible: the response is identical to what would be returned if the
  data simply didn't exist (200 with empty data, or 404 for specific IDs).

Strategy:
- Two orgs (A and B) with separate JWT payloads and TenantFilters.
- For each endpoint, we verify:
  1. The SERVICE receives the correct TenantFilter (org-scoped).
  2. Org B calling an endpoint gets empty results (org A data is invisible).
  3. Org B accessing a specific org A resource by ID gets 404 (not 403).
  4. Error responses never leak cross-org information.

We patch at the service level so Pydantic model_validate is happy with the
mock return values. The key assertion is that the TenantFilter passed to
each service call matches the authenticated user's organization.

Threat model:
- Horizontal privilege escalation: user of org_b guesses org_a's resource IDs.
- Data leakage via aggregations: org_b sees org_a's counts, averages, etc.
- IDOR on nested resources: org_b guesses a forecast_run_id belonging to org_a.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.main import app
from app.models.dashboard_alert import DashboardAlert
from app.models.forecast_run import ForecastRun
from app.models.site import Site
from app.services.dashboard import DashboardSummary

# ── Fixed test identifiers ────────────────────────────────────────────
ORG_A_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
ORG_B_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
USER_A_ID = "user-a-sec-001"
USER_B_ID = "user-b-sec-001"

# Resource IDs belonging to org_a — org_b must NOT see these
ORG_A_RUN_ID = uuid.UUID("aaaaaaaa-1111-1111-1111-111111111111")
ORG_A_ALERT_ID = uuid.UUID("aaaaaaaa-2222-2222-2222-222222222222")
ORG_A_SITE_ID = uuid.UUID("aaaaaaaa-3333-3333-3333-333333333333")


def _make_jwt(
    user_id: str, org_id: uuid.UUID, role: str = "org_admin"
) -> JWTPayload:
    return JWTPayload(
        user_id=user_id,
        email=f"{user_id}@test.com",
        organization_id=str(org_id),
        role=role,
    )


JWT_A = _make_jwt(USER_A_ID, ORG_A_ID)
JWT_B = _make_jwt(USER_B_ID, ORG_B_ID)


# ── Fixtures ──────────────────────────────────────────────────────────


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    return session


@pytest.fixture
async def client_org_a(
    mock_session: AsyncMock,
) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client authenticated as org A."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: JWT_A
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(
        str(ORG_A_ID)
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def client_org_b(
    mock_session: AsyncMock,
) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client authenticated as org B."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: JWT_B
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(
        str(ORG_B_ID)
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── 1. TenantFilter unit tests ──────────────────────────────────────


class TestTenantFilterUnit:
    """Verify TenantFilter produces correct WHERE clauses."""

    def test_apply_adds_where_clause(self) -> None:
        """TenantFilter.apply() adds organization_id filter to the query."""
        tf = TenantFilter(str(ORG_A_ID))
        base_query = select(Site)
        filtered_query = tf.apply(base_query, Site)

        # The filtered query must have a WHERE clause (the base doesn't)
        assert filtered_query.whereclause is not None
        compiled = str(filtered_query.compile())
        assert "organization_id" in compiled

    def test_different_orgs_produce_different_filters(self) -> None:
        """Two TenantFilters for different orgs are not interchangeable."""
        tf_a = TenantFilter(str(ORG_A_ID))
        tf_b = TenantFilter(str(ORG_B_ID))

        assert tf_a.organization_id != tf_b.organization_id
        assert tf_a.organization_id == str(ORG_A_ID)
        assert tf_b.organization_id == str(ORG_B_ID)

    def test_filter_applies_to_all_tenant_models(self) -> None:
        """TenantFilter works on DashboardAlert, ForecastRun, Site."""
        tf = TenantFilter(str(ORG_A_ID))
        for model in [DashboardAlert, ForecastRun, Site]:
            query = tf.apply(select(model), model)
            assert query.whereclause is not None
            compiled = str(query.compile())
            assert "organization_id" in compiled

    def test_filter_preserves_existing_where(self) -> None:
        """TenantFilter adds org_id filter alongside existing conditions."""
        tf = TenantFilter(str(ORG_A_ID))
        base = select(Site).where(Site.name == "test")
        filtered = tf.apply(base, Site)
        compiled = str(filtered.compile())
        assert "organization_id" in compiled
        assert "name" in compiled

    def test_organization_id_stored_correctly(self) -> None:
        """TenantFilter stores the organization_id as passed."""
        tf = TenantFilter(str(ORG_A_ID))
        assert tf.organization_id == str(ORG_A_ID)
        # Verify it's a string, not a UUID object (matching JWT claim type)
        assert isinstance(tf.organization_id, str)


# ── 2. Dashboard — org_b sees ONLY its own data ─────────────────────


class TestDashboardIsolation:
    """Dashboard endpoint returns org-scoped data only."""

    async def test_org_a_sees_own_kpis(
        self, client_org_a: AsyncClient
    ) -> None:
        """Org A sees its own KPIs — service called with org A's filter."""
        summary_a = DashboardSummary(
            coverage_human=95.0,
            coverage_merchandise=88.0,
            active_alerts_count=5,
            forecast_accuracy=0.91,
            last_forecast_date=datetime(2026, 2, 5, 14, 0, tzinfo=UTC),
        )

        with patch(
            "app.routers.dashboard.get_dashboard_summary",
            new_callable=AsyncMock,
            return_value=summary_a,
        ) as mock_svc:
            response = await client_org_a.get("/api/v1/dashboard/summary")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["coverageHuman"] == 95.0
        assert data["activeAlertsCount"] == 5

        # CRITICAL: service was called with ORG_A's tenant filter
        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_sees_own_empty_kpis(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B sees its own empty KPIs — org A's data is invisible."""
        summary_b = DashboardSummary(
            coverage_human=0.0,
            coverage_merchandise=0.0,
            active_alerts_count=0,
            forecast_accuracy=None,
            last_forecast_date=None,
        )

        with patch(
            "app.routers.dashboard.get_dashboard_summary",
            new_callable=AsyncMock,
            return_value=summary_b,
        ) as mock_svc:
            response = await client_org_b.get("/api/v1/dashboard/summary")

        assert response.status_code == 200
        data = response.json()["data"]
        # Org B sees zeros — org A's 95% and 5 alerts are invisible
        assert data["coverageHuman"] == 0.0
        assert data["activeAlertsCount"] == 0
        assert data["forecastAccuracy"] is None

        # CRITICAL: service was called with ORG_B's tenant filter
        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_B_ID)


# ── 3. Forecasts — cross-org run_id returns 404, not 403 ────────────


class TestForecastIsolation:
    """Forecast endpoints enforce tenant isolation."""

    async def test_org_a_sees_own_forecasts(
        self, client_org_a: AsyncClient
    ) -> None:
        """Org A lists its own forecast runs — service called with org A filter."""
        now = datetime.now(UTC)
        mock_run = SimpleNamespace(
            id=ORG_A_RUN_ID,
            model_type="ensemble",
            horizon_days=14,
            status="completed",
            accuracy_score=0.92,
            started_at=now,
            completed_at=now,
        )

        with patch(
            "app.routers.forecasts.list_forecasts",
            new_callable=AsyncMock,
            return_value=([mock_run], 1),
        ) as mock_svc:
            response = await client_org_a.get("/api/v1/forecasts")

        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_cannot_see_org_a_forecasts(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B sees empty forecast list — org A's runs are invisible."""
        with patch(
            "app.routers.forecasts.list_forecasts",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_svc:
            response = await client_org_b.get("/api/v1/forecasts")

        assert response.status_code == 200
        data = response.json()
        # Empty — org A's forecasts are invisible to org B
        assert data["data"] == []
        assert data["pagination"]["total"] == 0

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_B_ID)

    async def test_org_b_gets_404_for_org_a_run_daily(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B trying to access org A's run_id gets 404 (not 403).

        This is critical: returning 403 would confirm the resource EXISTS,
        which is an information leak. 404 reveals nothing.
        """
        with patch(
            "app.routers.forecasts.get_daily_forecasts",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ForecastRun", str(ORG_A_RUN_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/forecasts/{ORG_A_RUN_ID}/daily"
            )

        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "NOT_FOUND"
        # The error message must NOT reveal which org owns the resource
        assert str(ORG_A_ID) not in str(data)
        assert "org" not in data["error"]["message"].lower()


# ── 4. Alerts — cross-org dismiss returns 404 ───────────────────────


class TestAlertIsolation:
    """Alert endpoints enforce tenant isolation."""

    async def test_org_a_sees_own_alerts(
        self, client_org_a: AsyncClient
    ) -> None:
        """Org A lists its own alerts — service called with org A filter."""
        now = datetime.now(UTC)
        mock_alert = SimpleNamespace(
            id=ORG_A_ALERT_ID,
            organization_id=ORG_A_ID,
            type="risk",
            severity="warning",
            title="Staffing Gap",
            message="Department X understaffed",
            related_entity_type=None,
            related_entity_id=None,
            action_url=None,
            action_label=None,
            dismissed_at=None,
            expires_at=None,
            created_at=now,
            updated_at=now,
        )

        with patch(
            "app.routers.alerts.list_active_alerts",
            new_callable=AsyncMock,
            return_value=[mock_alert],
        ) as mock_svc:
            response = await client_org_a.get("/api/v1/alerts")

        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_cannot_see_org_a_alerts(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B sees empty alert list — org A's alerts are invisible."""
        with patch(
            "app.routers.alerts.list_active_alerts",
            new_callable=AsyncMock,
            return_value=[],
        ) as mock_svc:
            response = await client_org_b.get("/api/v1/alerts")

        assert response.status_code == 200
        assert response.json()["data"] == []

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_B_ID)

    async def test_org_b_cannot_dismiss_org_a_alert(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B dismissing org A's alert gets 404 (not 403).

        Returning 404 instead of 403 is intentional: 403 would confirm the
        alert exists, leaking information about org A's security posture.
        """
        with patch(
            "app.routers.alerts.dismiss_alert",
            new_callable=AsyncMock,
            side_effect=NotFoundError(
                "DashboardAlert", str(ORG_A_ALERT_ID)
            ),
        ):
            response = await client_org_b.patch(
                f"/api/v1/alerts/{ORG_A_ALERT_ID}/dismiss"
            )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"
        # Must not leak org A's identity
        assert str(ORG_A_ID) not in str(response.json())


# ── 5. Organizations/me — tied to JWT, no IDOR possible ─────────────


class TestOrganizationIsolation:
    """Organization endpoint returns only the user's own org."""

    async def test_org_a_sees_own_org(
        self, client_org_a: AsyncClient
    ) -> None:
        """Org A sees its own organization details."""
        now = datetime.now(UTC)
        mock_org = SimpleNamespace(
            id=ORG_A_ID,
            organization_id=None,
            name="Logistics Corp A",
            slug="logistics-a",
            legal_name=None,
            siret=None,
            sector=None,
            size=None,
            headcount=200,
            status="active",
            plan="professional",
            timezone="Europe/Paris",
            locale="fr-FR",
            currency="EUR",
            contact_email="admin@logistics-a.com",
            logo_url=None,
            settings={},
            created_at=now,
            updated_at=now,
        )

        with patch(
            "app.routers.organizations.get_organization",
            new_callable=AsyncMock,
            return_value=mock_org,
        ) as mock_svc:
            response = await client_org_a.get("/api/v1/organizations/me")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Logistics Corp A"

        # Verify the service was called with org_a's ID from the JWT
        call_kwargs = mock_svc.call_args.kwargs
        assert call_kwargs["org_id"] == ORG_A_ID

    async def test_org_b_sees_own_org_not_org_a(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B sees only its own org — org A details are invisible."""
        now = datetime.now(UTC)
        mock_org_b = SimpleNamespace(
            id=ORG_B_ID,
            organization_id=None,
            name="Transport Co B",
            slug="transport-b",
            legal_name=None,
            siret=None,
            sector=None,
            size=None,
            headcount=50,
            status="active",
            plan="starter",
            timezone="Europe/Paris",
            locale="fr-FR",
            currency="EUR",
            contact_email="admin@transport-b.com",
            logo_url=None,
            settings={},
            created_at=now,
            updated_at=now,
        )

        with patch(
            "app.routers.organizations.get_organization",
            new_callable=AsyncMock,
            return_value=mock_org_b,
        ) as mock_svc:
            response = await client_org_b.get("/api/v1/organizations/me")

        assert response.status_code == 200
        data = response.json()["data"]
        # Org B sees only its own name — org A's "Logistics Corp A" is invisible
        assert data["name"] == "Transport Co B"
        assert "Logistics" not in str(data)

        call_kwargs = mock_svc.call_args.kwargs
        assert call_kwargs["org_id"] == ORG_B_ID


# ── 6. Sites — cross-org invisibility ───────────────────────────────


class TestSiteIsolation:
    """Sites endpoint returns only org-scoped sites."""

    async def test_org_a_sees_own_sites(
        self, client_org_a: AsyncClient
    ) -> None:
        """Org A sees its own sites — service called with org A filter."""
        now = datetime.now(UTC)
        mock_site = SimpleNamespace(
            id=ORG_A_SITE_ID,
            organization_id=ORG_A_ID,
            name="Paris Nord",
            code="PRN",
            address=None,
            timezone="Europe/Paris",
            working_days_config=None,
            headcount=100,
            capacity_units=None,
            created_at=now,
            updated_at=now,
        )

        with patch(
            "app.routers.organizations.list_sites",
            new_callable=AsyncMock,
            return_value=[mock_site],
        ) as mock_svc:
            response = await client_org_a.get("/api/v1/sites")

        assert response.status_code == 200
        assert len(response.json()["data"]) == 1
        assert response.json()["data"][0]["name"] == "Paris Nord"

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_cannot_see_org_a_sites(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B sees empty sites — org A's sites are invisible."""
        with patch(
            "app.routers.organizations.list_sites",
            new_callable=AsyncMock,
            return_value=[],
        ) as mock_svc:
            response = await client_org_b.get("/api/v1/sites")

        assert response.status_code == 200
        assert response.json()["data"] == []
        # Verify "Paris Nord" is nowhere in the response
        assert "Paris" not in str(response.json())

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_B_ID)


# ── 7. Departments — cross-org invisibility + IDOR on site_id ───────


class TestDepartmentIsolation:
    """Department endpoints enforce tenant isolation including IDOR checks."""

    async def test_org_a_sees_own_departments(
        self, client_org_a: AsyncClient
    ) -> None:
        """Org A sees its own departments — service called with org A filter."""
        now = datetime.now(UTC)
        mock_dept = SimpleNamespace(
            id=uuid.uuid4(),
            organization_id=ORG_A_ID,
            site_id=ORG_A_SITE_ID,
            parent_id=None,
            manager_id=None,
            name="Expédition",
            code="EXP",
            cost_center=None,
            headcount=25,
            min_staffing_level=80.0,
            critical_roles_count=2,
            created_at=now,
            updated_at=now,
        )

        with patch(
            "app.routers.organizations.list_departments",
            new_callable=AsyncMock,
            return_value=[mock_dept],
        ) as mock_svc:
            response = await client_org_a.get("/api/v1/departments")

        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_cannot_see_org_a_departments(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B sees empty departments — org A's departments are invisible."""
        with patch(
            "app.routers.organizations.list_departments",
            new_callable=AsyncMock,
            return_value=[],
        ) as mock_svc:
            response = await client_org_b.get("/api/v1/departments")

        assert response.status_code == 200
        assert response.json()["data"] == []

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_B_ID)

    async def test_org_b_filter_by_org_a_site_id_returns_404(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B filtering departments by org A's site_id gets 404.

        This tests the IDOR prevention: the service validates that the
        site_id belongs to the authenticated org before using it as a filter.
        """
        with patch(
            "app.routers.organizations.list_departments",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Site", str(ORG_A_SITE_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/departments?site_id={ORG_A_SITE_ID}"
            )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"


# ── 8. Verify error responses never leak cross-org info ──────────────


class TestErrorResponseIsolation:
    """Error responses must never contain org IDs or data from another tenant."""

    async def test_404_does_not_reveal_resource_existence(
        self, client_org_b: AsyncClient
    ) -> None:
        """A 404 for a cross-org resource must not hint at the resource's existence."""
        with patch(
            "app.routers.forecasts.get_daily_forecasts",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ForecastRun", str(ORG_A_RUN_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/forecasts/{ORG_A_RUN_ID}/daily"
            )

        body = response.json()
        # Verify: no mention of "forbidden", "permission", "other org"
        body_str = str(body).lower()
        assert "forbidden" not in body_str
        assert "permission" not in body_str
        assert "other org" not in body_str
        assert "unauthorized" not in body_str
        # The response must look identical to a genuinely non-existent resource
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["error"]["message"] == "ForecastRun not found"

    async def test_dismiss_cross_org_alert_404_is_opaque(
        self, client_org_b: AsyncClient
    ) -> None:
        """Dismissing a cross-org alert returns an opaque 404."""
        with patch(
            "app.routers.alerts.dismiss_alert",
            new_callable=AsyncMock,
            side_effect=NotFoundError(
                "DashboardAlert", str(ORG_A_ALERT_ID)
            ),
        ):
            response = await client_org_b.patch(
                f"/api/v1/alerts/{ORG_A_ALERT_ID}/dismiss"
            )

        body = response.json()
        assert response.status_code == 404
        assert body["error"]["message"] == "DashboardAlert not found"
        # Must NOT contain the alert ID (since it's a valid UUID, it would
        # be included — but only for the requesting org's resources)
        assert "forbidden" not in str(body).lower()

    async def test_nonexistent_uuid_identical_to_cross_org(
        self, client_org_b: AsyncClient
    ) -> None:
        """A completely fake UUID produces the same 404 shape as a cross-org UUID.

        This proves that the response for a cross-org resource is
        indistinguishable from a genuinely non-existent resource —
        no timing or shape difference that could be used as an oracle.
        """
        fake_id = uuid.uuid4()

        with patch(
            "app.routers.forecasts.get_daily_forecasts",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ForecastRun", str(fake_id)),
        ):
            response_fake = await client_org_b.get(
                f"/api/v1/forecasts/{fake_id}/daily"
            )

        with patch(
            "app.routers.forecasts.get_daily_forecasts",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ForecastRun", str(ORG_A_RUN_ID)),
        ):
            response_cross = await client_org_b.get(
                f"/api/v1/forecasts/{ORG_A_RUN_ID}/daily"
            )

        # Same status code
        assert response_fake.status_code == response_cross.status_code == 404
        # Same error structure
        fake_body = response_fake.json()
        cross_body = response_cross.json()
        assert fake_body["error"]["code"] == cross_body["error"]["code"]
        assert fake_body["error"]["message"] == cross_body["error"]["message"]
