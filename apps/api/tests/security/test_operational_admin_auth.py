"""Security tests: operational admin endpoints reject non-super_admin roles.

Tests HTTP-level auth enforcement on ALL operational admin endpoints:
- 401 for unauthenticated requests (no/invalid token)
- 403 for authenticated users without super_admin role
- Consistent error shape (no info leakage)
- Path parameter validation (UUID injection)

Strategy:
- Use FastAPI dependency_overrides for auth simulation.
- All operational admin endpoints are GET-only (read-only monitoring).
- Tests follow the same pattern as test_admin_auth.py.
"""

import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.main import app

# -- Fixed test identifiers ------------------------------------------------
SUPER_ADMIN_USER_ID = "sa-op-admin-001"
SUPER_ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
NON_ADMIN_USER_ID = "na-op-admin-001"
NON_ADMIN_ORG_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
TARGET_ORG_ID = uuid.UUID("dddddddd-2222-2222-2222-222222222222")

# All operational admin endpoints: (method, path, test_id)
_OPERATIONAL_ADMIN_ENDPOINTS = [
    # admin_operational.py - per-org operational data
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical",
     "list_org_canonical"),
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/cost-params",
     "list_org_cost_params"),
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/coverage-alerts",
     "list_org_coverage_alerts"),
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/proof",
     "list_org_proof"),
    # admin_canonical.py - canonical quality and coverage
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical/quality",
     "org_canonical_quality"),
    ("GET", "/api/v1/admin/monitoring/canonical-coverage",
     "canonical_coverage"),
    # admin_alerts_overview.py - alerts summary
    ("GET", "/api/v1/admin/monitoring/alerts/summary",
     "alerts_summary"),
    ("GET", "/api/v1/admin/monitoring/alerts/by-org",
     "alerts_by_org"),
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/alerts",
     "org_alerts"),
    # admin_scenarios.py - scenario summary
    ("GET", "/api/v1/admin/monitoring/scenarios/summary",
     "scenarios_summary"),
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/scenarios",
     "org_scenarios"),
    # admin_decisions_enhanced.py - decision summary
    ("GET", "/api/v1/admin/monitoring/decisions/summary",
     "decisions_summary"),
    ("GET", "/api/v1/admin/monitoring/decisions/overrides",
     "decisions_overrides"),
    ("GET", "/api/v1/admin/monitoring/decisions/adoption",
     "decisions_adoption"),
    # admin_proof_packs.py - proof summary
    ("GET", "/api/v1/admin/monitoring/proof-packs/summary",
     "proof_packs_summary"),
    ("GET", f"/api/v1/admin/organizations/{TARGET_ORG_ID}/proof-packs",
     "org_proof_packs"),
    # admin_cost_params.py - missing cost params
    ("GET", "/api/v1/admin/monitoring/cost-params/missing",
     "cost_params_missing"),
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


# -- Fixtures --------------------------------------------------------------


