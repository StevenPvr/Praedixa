"""Security tests: admin endpoints reject non-super_admin roles.

Tests HTTP-level auth enforcement on ALL admin endpoints:
- 401 for unauthenticated requests (no/invalid token)
- 403 for authenticated users without super_admin role
- 200/201 for super_admin (positive case, service mocked)

Strategy:
- Use FastAPI dependency_overrides for auth simulation.
- Patch service-level functions to avoid real side effects.
- Test the EXISTING RGPD erasure endpoints (routers/admin.py) first.
- New admin endpoints (#6-#11) will be added as they are implemented.

Threat model:
- Privilege escalation: org_admin tries to access admin endpoints.
- Missing auth: endpoint forgot to add Depends(require_role).
- Role bypass: middleware or dependency chain is broken.
"""

import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.main import app
from app.services.rgpd_erasure import (
    ErasureRequest,
    ErasureStatus,
)

# ── Fixed test identifiers ────────────────────────────────────────────
SUPER_ADMIN_USER_ID = "sa-auth-001"
SUPER_ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
NON_ADMIN_USER_ID = "na-auth-001"
NON_ADMIN_ORG_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")

# A valid erasure request for positive-case tests
ERASURE_REQUEST_ID = uuid.UUID("cccccccc-1111-1111-1111-111111111111")
TARGET_ORG_ID = uuid.UUID("dddddddd-2222-2222-2222-222222222222")

# All existing admin endpoints (RGPD erasure) with their HTTP methods
_RGPD_ADMIN_ENDPOINTS = [
    (
        "POST",
        "/api/v1/admin/erasure/initiate",
        {
            "organization_id": str(TARGET_ORG_ID),
            "org_slug": "test-org",
        },
    ),
    ("POST", f"/api/v1/admin/erasure/{ERASURE_REQUEST_ID}/approve", None),
    ("POST", f"/api/v1/admin/erasure/{ERASURE_REQUEST_ID}/execute", None),
    ("GET", f"/api/v1/admin/erasure/{ERASURE_REQUEST_ID}/verify", None),
    ("GET", f"/api/v1/admin/erasure/{ERASURE_REQUEST_ID}", None),
]

# Placeholder UUIDs for path parameters
_ONBOARDING_ID = uuid.UUID("eeeeeeee-3333-3333-3333-333333333333")
_USER_ID = uuid.UUID("ffffffff-4444-4444-4444-444444444444")

