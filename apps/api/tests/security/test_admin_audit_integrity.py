"""Security tests: audit integrity — every admin endpoint creates an audit log entry.

Verifies that ALL admin backoffice endpoints call log_admin_action with the
correct parameters:
- Correct AdminAuditAction enum value
- admin_user_id sourced from JWT (not body)
- target_org_id from path param where applicable
- Appropriate severity (INFO by default, WARNING for status changes, CRITICAL
  for destructive operations)

Strategy:
- Patch log_admin_action to capture call arguments.
- Patch the underlying service functions to return mock data (so we don't need
  a real DB).
- Call each endpoint with super_admin credentials and verify the audit call.

Threat model:
- Endpoint forgot to call log_admin_action → untracked admin action.
- Endpoint passes wrong action enum → misleading audit trail.
- Endpoint uses wrong severity → critical actions logged as INFO.
- admin_user_id not from JWT → spoofed audit identity.
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
from app.main import app
from app.models.admin import AdminAuditAction, OnboardingStatus
from app.models.organization import (
    IndustrySector,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.models.user import UserRole, UserStatus

# ── Fixed identifiers ────────────────────────────────────────────────
_SA_USER_ID = "aaaaaaaa-1111-1111-1111-000000000001"
_TARGET_ORG_ID = uuid.UUID("dddddddd-2222-2222-2222-222222222222")
_USER_ID = uuid.UUID("ffffffff-4444-4444-4444-444444444444")
_ONBOARDING_ID = uuid.UUID("eeeeeeee-3333-3333-3333-333333333333")
_DATASET_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
_RESOURCE_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")


def _sa_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=_SA_USER_ID,
        email="sa@test.com",
        organization_id=str(_TARGET_ORG_ID),
        role="super_admin",
    )


# ── Mock data factories ──────────────────────────────────────────────


def _mock_org(**overrides):
    """Mock Organization ORM-like object for model_validate."""
    defaults = {
        "id": _TARGET_ORG_ID,
        "name": "Test Corp",
        "slug": "test-corp",
        "status": OrganizationStatus.ACTIVE,
        "plan": SubscriptionPlan.STARTER,
        "sector": IndustrySector.LOGISTICS,
        "size": OrganizationSize.MEDIUM,
        "headcount": 42,
        "contact_email": "admin@test.com",
        "legal_name": None,
        "siret": None,
        "logo_url": None,
        "timezone": "Europe/Paris",
        "locale": "fr-FR",
        "currency": "EUR",
        "settings": {},
        "user_count": 5,
        "site_count": 2,
        "department_count": 4,
        "dataset_count": 1,
        "created_at": datetime(2024, 1, 1, tzinfo=UTC),
        "updated_at": datetime(2024, 1, 1, tzinfo=UTC),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _mock_user(**overrides):
    """Mock User ORM-like object."""
    defaults = {
        "id": _USER_ID,
        "email": "user@test.com",
        "organization_id": _TARGET_ORG_ID,
        "role": UserRole.VIEWER,
        "status": UserStatus.ACTIVE,
        "full_name": "Test User",
        "last_login_at": None,
        "created_at": datetime(2024, 1, 1, tzinfo=UTC),
        "updated_at": datetime(2024, 1, 1, tzinfo=UTC),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _mock_plan_history(**overrides):
    """Mock PlanChangeHistory ORM-like object."""
    defaults = {
        "id": _RESOURCE_ID,
        "organization_id": _TARGET_ORG_ID,
        "changed_by": uuid.UUID(_SA_USER_ID),
        "old_plan": SubscriptionPlan.STARTER,
        "new_plan": SubscriptionPlan.PROFESSIONAL,
        "reason": "Upgrade request",
        "effective_at": datetime(2024, 6, 1, tzinfo=UTC),
        "created_at": datetime(2024, 6, 1, tzinfo=UTC),
        "updated_at": datetime(2024, 6, 1, tzinfo=UTC),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _mock_onboarding(**overrides):
    """Mock OnboardingState ORM-like object."""
    defaults = {
        "id": _ONBOARDING_ID,
        "organization_id": _TARGET_ORG_ID,
        "initiated_by": uuid.UUID(_SA_USER_ID),
        "status": OnboardingStatus.IN_PROGRESS,
        "current_step": 1,
        "steps_completed": [],
        "completed_at": None,
        "created_at": datetime(2024, 1, 1, tzinfo=UTC),
        "updated_at": datetime(2024, 1, 1, tzinfo=UTC),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _mock_dashboard_summary():
    """Mock DashboardSummaryResponse-like object."""
    return SimpleNamespace(
        coverage_human=92.5,
        coverage_merchandise=88.1,
        active_alerts_count=3,
        forecast_accuracy=95.0,
        last_forecast_date="2024-06-01",
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

    # For paginated endpoints that do session.execute(count_query)
    mock_count_result = MagicMock()
    mock_count_result.scalar_one.return_value = 0

    mock_items_result = MagicMock()
    mock_items_result.scalars.return_value.all.return_value = []

    session.execute = AsyncMock(side_effect=[mock_count_result, mock_items_result])
    return session


@pytest.fixture
async def admin_client(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client authenticated as super_admin with mocked DB."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = _sa_jwt

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── Organization endpoints ────────────────────────────────────────────


class TestOrgEndpointsAudit:
    """Verify audit log entries for organization management endpoints."""

    async def test_list_orgs_audits_view_org(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /organizations logs VIEW_ORG action."""
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
            resp = await admin_client.get("/api/v1/admin/organizations")

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_ORG
        assert call_kwargs["admin_user_id"] == _SA_USER_ID

    async def test_create_org_audits_create_org(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """POST /organizations logs CREATE_ORG action."""
        mock_org = _mock_org()
        with (
            patch(
                "app.routers.admin_orgs.create_organization",
                new_callable=AsyncMock,
                return_value=mock_org,
            ),
            patch(
                "app.routers.admin_orgs.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.post(
                "/api/v1/admin/organizations",
                json={
                    "name": "Test Corp",
                    "slug": "test-corp",
                    "contact_email": "admin@test.com",
                },
            )

        assert resp.status_code == 201
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.CREATE_ORG
        assert call_kwargs["admin_user_id"] == _SA_USER_ID
        assert call_kwargs["resource_type"] == "Organization"

    async def test_get_org_detail_audits_view_org(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /organizations/{org_id} logs VIEW_ORG action."""
        mock_org = _mock_org()
        with (
            patch(
                "app.routers.admin_orgs.get_organization",
                new_callable=AsyncMock,
                return_value=mock_org,
            ),
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
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_ORG
        assert call_kwargs["target_org_id"] == str(_TARGET_ORG_ID)

    async def test_update_org_audits_update_org(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """PATCH /organizations/{org_id} logs UPDATE_ORG with field list."""
        mock_org = _mock_org(name="Updated Name")
        with (
            patch(
                "app.routers.admin_orgs.update_organization",
                new_callable=AsyncMock,
                return_value=mock_org,
            ),
            patch(
                "app.routers.admin_orgs.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.patch(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}",
                json={"name": "Updated Name"},
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.UPDATE_ORG
        assert call_kwargs["target_org_id"] == str(_TARGET_ORG_ID)
        # Verify metadata includes updated fields
        assert "fields" in call_kwargs["metadata"]
        assert "name" in call_kwargs["metadata"]["fields"]

    async def test_suspend_org_audits_with_warning_severity(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """POST /organizations/{org_id}/suspend logs SUSPEND_ORG with WARNING."""
        mock_org = _mock_org(status=OrganizationStatus.SUSPENDED)
        with (
            patch(
                "app.routers.admin_orgs.change_org_status",
                new_callable=AsyncMock,
                return_value=mock_org,
            ),
            patch(
                "app.routers.admin_orgs.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.post(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/suspend"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.SUSPEND_ORG
        assert call_kwargs["severity"] == "WARNING"
        assert call_kwargs["target_org_id"] == str(_TARGET_ORG_ID)

    async def test_reactivate_org_audits_reactivate(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """POST /organizations/{org_id}/reactivate logs REACTIVATE_ORG."""
        mock_org = _mock_org()
        with (
            patch(
                "app.routers.admin_orgs.change_org_status",
                new_callable=AsyncMock,
                return_value=mock_org,
            ),
            patch(
                "app.routers.admin_orgs.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.post(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/reactivate"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.REACTIVATE_ORG

    async def test_churn_org_audits_with_critical_severity(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """POST /organizations/{org_id}/churn logs CHURN_ORG with CRITICAL."""
        mock_org = _mock_org(status=OrganizationStatus.CHURNED)
        with (
            patch(
                "app.routers.admin_orgs.change_org_status",
                new_callable=AsyncMock,
                return_value=mock_org,
            ),
            patch(
                "app.routers.admin_orgs.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.post(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/churn"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.CHURN_ORG
        assert call_kwargs["severity"] == "CRITICAL"

    async def test_get_hierarchy_audits_view_org(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /organizations/{org_id}/hierarchy logs VIEW_ORG."""
        with (
            patch(
                "app.routers.admin_orgs.get_org_hierarchy",
                new_callable=AsyncMock,
                return_value=[],
            ),
            patch(
                "app.routers.admin_orgs.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/hierarchy"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_ORG


# ── User endpoints ────────────────────────────────────────────────────


class TestUserEndpointsAudit:
    """Verify audit log entries for user management endpoints."""

    async def test_list_users_audits_view_users(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /organizations/{org_id}/users logs VIEW_USERS."""
        with (
            patch(
                "app.routers.admin_users.list_org_users",
                new_callable=AsyncMock,
                return_value=([], 0),
            ),
            patch(
                "app.routers.admin_users.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/users"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_USERS
        assert call_kwargs["target_org_id"] == str(_TARGET_ORG_ID)

    async def test_invite_user_audits_invite_user(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """POST /organizations/{org_id}/users/invite logs INVITE_USER."""
        mock_user = _mock_user(
            status=UserStatus.PENDING,
        )
        with (
            patch(
                "app.routers.admin_users.invite_user",
                new_callable=AsyncMock,
                return_value=mock_user,
            ),
            patch(
                "app.routers.admin_users.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.post(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/users/invite",
                json={"email": "new@test.com", "role": "viewer"},
            )

        assert resp.status_code == 201
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.INVITE_USER
        assert call_kwargs["target_org_id"] == str(_TARGET_ORG_ID)
        assert call_kwargs["admin_user_id"] == _SA_USER_ID
        assert call_kwargs["metadata"]["email"] == "new@test.com"
        assert call_kwargs["metadata"]["role"] == "viewer"

    async def test_change_role_audits_change_role(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """PATCH /organizations/{org_id}/users/{user_id}/role logs CHANGE_ROLE."""
        mock_user = _mock_user(role=UserRole.MANAGER)
        with (
            patch(
                "app.routers.admin_users.change_user_role",
                new_callable=AsyncMock,
                return_value=mock_user,
            ),
            patch(
                "app.routers.admin_users.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.patch(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/users/{_USER_ID}/role",
                json={"role": "manager"},
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.CHANGE_ROLE
        assert call_kwargs["metadata"]["new_role"] == "manager"

    async def test_deactivate_user_audits_with_warning(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """POST /organizations/{org_id}/users/{user_id}/deactivate logs WARNING."""
        mock_user = _mock_user(status=UserStatus.INACTIVE)
        with (
            patch(
                "app.routers.admin_users.deactivate_user",
                new_callable=AsyncMock,
                return_value=mock_user,
            ),
            patch(
                "app.routers.admin_users.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.post(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}"
                f"/users/{_USER_ID}/deactivate",
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.DEACTIVATE_USER
        assert call_kwargs["severity"] == "WARNING"

    async def test_reactivate_user_audits_reactivate(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """POST /organizations/{org_id}/users/{user_id}/reactivate logs action."""
        mock_user = _mock_user()
        with (
            patch(
                "app.routers.admin_users.reactivate_user",
                new_callable=AsyncMock,
                return_value=mock_user,
            ),
            patch(
                "app.routers.admin_users.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.post(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}"
                f"/users/{_USER_ID}/reactivate",
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.REACTIVATE_USER


# ── Billing endpoints ─────────────────────────────────────────────────


class TestBillingEndpointsAudit:
    """Verify audit log entries for billing endpoints."""

    async def test_get_billing_audits_change_plan_view(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /billing/organizations/{org_id} logs CHANGE_PLAN with view flag."""
        with (
            patch(
                "app.routers.admin_billing.get_billing_info",
                new_callable=AsyncMock,
                return_value={
                    "organization_id": _TARGET_ORG_ID,
                    "plan": SubscriptionPlan.STARTER,
                    "limits": {},
                    "usage": {},
                },
            ),
            patch(
                "app.routers.admin_billing.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/billing/organizations/{_TARGET_ORG_ID}"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.CHANGE_PLAN
        assert call_kwargs["metadata"]["view"] is True

    async def test_change_plan_audits_with_warning(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """POST /billing/organizations/{org_id}/change-plan logs WARNING."""
        mock_history = _mock_plan_history()
        with (
            patch(
                "app.routers.admin_billing.change_plan",
                new_callable=AsyncMock,
                return_value=mock_history,
            ),
            patch(
                "app.routers.admin_billing.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.post(
                f"/api/v1/admin/billing/organizations/{_TARGET_ORG_ID}/change-plan",
                json={"new_plan": "professional", "reason": "Upgrade"},
            )

        assert resp.status_code == 201
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.CHANGE_PLAN
        assert call_kwargs["severity"] == "WARNING"
        assert call_kwargs["admin_user_id"] == _SA_USER_ID
        # Verify old_plan and new_plan in metadata
        assert "old_plan" in call_kwargs["metadata"]
        assert "new_plan" in call_kwargs["metadata"]

    async def test_plan_history_audits_change_plan_view(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /billing/organizations/{org_id}/history logs CHANGE_PLAN view."""
        with (
            patch(
                "app.routers.admin_billing.get_plan_history",
                new_callable=AsyncMock,
                return_value=([], 0),
            ),
            patch(
                "app.routers.admin_billing.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/billing/organizations/{_TARGET_ORG_ID}/history"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.CHANGE_PLAN
        assert call_kwargs["metadata"]["view"] is True


# ── Monitoring endpoints ──────────────────────────────────────────────


class TestMonitoringEndpointsAudit:
    """Verify audit log entries for monitoring endpoints."""

    async def test_platform_kpis_audits_view_monitoring(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /monitoring/platform logs VIEW_MONITORING."""
        with (
            patch(
                "app.routers.admin_monitoring.get_platform_kpis",
                new_callable=AsyncMock,
                return_value={
                    "total_organizations": 10,
                    "active_organizations": 8,
                    "total_users": 100,
                    "total_datasets": 50,
                    "total_forecasts": 200,
                    "total_decisions": 15,
                },
            ),
            patch(
                "app.routers.admin_monitoring.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get("/api/v1/admin/monitoring/platform")

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_MONITORING
        assert call_kwargs["admin_user_id"] == _SA_USER_ID

    async def test_usage_trends_audits_with_period_metadata(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /monitoring/trends logs VIEW_MONITORING with period metadata."""
        with (
            patch(
                "app.routers.admin_monitoring.get_usage_trends",
                new_callable=AsyncMock,
                return_value=[],
            ),
            patch(
                "app.routers.admin_monitoring.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                "/api/v1/admin/monitoring/trends?period=weekly&days=30"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_MONITORING
        assert call_kwargs["metadata"]["period"] == "weekly"
        assert call_kwargs["metadata"]["days"] == 30

    async def test_error_metrics_audits_view_monitoring(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /monitoring/errors logs VIEW_MONITORING."""
        with (
            patch(
                "app.routers.admin_monitoring.get_error_metrics",
                new_callable=AsyncMock,
                return_value={
                    "ingestion_success_rate": 0.98,
                    "ingestion_error_count": 5,
                    "api_error_rate": 0.02,
                },
            ),
            patch(
                "app.routers.admin_monitoring.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get("/api/v1/admin/monitoring/errors")

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        assert mock_audit.call_args.kwargs["action"] == AdminAuditAction.VIEW_MONITORING

    async def test_org_metrics_audits_with_target_org(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /monitoring/organizations/{org_id} logs with target_org_id."""
        with (
            patch(
                "app.routers.admin_monitoring.get_org_metrics",
                new_callable=AsyncMock,
                return_value={
                    "active_users": 10,
                    "total_datasets": 5,
                    "forecast_runs": 20,
                    "decisions_count": 3,
                    "last_activity": None,
                },
            ),
            patch(
                "app.routers.admin_monitoring.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/monitoring/organizations/{_TARGET_ORG_ID}"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_MONITORING
        assert call_kwargs["target_org_id"] == str(_TARGET_ORG_ID)

    async def test_org_mirror_audits_view_mirror(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /monitoring/organizations/{org_id}/mirror logs VIEW_MIRROR."""
        with (
            patch(
                "app.routers.admin_monitoring.get_org_mirror",
                new_callable=AsyncMock,
                return_value=_mock_dashboard_summary(),
            ),
            patch(
                "app.routers.admin_monitoring.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/monitoring/organizations/{_TARGET_ORG_ID}/mirror"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_MIRROR
        assert call_kwargs["target_org_id"] == str(_TARGET_ORG_ID)


# ── Data endpoints ────────────────────────────────────────────────────


class TestDataEndpointsAudit:
    """Verify audit log entries for data access endpoints."""

    async def test_list_datasets_audits_view_datasets(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /organizations/{org_id}/datasets logs VIEW_DATASETS."""
        # Reset session.execute side_effect for paginated queries
        mock_count = MagicMock()
        mock_count.scalar_one.return_value = 0
        mock_items = MagicMock()
        mock_items.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(side_effect=[mock_count, mock_items])

        with patch(
            "app.routers.admin_data.log_admin_action",
            new_callable=AsyncMock,
        ) as mock_audit:
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/datasets"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_DATASETS
        assert call_kwargs["target_org_id"] == str(_TARGET_ORG_ID)

    async def test_ingestion_log_audits_view_data(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /organizations/{org_id}/ingestion-log logs VIEW_DATA."""
        mock_count = MagicMock()
        mock_count.scalar_one.return_value = 0
        mock_items = MagicMock()
        mock_items.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(side_effect=[mock_count, mock_items])

        with patch(
            "app.routers.admin_data.log_admin_action",
            new_callable=AsyncMock,
        ) as mock_audit:
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/ingestion-log"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_DATA
        assert call_kwargs["resource_type"] == "IngestionLog"

    async def test_list_forecasts_audits_view_data(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /organizations/{org_id}/forecasts logs VIEW_DATA."""
        with (
            patch(
                "app.routers.admin_data.list_forecasts",
                new_callable=AsyncMock,
                return_value=([], 0),
            ),
            patch(
                "app.routers.admin_data.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/forecasts"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_DATA
        assert call_kwargs["resource_type"] == "ForecastRun"

    async def test_list_decisions_audits_view_data(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /organizations/{org_id}/decisions logs VIEW_DATA."""
        with (
            patch(
                "app.routers.admin_data.list_decisions",
                new_callable=AsyncMock,
                return_value=([], 0),
            ),
            patch(
                "app.routers.admin_data.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/decisions"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_DATA
        assert call_kwargs["resource_type"] == "Decision"

    async def test_list_absences_audits_view_data(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /organizations/{org_id}/absences logs VIEW_DATA."""
        mock_count = MagicMock()
        mock_count.scalar_one.return_value = 0
        mock_items = MagicMock()
        mock_items.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(side_effect=[mock_count, mock_items])

        with patch(
            "app.routers.admin_data.log_admin_action",
            new_callable=AsyncMock,
        ) as mock_audit:
            resp = await admin_client.get(
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/absences"
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.VIEW_DATA
        assert call_kwargs["resource_type"] == "Absence"


# ── Onboarding endpoints ─────────────────────────────────────────────


class TestOnboardingEndpointsAudit:
    """Verify audit log entries for onboarding endpoints."""

    async def test_create_onboarding_audits_onboarding_step(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """POST /onboarding logs ONBOARDING_STEP with step=1 metadata."""
        mock_ob = _mock_onboarding()
        with (
            patch(
                "app.routers.admin_onboarding.create_onboarding",
                new_callable=AsyncMock,
                return_value=mock_ob,
            ),
            patch(
                "app.routers.admin_onboarding.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.post(
                "/api/v1/admin/onboarding",
                json={
                    "org_name": "New Org",
                    "org_slug": "new-org",
                    "contact_email": "contact@neworg.com",
                },
            )

        assert resp.status_code == 201
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.ONBOARDING_STEP
        assert call_kwargs["metadata"]["step"] == 1
        assert call_kwargs["metadata"]["action"] == "created"

    async def test_list_onboardings_audits_onboarding_step(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /onboarding logs ONBOARDING_STEP."""
        with (
            patch(
                "app.routers.admin_onboarding.list_onboardings",
                new_callable=AsyncMock,
                return_value=([], 0),
            ),
            patch(
                "app.routers.admin_onboarding.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get("/api/v1/admin/onboarding")

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        assert mock_audit.call_args.kwargs["action"] == AdminAuditAction.ONBOARDING_STEP

    async def test_get_onboarding_audits_with_target_org(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /onboarding/{id} logs with target_org_id from onboarding."""
        mock_ob = _mock_onboarding()
        with (
            patch(
                "app.routers.admin_onboarding.get_onboarding",
                new_callable=AsyncMock,
                return_value=mock_ob,
            ),
            patch(
                "app.routers.admin_onboarding.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.get(f"/api/v1/admin/onboarding/{_ONBOARDING_ID}")

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.ONBOARDING_STEP
        assert call_kwargs["target_org_id"] == str(_TARGET_ORG_ID)

    async def test_complete_step_audits_with_step_number(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """PATCH /onboarding/{id}/step/{step} logs with step metadata."""
        mock_ob = _mock_onboarding(current_step=2)
        with (
            patch(
                "app.routers.admin_onboarding.complete_step",
                new_callable=AsyncMock,
                return_value=mock_ob,
            ),
            patch(
                "app.routers.admin_onboarding.log_admin_action",
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            resp = await admin_client.patch(
                f"/api/v1/admin/onboarding/{_ONBOARDING_ID}/step/1",
                json={"data": {"step_1": True}},
            )

        assert resp.status_code == 200
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"] == AdminAuditAction.ONBOARDING_STEP
        assert call_kwargs["metadata"]["step"] == 1


# ── Audit log endpoint (self-exemption) ───────────────────────────────


class TestAuditLogSelfExemption:
    """The audit-log listing endpoint must NOT audit itself (infinite recursion)."""

    async def test_audit_log_does_not_call_log_admin_action(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
    ) -> None:
        """GET /admin/audit-log does not create its own audit entry.

        The endpoint in main.py only imports get_audit_log (read-only),
        NOT log_admin_action (write). We verify that the read function
        is called and that session.add is never invoked (no audit entry).
        """
        with patch(
            "app.main.get_audit_log",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_query:
            resp = await admin_client.get("/api/v1/admin/audit-log")

        assert resp.status_code == 200
        # get_audit_log (the read function) was called
        mock_query.assert_awaited_once()
        # session.add was NOT called (no audit entry created)
        # log_admin_action does session.add + session.flush — neither was called
        mock_session.add.assert_not_called()
        mock_session.flush.assert_not_awaited()


# ── Cross-cutting: JWT user_id is always used ─────────────────────────


class TestAuditAlwaysUsesJWTUserId:
    """Every endpoint passes the JWT user_id, not body/path values."""

    @pytest.mark.parametrize(
        ("patch_target", "patch_return", "method", "path", "body"),
        [
            (
                "app.routers.admin_orgs.create_organization",
                "_mock_org",
                "POST",
                "/api/v1/admin/organizations",
                {"name": "X", "slug": "x", "contact_email": "x@x.com"},
            ),
            (
                "app.routers.admin_users.invite_user",
                "_mock_user",
                "POST",
                f"/api/v1/admin/organizations/{_TARGET_ORG_ID}/users/invite",
                {"email": "y@y.com", "role": "viewer"},
            ),
        ],
        ids=["create_org", "invite_user"],
    )
    async def test_audit_user_id_from_jwt_not_body(
        self,
        admin_client: AsyncClient,
        mock_session: AsyncMock,
        patch_target: str,
        patch_return: str,
        method: str,
        path: str,
        body: dict,
    ) -> None:
        """Audit admin_user_id matches JWT, not request body."""
        # Resolve mock factory by name
        factories = {"_mock_org": _mock_org, "_mock_user": _mock_user}
        mock_data = factories[patch_return]()

        # Determine the audit module path from the router
        router_module = patch_target.rsplit(".", 1)[0]
        audit_path = f"{router_module}.log_admin_action"

        with (
            patch(
                patch_target,
                new_callable=AsyncMock,
                return_value=mock_data,
            ),
            patch(
                audit_path,
                new_callable=AsyncMock,
            ) as mock_audit,
        ):
            if method == "POST":
                resp = await admin_client.post(path, json=body)
            else:
                resp = await admin_client.get(path)

        assert resp.status_code in {200, 201}
        mock_audit.assert_awaited_once()
        # The critical check: admin_user_id comes from the JWT fixture
        assert mock_audit.call_args.kwargs["admin_user_id"] == _SA_USER_ID