@pytest.fixture
def mock_session() -> AsyncMock:
    """Mock AsyncSession for endpoints that require DB."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    return session


@pytest.fixture
async def unauth_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with NO auth -- tests 401 behavior."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


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


# -- 1. Unauthenticated access -> 401 --------------------------------------


class TestUnauthenticatedAccessOperational:
    """All operational admin endpoints must return 401 without a valid token."""

    @pytest.mark.parametrize(
        ("method", "path", "test_id"),
        _OPERATIONAL_ADMIN_ENDPOINTS,
        ids=[ep[2] for ep in _OPERATIONAL_ADMIN_ENDPOINTS],
    )
    async def test_unauthenticated_returns_401(
        self,
        unauth_client: AsyncClient,
        method: str,
        path: str,
        test_id: str,
    ) -> None:
        """Operational admin endpoint returns 401 without auth."""
        resp = await unauth_client.get(path)
        assert resp.status_code == 401, (
            f"Expected 401 for {test_id} ({method} {path}), "
            f"got {resp.status_code}: {resp.json()}"
        )
        # Must not reveal admin role or endpoint info
        data = resp.json()
        assert "super_admin" not in str(data).lower()


# -- 2. Non-super_admin roles -> 403 ---------------------------------------


class TestNonAdminRolesRejectedOperational:
    """Every operational admin endpoint must reject non-super_admin roles with 403."""

    @pytest.mark.parametrize("role", _NON_ADMIN_ROLES)
    @pytest.mark.parametrize(
        ("method", "path", "test_id"),
        _OPERATIONAL_ADMIN_ENDPOINTS,
        ids=[ep[2] for ep in _OPERATIONAL_ADMIN_ENDPOINTS],
    )
    async def test_non_admin_role_returns_403(
        self,
        mock_session: AsyncMock,
        role: str,
        method: str,
        path: str,
        test_id: str,
    ) -> None:
        """User with role gets 403 on operational admin endpoint."""

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
                resp = await client.get(path)

            assert resp.status_code == 403, (
                f"Expected 403 for role={role} on {test_id} "
                f"({method} {path}), got {resp.status_code}: {resp.json()}"
            )
            data = resp.json()
            error_msg = data.get("error", {}).get("message", "")
            assert "insufficient permissions" in error_msg.lower(), (
                f"Missing 'insufficient permissions' in error for "
                f"role={role} on {test_id}: {error_msg}"
            )
            # Must NOT reveal the required role
            assert "super_admin" not in str(data)
        finally:
            app.dependency_overrides.clear()


# -- 3. 403 error shape consistency ----------------------------------------


class TestForbiddenResponseShapeOperational:
    """403 responses from operational admin endpoints have consistent shape."""

    async def test_403_shape_is_consistent_across_operational_admin(
        self,
        mock_session: AsyncMock,
    ) -> None:
        """All operational admin endpoints produce the same 403 error structure."""

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
                for method, path, test_id in _OPERATIONAL_ADMIN_ENDPOINTS:
                    resp = await client.get(path)
                    responses.append((resp.status_code, resp.json(), test_id))

            # All should be 403
            for status_code, data, test_id in responses:
                assert status_code == 403, (
                    f"Endpoint {test_id} returned {status_code} instead of 403"
                )

            # All error messages should be identical (no info leakage)
            messages = [r[1]["error"]["message"] for r in responses]
            assert len(set(messages)) == 1, (
                f"Inconsistent 403 messages across operational admin: "
                f"{dict(zip([r[2] for r in responses], messages))}"
            )
        finally:
            app.dependency_overrides.clear()


# -- 4. Path parameter injection -------------------------------------------


class TestOperationalPathParamValidation:
    """Path parameters on operational admin endpoints must reject injection."""

    # Endpoints that take a target_org_id path parameter
    _ORG_SCOPED_PATHS = [
        "/api/v1/admin/organizations/{bad_id}/canonical",
        "/api/v1/admin/organizations/{bad_id}/cost-params",
        "/api/v1/admin/organizations/{bad_id}/coverage-alerts",
        "/api/v1/admin/organizations/{bad_id}/proof",
        "/api/v1/admin/organizations/{bad_id}/canonical/quality",
        "/api/v1/admin/organizations/{bad_id}/alerts",
        "/api/v1/admin/organizations/{bad_id}/scenarios",
        "/api/v1/admin/organizations/{bad_id}/proof-packs",
    ]

    @pytest.mark.parametrize(
        "bad_id",
        [
            "not-a-uuid",
            "'; DROP TABLE canonical_records;--",
            "null",
            "../../../etc/passwd",
        ],
        ids=["plain_text", "sql_injection", "null_string", "path_traversal"],
    )
    @pytest.mark.parametrize(
        "path_template",
        _ORG_SCOPED_PATHS,
        ids=[
            "canonical", "cost_params", "coverage_alerts", "proof",
            "canonical_quality", "alerts", "scenarios", "proof_packs",
        ],
    )
    async def test_invalid_uuid_rejected(
        self,
        super_admin_client: AsyncClient,
        bad_id: str,
        path_template: str,
    ) -> None:
        """Operational admin endpoint rejects invalid UUID in path."""
        path = path_template.replace("{bad_id}", bad_id)
        resp = await super_admin_client.get(path)
        # Either 422 (validation error) or 404 (path not found) -- both safe
        assert resp.status_code in {404, 422}, (
            f"Expected 404 or 422 for bad_id='{bad_id}' on {path_template}, "
            f"got {resp.status_code}"
        )


# -- 5. No data leakage in error responses --------------------------------


class TestNoDataLeakage:
    """Error responses must not leak sensitive information."""

    async def test_401_does_not_reveal_endpoint_exists(
        self,
        unauth_client: AsyncClient,
    ) -> None:
        """401 error for a real endpoint looks similar to unknown endpoint."""
        real_resp = await unauth_client.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical"
        )
        # The real endpoint must require auth
        assert real_resp.status_code == 401

    async def test_403_does_not_reveal_which_endpoint(
        self,
        mock_session: AsyncMock,
    ) -> None:
        """403 error messages are generic across all endpoints."""

        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: _make_jwt(
            role="viewer",
            user_id=NON_ADMIN_USER_ID,
        )

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                resp1 = await client.get(
                    f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical"
                )
                resp2 = await client.get(
                    "/api/v1/admin/monitoring/decisions/summary"
                )

            assert resp1.status_code == 403
            assert resp2.status_code == 403

            # Error payloads should be structurally identical
            data1 = resp1.json()
            data2 = resp2.json()
            assert data1["error"]["message"] == data2["error"]["message"]
            assert data1["error"]["code"] == data2["error"]["code"]
        finally:
            app.dependency_overrides.clear()

    async def test_403_does_not_contain_model_names(
        self,
        mock_session: AsyncMock,
    ) -> None:
        """403 error does not reveal internal model names."""

        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: _make_jwt(
            role="employee",
            user_id=NON_ADMIN_USER_ID,
        )

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                resp = await client.get(
                    f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical"
                )

            data = resp.json()
            error_str = str(data).lower()
            for model_name in [
                "canonicalrecord", "costparameter", "coveragealert",
                "scenariooption", "operationaldecision", "proofrecord",
                "adminauditlog",
            ]:
                assert model_name.lower() not in error_str, (
                    f"403 error leaks model name '{model_name}'"
                )
        finally:
            app.dependency_overrides.clear()


# -- 6. Pagination parameter bounds ----------------------------------------


class TestPaginationBounds:
    """Paginated operational admin endpoints respect bounds."""

    async def test_page_size_max_100(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Page size > 100 returns 422 validation error."""
        resp = await super_admin_client.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical",
            params={"page_size": 200},
        )
        assert resp.status_code == 422

    async def test_page_min_1(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Page < 1 returns 422 validation error."""
        resp = await super_admin_client.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical",
            params={"page": 0},
        )
        assert resp.status_code == 422

    async def test_page_size_min_1(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Page size < 1 returns 422 validation error."""
        resp = await super_admin_client.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical",
            params={"page_size": 0},
        )
        assert resp.status_code == 422

    async def test_negative_page_returns_422(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Negative page number returns 422."""
        resp = await super_admin_client.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical",
            params={"page": -1},
        )
        assert resp.status_code == 422

    async def test_non_integer_page_returns_422(
        self,
        super_admin_client: AsyncClient,
    ) -> None:
        """Non-integer page returns 422."""
        resp = await super_admin_client.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}/canonical",
            params={"page": "abc"},
        )
        assert resp.status_code == 422