# New backoffice admin endpoints (Sprint 4)
_BACKOFFICE_ADMIN_ENDPOINTS = [
    # Organizations
    ("GET", "/api/v1/admin/organizations", None, "list_orgs"),
    (
        "POST",
        "/api/v1/admin/organizations",
        {
            "name": "Test Corp",
            "slug": "test-corp",
            "contact_email": "admin@test.com",
        },
        "create_org",
    ),
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}", None, "get_org"),
    (
        "PATCH",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}",
        {
            "name": "Updated Name",
        },
        "update_org",
    ),
    (
        "POST",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/suspend",
        None,
        "suspend_org",
    ),
    (
        "POST",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/reactivate",
        None,
        "reactivate_org",
    ),
    ("POST", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/churn", None, "churn_org"),
    (
        "GET",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/hierarchy",
        None,
        "get_hierarchy",
    ),
    # Users
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/users", None, "list_users"),
    (
        "POST",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/users/invite",
        {
            "email": "new@test.com",
            "role": "viewer",
        },
        "invite_user",
    ),
    (
        "PATCH",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/users/{_USER_ID}/role",
        {
            "role": "manager",
        },
        "change_role",
    ),
    (
        "POST",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/users/{_USER_ID}/deactivate",
        None,
        "deactivate_user",
    ),
    (
        "POST",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/users/{_USER_ID}/reactivate",
        None,
        "reactivate_user",
    ),
    # Billing
    (
        "GET",
        f"/api/v1/admin/billing/organizations/{TARGET_ORG_ID}",
        None,
        "get_billing",
    ),
    (
        "POST",
        f"/api/v1/admin/billing/organizations/{TARGET_ORG_ID}/change-plan",
        {
            "new_plan": "professional",
            "reason": "Upgrade request",
        },
        "change_plan",
    ),
    (
        "GET",
        f"/api/v1/admin/billing/organizations/{TARGET_ORG_ID}/history",
        None,
        "plan_history",
    ),
    # Monitoring
    ("GET", "/api/v1/admin/monitoring/platform", None, "monitoring_platform"),
    ("GET", "/api/v1/admin/monitoring/trends", None, "monitoring_trends"),
    ("GET", "/api/v1/admin/monitoring/errors", None, "monitoring_errors"),
    (
        "GET",
        f"/api/v1/admin/monitoring/organizations/{TARGET_ORG_ID}",
        None,
        "monitoring_org",
    ),
    (
        "GET",
        f"/api/v1/admin/monitoring/organizations/{TARGET_ORG_ID}/mirror",
        None,
        "monitoring_mirror",
    ),
    # Data
    (
        "GET",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/datasets",
        None,
        "list_datasets",
    ),
    (
        "GET",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/ingestion-log",
        None,
        "ingestion_log",
    ),
    (
        "GET",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/forecasts",
        None,
        "list_forecasts",
    ),
    (
        "GET",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/decisions",
        None,
        "list_decisions",
    ),
    (
        "GET",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/absences",
        None,
        "list_absences",
    ),
    (
        "GET",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/datasets/{ERASURE_REQUEST_ID}/data",
        None,
        "dataset_data",
    ),
    (
        "GET",
        f"/api/v1/admin/organizations/{TARGET_ORG_ID}/datasets/{ERASURE_REQUEST_ID}/features",
        None,
        "dataset_features",
    ),
    # Onboarding
    (
        "POST",
        "/api/v1/admin/onboarding",
        {
            "org_name": "New Org",
            "org_slug": "new-org",
            "contact_email": "contact@neworg.com",
        },
        "create_onboarding",
    ),
    ("GET", "/api/v1/admin/onboarding", None, "list_onboarding"),
    ("GET", f"/api/v1/admin/onboarding/{_ONBOARDING_ID}", None, "get_onboarding"),
    (
        "PATCH",
        f"/api/v1/admin/onboarding/{_ONBOARDING_ID}/step/1",
        {
            "data": {"step_1": True},
        },
        "update_step",
    ),
    # Audit log
    ("GET", "/api/v1/admin/audit-log", None, "audit_log"),
]

# Roles that should be REJECTED (403) on admin endpoints
_NON_ADMIN_ROLES = ["org_admin", "hr_manager", "manager", "employee", "viewer"]


def _make_jwt(
    role: str = "super_admin",
    user_id: str = SUPER_ADMIN_USER_ID,
    org_id: uuid.UUID = SUPER_ADMIN_ORG_ID,
) -> JWTPayload:
    return JWTPayload(
        user_id=user_id,
        email=f"{user_id}@test.com",
        organization_id=str(org_id),
        role=role,
    )


def _mock_erasure_request(
    request_id: uuid.UUID = ERASURE_REQUEST_ID,
    status: ErasureStatus = ErasureStatus.PENDING_APPROVAL,
    initiated_by: str = "other-admin-001",
) -> ErasureRequest:
    """Create a mock ErasureRequest for positive-case tests."""
    from datetime import UTC, datetime

    return ErasureRequest(
        id=request_id,
        organization_id=TARGET_ORG_ID,
        org_slug="test-org",
        initiated_by=initiated_by,
        status=status,
        created_at=datetime.now(UTC),
        audit_log=["Test entry"],
    )


# ── Fixtures ──────────────────────────────────────────────────────────


@pytest.fixture
def mock_session() -> AsyncMock:
    """Mock AsyncSession for endpoints that require DB."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    return session


@pytest.fixture
async def super_admin_client(
    mock_session: AsyncMock,
) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client authenticated as super_admin."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: _make_jwt(role="super_admin")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def unauth_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with NO auth — tests 401 behavior."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def _make_role_client_fixture(role: str):
    """Factory for per-role client fixtures."""

    @pytest.fixture
    async def _client(
        mock_session: AsyncMock,
    ) -> AsyncGenerator[AsyncClient, None]:
        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: _make_jwt(
            role=role,
            user_id=NON_ADMIN_USER_ID,
            org_id=NON_ADMIN_ORG_ID,
        )
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
        app.dependency_overrides.clear()

    return _client


# Generate per-role fixtures dynamically
client_org_admin = _make_role_client_fixture("org_admin")
client_hr_manager = _make_role_client_fixture("hr_manager")
client_manager = _make_role_client_fixture("manager")
client_employee = _make_role_client_fixture("employee")
client_viewer = _make_role_client_fixture("viewer")


# ── Helper ────────────────────────────────────────────────────────────


async def _send_request(
    client: AsyncClient,
    method: str,
    path: str,
    body: dict | None = None,
) -> tuple[int, dict]:
    """Send a request and return (status_code, json_body)."""
    if method == "GET":
        resp = await client.get(path)
    elif method == "POST":
        if body:
            resp = await client.post(path, json=body)
        else:
            resp = await client.post(path)
    elif method == "PATCH":
        if body:
            resp = await client.patch(path, json=body)
        else:
            resp = await client.patch(path)
    else:
        msg = f"Unsupported method: {method}"
        raise ValueError(msg)

    return resp.status_code, resp.json()


# ── 1. Unauthenticated access → 401 ─────────────────────────────────


class TestUnauthenticatedAccess:
    """All admin endpoints must return 401 without a valid token."""

    @pytest.mark.parametrize(
        ("method", "path", "body"),
        _RGPD_ADMIN_ENDPOINTS,
        ids=[
            "initiate_erasure",
            "approve_erasure",
            "execute_erasure",
            "verify_erasure",
            "get_erasure_request",
        ],
    )
    async def test_unauthenticated_returns_401(
        self,
        unauth_client: AsyncClient,
        method: str,
        path: str,
        body: dict | None,
    ) -> None:
        """Admin endpoint returns 401 without auth header."""
        status_code, data = await _send_request(unauth_client, method, path, body)
        assert status_code == 401
        # Must not reveal which endpoint or resource was targeted
        assert "super_admin" not in str(data).lower()


# ── 2. Non-super_admin roles → 403 ──────────────────────────────────


class TestNonAdminRolesRejected:
    """Every admin endpoint must reject non-super_admin roles with 403."""

    @pytest.mark.parametrize("role", _NON_ADMIN_ROLES)
    @pytest.mark.parametrize(
        ("method", "path", "body"),
        _RGPD_ADMIN_ENDPOINTS,
        ids=[
            "initiate_erasure",
            "approve_erasure",
            "execute_erasure",
            "verify_erasure",
            "get_erasure_request",
        ],
    )
    async def test_non_admin_role_returns_403(
        self,
        mock_session: AsyncMock,
        role: str,
        method: str,
        path: str,
        body: dict | None,
    ) -> None:
        """User with role '{role}' gets 403 on admin endpoint."""

        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: _make_jwt(
            role=role,
            user_id=NON_ADMIN_USER_ID,
            org_id=NON_ADMIN_ORG_ID,
        )

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                status_code, data = await _send_request(client, method, path, body)

            assert status_code == 403, (
                f"Expected 403 for role={role} on {method} {path}, "
                f"got {status_code}: {data}"
            )
            # Error message should be generic — no role enumeration
            error_msg = data.get("error", {}).get("message", "")
            assert "insufficient permissions" in error_msg.lower()
            # Must NOT reveal the required role
            assert "super_admin" not in str(data)
        finally:
            app.dependency_overrides.clear()


# ── 3. 403 error shape consistency ───────────────────────────────────


class TestForbiddenResponseShape:
    """403 responses must have consistent shape across all endpoints."""

    async def test_403_shape_is_consistent(
        self,
        mock_session: AsyncMock,
    ) -> None:
        """All admin endpoints produce the same 403 error structure."""

        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: _make_jwt(
            role="org_admin",
            user_id=NON_ADMIN_USER_ID,
        )

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                responses = []
                for method, path, body in _RGPD_ADMIN_ENDPOINTS:
                    status_code, data = await _send_request(client, method, path, body)
                    responses.append((status_code, data))

            # All should be 403
            for i, (status_code, _data) in enumerate(responses):
                assert status_code == 403, f"Endpoint {i} returned {status_code}"

            # All error messages should be identical (no info leakage)
            messages = [r[1]["error"]["message"] for r in responses]
            assert len(set(messages)) == 1, f"Inconsistent 403 messages: {messages}"
        finally:
            app.dependency_overrides.clear()


# ── 4. Super_admin positive cases (service mocked) ───────────────────


class TestSuperAdminAccess:
    """Super admin can access RGPD erasure endpoints."""

    async def test_initiate_erasure_succeeds(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Super admin can initiate an erasure request."""
        mock_req = _mock_erasure_request()

        with patch(
            "app.routers.admin.initiate_erasure",
            new_callable=AsyncMock,
            return_value=mock_req,
        ):
            status_code, data = await _send_request(
                super_admin_client,
                "POST",
                "/api/v1/admin/erasure/initiate",
                {
                    "organization_id": str(TARGET_ORG_ID),
                    "org_slug": "test-org",
                },
            )

        assert status_code == 201
        assert data["success"] is True

    async def test_approve_erasure_succeeds(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Super admin can approve an erasure request."""
        mock_req = _mock_erasure_request(status=ErasureStatus.APPROVED)

        with patch(
            "app.routers.admin.approve_erasure",
            new_callable=AsyncMock,
            return_value=mock_req,
        ):
            status_code, data = await _send_request(
                super_admin_client,
                "POST",
                f"/api/v1/admin/erasure/{ERASURE_REQUEST_ID}/approve",
            )

        assert status_code == 200
        assert data["success"] is True

    async def test_get_erasure_request_succeeds(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Super admin can retrieve an erasure request."""
        mock_req = _mock_erasure_request()

        with patch(
            "app.routers.admin.get_erasure_request",
            return_value=mock_req,
        ):
            status_code, data = await _send_request(
                super_admin_client,
                "GET",
                f"/api/v1/admin/erasure/{ERASURE_REQUEST_ID}",
            )

        assert status_code == 200
        assert data["success"] is True
        assert data["data"]["status"] == "pending_approval"

    async def test_execute_erasure_succeeds(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Super admin can execute an approved erasure request."""
        mock_req = _mock_erasure_request(status=ErasureStatus.COMPLETED)

        with (
            patch(
                "app.routers.admin.execute_erasure",
                new_callable=AsyncMock,
                return_value=mock_req,
            ),
            patch(
                "app.routers.admin._get_key_provider",
            ),
        ):
            status_code, data = await _send_request(
                super_admin_client,
                "POST",
                f"/api/v1/admin/erasure/{ERASURE_REQUEST_ID}/execute",
            )

        assert status_code == 200
        assert data["success"] is True

    async def test_verify_erasure_succeeds(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Super admin can verify erasure completion."""
        mock_req = _mock_erasure_request(status=ErasureStatus.COMPLETED)

        with (
            patch(
                "app.routers.admin.get_erasure_request",
                return_value=mock_req,
            ),
            patch(
                "app.routers.admin.verify_erasure",
                new_callable=AsyncMock,
                return_value={"organizations": 0, "users": 0},
            ),
        ):
            status_code, data = await _send_request(
                super_admin_client,
                "GET",
                f"/api/v1/admin/erasure/{ERASURE_REQUEST_ID}/verify",
            )

        assert status_code == 200
        assert data["success"] is True
        # VerificationResponse uses BaseModel (not CamelModel) so keys are snake_case
        assert data["data"]["all_erased"] is True


# ── 5. Schema validation (extra=forbid) ─────────────────────────────


class TestSchemaHardening:
    """Request schemas reject unexpected fields (mass assignment prevention)."""

    async def test_initiate_erasure_rejects_extra_fields(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """InitiateErasureBody with extra fields returns 422."""
        status_code, data = await _send_request(
            super_admin_client,
            "POST",
            "/api/v1/admin/erasure/initiate",
            {
                "organization_id": str(TARGET_ORG_ID),
                "org_slug": "test-org",
                "status": "approved",  # INJECTED — should be rejected
            },
        )

        assert status_code == 422
        # Must mention the extra field in validation errors
        errors = data.get("error", {}).get("validationErrors", [])
        assert len(errors) > 0

    async def test_initiate_erasure_rejects_initiated_by_injection(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Cannot inject initiated_by via request body."""
        status_code, _data = await _send_request(
            super_admin_client,
            "POST",
            "/api/v1/admin/erasure/initiate",
            {
                "organization_id": str(TARGET_ORG_ID),
                "org_slug": "test-org",
                "initiated_by": "attacker-001",  # INJECTED
            },
        )

        assert status_code == 422

    async def test_initiate_erasure_rejects_approved_by_injection(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Cannot inject approved_by via request body."""
        status_code, _data = await _send_request(
            super_admin_client,
            "POST",
            "/api/v1/admin/erasure/initiate",
            {
                "organization_id": str(TARGET_ORG_ID),
                "org_slug": "test-org",
                "approved_by": "attacker-001",  # INJECTED
            },
        )

        assert status_code == 422

    async def test_initiate_erasure_validates_slug_pattern(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """org_slug with invalid characters returns 422."""
        status_code, _data = await _send_request(
            super_admin_client,
            "POST",
            "/api/v1/admin/erasure/initiate",
            {
                "organization_id": str(TARGET_ORG_ID),
                "org_slug": "'; DROP TABLE organizations;--",
            },
        )

        assert status_code == 422

    async def test_initiate_erasure_validates_org_id_format(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """organization_id that is not a UUID returns 422."""
        status_code, _data = await _send_request(
            super_admin_client,
            "POST",
            "/api/v1/admin/erasure/initiate",
            {
                "organization_id": "not-a-uuid",
                "org_slug": "test-org",
            },
        )

        assert status_code == 422


# ── 6. Path parameter validation ─────────────────────────────────────


class TestPathParamValidation:
    """Path parameters must be valid UUIDs — rejects injection attempts."""

    @pytest.mark.parametrize(
        "bad_id",
        [
            "not-a-uuid",
            "'; DROP TABLE admin_audit_log;--",
            "null",
        ],
        ids=["plain_text", "sql_injection", "null_string"],
    )
    async def test_approve_rejects_invalid_uuid(
        self,
        super_admin_client: AsyncClient,
        bad_id: str,
    ) -> None:
        """Approve endpoint rejects non-UUID request_id."""
        resp = await super_admin_client.post(f"/api/v1/admin/erasure/{bad_id}/approve")
        assert resp.status_code == 422

    @pytest.mark.parametrize(
        "bad_id",
        [
            "not-a-uuid",
            "'; DROP TABLE admin_audit_log;--",
        ],
        ids=["plain_text", "sql_injection"],
    )
    async def test_execute_rejects_invalid_uuid(
        self,
        super_admin_client: AsyncClient,
        bad_id: str,
    ) -> None:
        """Execute endpoint rejects non-UUID request_id."""
        resp = await super_admin_client.post(f"/api/v1/admin/erasure/{bad_id}/execute")
        assert resp.status_code == 422

    @pytest.mark.parametrize(
        "bad_id",
        [
            "not-a-uuid",
            "'; DROP TABLE admin_audit_log;--",
        ],
        ids=["plain_text", "sql_injection"],
    )
    async def test_verify_rejects_invalid_uuid(
        self,
        super_admin_client: AsyncClient,
        bad_id: str,
    ) -> None:
        """Verify endpoint rejects non-UUID request_id."""
        resp = await super_admin_client.get(f"/api/v1/admin/erasure/{bad_id}/verify")
        assert resp.status_code == 422

    @pytest.mark.parametrize(
        "bad_id",
        [
            "not-a-uuid",
            "'; DROP TABLE admin_audit_log;--",
        ],
        ids=["plain_text", "sql_injection"],
    )
    async def test_get_rejects_invalid_uuid(
        self,
        super_admin_client: AsyncClient,
        bad_id: str,
    ) -> None:
        """Get endpoint rejects non-UUID request_id."""
        resp = await super_admin_client.get(f"/api/v1/admin/erasure/{bad_id}")
        assert resp.status_code == 422

    async def test_path_traversal_does_not_reach_endpoint(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Path traversal in UUID slot gets 404 (FastAPI rewrites path).

        '../../../etc/passwd' is resolved by the ASGI transport to a different
        path like /api/etc/passwd/approve, which doesn't match any route.
        This is safe — no data is leaked.
        """
        resp = await super_admin_client.post(
            "/api/v1/admin/erasure/../../../etc/passwd/approve"
        )
        # Either 404 (no matching route) or 422 (invalid UUID) — both safe
        assert resp.status_code in {404, 422}

    async def test_empty_uuid_returns_404(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Empty string in UUID path slot produces 404 (double-slash route miss).

        /api/v1/admin/erasure//approve doesn't match the route pattern.
        """
        resp = await super_admin_client.post("/api/v1/admin/erasure//approve")
        assert resp.status_code in {404, 422}


# ── 7. JWT-sourced user ID (initiated_by from JWT, not body) ─────────


class TestJWTSourcedUserIds:
    """Admin user IDs must come from JWT, never from request body."""

    async def test_initiate_erasure_uses_jwt_user_id(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """initiate_erasure receives user_id from JWT, not from body."""
        mock_req = _mock_erasure_request()

        with patch(
            "app.routers.admin.initiate_erasure",
            new_callable=AsyncMock,
            return_value=mock_req,
        ) as mock_svc:
            await _send_request(
                super_admin_client,
                "POST",
                "/api/v1/admin/erasure/initiate",
                {
                    "organization_id": str(TARGET_ORG_ID),
                    "org_slug": "test-org",
                },
            )

        # Verify the service was called with the JWT user_id
        call_kwargs = mock_svc.call_args.kwargs
        assert call_kwargs["initiated_by"] == SUPER_ADMIN_USER_ID

    async def test_approve_erasure_uses_jwt_user_id(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """approve_erasure receives approved_by from JWT, not body."""
        mock_req = _mock_erasure_request(status=ErasureStatus.APPROVED)

        with patch(
            "app.routers.admin.approve_erasure",
            new_callable=AsyncMock,
            return_value=mock_req,
        ) as mock_svc:
            await _send_request(
                super_admin_client,
                "POST",
                f"/api/v1/admin/erasure/{ERASURE_REQUEST_ID}/approve",
            )

        call_kwargs = mock_svc.call_args.kwargs
        assert call_kwargs["approved_by"] == SUPER_ADMIN_USER_ID


# ── 8. Backoffice endpoints: unauthenticated → 401 ──────────────────


class TestUnauthenticatedAccessBackoffice:
    """All backoffice admin endpoints must return 401 without a valid token."""

    @pytest.mark.parametrize(
        ("method", "path", "body", "test_id"),
        _BACKOFFICE_ADMIN_ENDPOINTS,
        ids=[ep[3] for ep in _BACKOFFICE_ADMIN_ENDPOINTS],
    )
    async def test_unauthenticated_returns_401(
        self,
        unauth_client: AsyncClient,
        method: str,
        path: str,
        body: dict | None,
        test_id: str,
    ) -> None:
        """Backoffice endpoint '{test_id}' returns 401 without auth."""
        status_code, data = await _send_request(unauth_client, method, path, body)
        assert status_code == 401, (
            f"Expected 401 for {test_id} ({method} {path}), got {status_code}: {data}"
        )
        # Must not reveal admin role or endpoint info
        assert "super_admin" not in str(data).lower()


# ── 9. Backoffice endpoints: non-super_admin → 403 ──────────────────


class TestNonAdminRolesRejectedBackoffice:
    """Every backoffice endpoint must reject non-super_admin roles with 403."""

    @pytest.mark.parametrize("role", _NON_ADMIN_ROLES)
    @pytest.mark.parametrize(
        ("method", "path", "body", "test_id"),
        _BACKOFFICE_ADMIN_ENDPOINTS,
        ids=[ep[3] for ep in _BACKOFFICE_ADMIN_ENDPOINTS],
    )
    async def test_non_admin_role_returns_403(
        self,
        mock_session: AsyncMock,
        role: str,
        method: str,
        path: str,
        body: dict | None,
        test_id: str,
    ) -> None:
        """User with role '{role}' gets 403 on backoffice '{test_id}'."""

        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: _make_jwt(
            role=role,
            user_id=NON_ADMIN_USER_ID,
            org_id=NON_ADMIN_ORG_ID,
        )

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                status_code, data = await _send_request(client, method, path, body)

            assert status_code == 403, (
                f"Expected 403 for role={role} on {test_id} "
                f"({method} {path}), got {status_code}: {data}"
            )
            error_msg = data.get("error", {}).get("message", "")
            assert "insufficient permissions" in error_msg.lower(), (
                f"Missing 'insufficient permissions' in error for "
                f"role={role} on {test_id}: {error_msg}"
            )
            # Must NOT reveal the required role
            assert "super_admin" not in str(data)
        finally:
            app.dependency_overrides.clear()


# ── 10. Backoffice 403 response shape consistency ───────────────────


class TestForbiddenResponseShapeBackoffice:
    """403 responses from backoffice endpoints have consistent shape."""

    async def test_403_shape_is_consistent_across_backoffice(
        self,
        mock_session: AsyncMock,
    ) -> None:
        """All backoffice endpoints produce the same 403 error structure."""

        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: _make_jwt(
            role="org_admin",
            user_id=NON_ADMIN_USER_ID,
        )

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                responses = []
                for method, path, body, test_id in _BACKOFFICE_ADMIN_ENDPOINTS:
                    status_code, data = await _send_request(client, method, path, body)
                    responses.append((status_code, data, test_id))

            # All should be 403
            for status_code, _data, test_id in responses:
                assert status_code == 403, (
                    f"Endpoint {test_id} returned {status_code} instead of 403"
                )

            # All error messages should be identical (no info leakage)
            messages = [r[1]["error"]["message"] for r in responses]
            assert len(set(messages)) == 1, (
                f"Inconsistent 403 messages across backoffice: "
                f"{dict(zip([r[2] for r in responses], messages, strict=False))}"
            )
        finally:
            app.dependency_overrides.clear()


# ── 11. Path parameter injection on backoffice endpoints ─────────────


class TestBackofficePathParamValidation:
    """Path parameters on backoffice endpoints must reject injection."""

    @pytest.mark.parametrize(
        "bad_id",
        [
            "not-a-uuid",
            "'; DROP TABLE organizations;--",
            "null",
            "../../../etc/passwd",
        ],
        ids=["plain_text", "sql_injection", "null_string", "path_traversal"],
    )
    @pytest.mark.parametrize(
        ("method", "path_template", "body", "test_id"),
        [
            ("GET", "/api/v1/admin/organizations/{bad_id}", None, "get_org"),
            (
                "PATCH",
                "/api/v1/admin/organizations/{bad_id}",
                {"name": "x"},
                "update_org",
            ),
            (
                "POST",
                "/api/v1/admin/organizations/{bad_id}/suspend",
                None,
                "suspend_org",
            ),
            ("GET", "/api/v1/admin/organizations/{bad_id}/users", None, "list_users"),
            (
                "GET",
                "/api/v1/admin/billing/organizations/{bad_id}",
                None,
                "get_billing",
            ),
            (
                "GET",
                "/api/v1/admin/monitoring/organizations/{bad_id}",
                None,
                "monitoring_org",
            ),
            ("GET", "/api/v1/admin/onboarding/{bad_id}", None, "get_onboarding"),
        ],
        ids=[
            "get_org",
            "update_org",
            "suspend_org",
            "list_users",
            "get_billing",
            "monitoring_org",
            "get_onboarding",
        ],
    )
    async def test_invalid_uuid_rejected(
        self,
        super_admin_client: AsyncClient,
        bad_id: str,
        method: str,
        path_template: str,
        body: dict | None,
        test_id: str,
    ) -> None:
        """Endpoint '{test_id}' rejects invalid UUID '{bad_id}'."""
        path = path_template.replace("{bad_id}", bad_id)
        status_code, _ = await _send_request(super_admin_client, method, path, body)
        # Either 422 (validation error) or 404 (path not found) — both safe
        assert status_code in {404, 422}, (
            f"Expected 404 or 422 for bad_id='{bad_id}' on {test_id}, got {status_code}"
        )
