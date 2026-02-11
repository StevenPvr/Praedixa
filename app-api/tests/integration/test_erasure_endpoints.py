"""Integration tests for admin erasure endpoints — audit logging and full coverage.

Tests all five erasure endpoints:
- POST /api/v1/admin/erasure/initiate
- POST /api/v1/admin/erasure/{request_id}/approve
- POST /api/v1/admin/erasure/{request_id}/execute
- GET  /api/v1/admin/erasure/{request_id}/verify
- GET  /api/v1/admin/erasure/{request_id}

Previously these were pragma: no cover. Now they have full test coverage
including verification that audit logging is called with correct parameters.

Strategy:
- Override get_current_user, get_db_session via FastAPI dependency_overrides.
- Mock erasure service functions to avoid in-memory store side effects.
- Verify log_admin_action is called with correct AdminAuditAction values.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.main import app
from app.services.rgpd_erasure import (
    ErasureRequest,
    ErasureStatus,
)

# -- Fixed test identifiers ------------------------------------------------
ADMIN_A_ID = "11111111-aaaa-bbbb-cccc-aaaa00000001"
ADMIN_B_ID = "11111111-aaaa-bbbb-cccc-bbbb00000002"
TARGET_ORG_ID = uuid.UUID("eeeeeeee-0000-0000-0000-000000000001")
ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000099")
ORG_SLUG = "test-erasure-org"

ERASURE_PREFIX = "/api/v1/admin/erasure"


def _make_admin_jwt(user_id: str = ADMIN_A_ID) -> JWTPayload:
    return JWTPayload(
        user_id=user_id,
        email="admin@erasure-test.com",
        organization_id=str(ADMIN_ORG_ID),
        role="super_admin",
    )


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
async def admin_client_a(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """Client authenticated as Admin A."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_jwt(ADMIN_A_ID)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def admin_client_b(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """Client authenticated as Admin B (for dual-approval)."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_jwt(ADMIN_B_ID)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# -- Helpers ---------------------------------------------------------------


def _make_erasure_request(
    *,
    status: ErasureStatus = ErasureStatus.PENDING_APPROVAL,
    initiated_by: str = ADMIN_A_ID,
    approved_by: str | None = None,
    request_id: uuid.UUID | None = None,
) -> ErasureRequest:
    return ErasureRequest(
        id=request_id or uuid.uuid4(),
        organization_id=TARGET_ORG_ID,
        org_slug=ORG_SLUG,
        initiated_by=initiated_by,
        approved_by=approved_by,
        status=status,
        created_at=datetime.now(UTC),
        audit_log=["test entry"],
    )


# ── 1. POST /erasure/initiate ────────────────────────────────────────────


class TestInitiateErasureEndpoint:
    """POST /api/v1/admin/erasure/initiate"""

    @patch("app.routers.admin.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin.initiate_erasure", new_callable=AsyncMock)
    async def test_initiate_success_with_audit_log(
        self,
        mock_initiate: AsyncMock,
        mock_audit: AsyncMock,
        admin_client_a: AsyncClient,
    ) -> None:
        """Initiation creates request and logs ERASURE_INITIATE."""
        req = _make_erasure_request()
        mock_initiate.return_value = req

        resp = await admin_client_a.post(
            f"{ERASURE_PREFIX}/initiate",
            json={
                "organization_id": str(TARGET_ORG_ID),
                "org_slug": ORG_SLUG,
            },
        )

        assert resp.status_code == 201
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["status"] == "pending_approval"

        # Verify audit logging was called
        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"].value == "erasure_initiate"
        assert call_kwargs["severity"] == "CRITICAL"
        assert call_kwargs["target_org_id"] == str(TARGET_ORG_ID)

    @patch("app.routers.admin.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin.initiate_erasure", new_callable=AsyncMock)
    async def test_initiate_extra_fields_rejected(
        self,
        mock_initiate: AsyncMock,
        mock_audit: AsyncMock,
        admin_client_a: AsyncClient,
    ) -> None:
        """Extra fields in body are rejected (extra=forbid)."""
        resp = await admin_client_a.post(
            f"{ERASURE_PREFIX}/initiate",
            json={
                "organization_id": str(TARGET_ORG_ID),
                "org_slug": ORG_SLUG,
                "status": "completed",  # injection attempt
            },
        )

        assert resp.status_code == 422
        mock_initiate.assert_not_awaited()

    @patch("app.routers.admin.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin.initiate_erasure", new_callable=AsyncMock)
    async def test_initiate_invalid_slug_rejected(
        self,
        mock_initiate: AsyncMock,
        mock_audit: AsyncMock,
        admin_client_a: AsyncClient,
    ) -> None:
        """Invalid slug pattern is rejected at schema level."""
        resp = await admin_client_a.post(
            f"{ERASURE_PREFIX}/initiate",
            json={
                "organization_id": str(TARGET_ORG_ID),
                "org_slug": "INVALID_SLUG!",
            },
        )

        assert resp.status_code == 422


# ── 2. POST /erasure/{id}/approve ────────────────────────────────────────


class TestApproveErasureEndpoint:
    """POST /api/v1/admin/erasure/{request_id}/approve"""

    @patch("app.routers.admin.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin.approve_erasure", new_callable=AsyncMock)
    async def test_approve_success_with_audit_log(
        self,
        mock_approve: AsyncMock,
        mock_audit: AsyncMock,
        admin_client_b: AsyncClient,
    ) -> None:
        """Approval logs ERASURE_APPROVE with CRITICAL severity."""
        req_id = uuid.uuid4()
        req = _make_erasure_request(
            request_id=req_id,
            status=ErasureStatus.APPROVED,
            approved_by=ADMIN_B_ID,
        )
        mock_approve.return_value = req

        resp = await admin_client_b.post(f"{ERASURE_PREFIX}/{req_id}/approve")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["status"] == "approved"

        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"].value == "erasure_approve"
        assert call_kwargs["severity"] == "CRITICAL"

    @patch("app.routers.admin.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin.approve_erasure", new_callable=AsyncMock)
    async def test_approve_invalid_uuid_returns_422(
        self,
        mock_approve: AsyncMock,
        mock_audit: AsyncMock,
        admin_client_b: AsyncClient,
    ) -> None:
        """Non-UUID request_id returns 422."""
        resp = await admin_client_b.post(f"{ERASURE_PREFIX}/not-a-uuid/approve")

        assert resp.status_code == 422


# ── 3. POST /erasure/{id}/execute ────────────────────────────────────────


class TestExecuteErasureEndpoint:
    """POST /api/v1/admin/erasure/{request_id}/execute"""

    @patch("app.routers.admin.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin.execute_erasure", new_callable=AsyncMock)
    @patch("app.routers.admin._get_key_provider")
    async def test_execute_success_with_audit_log(
        self,
        mock_key_provider: MagicMock,
        mock_execute: AsyncMock,
        mock_audit: AsyncMock,
        admin_client_a: AsyncClient,
    ) -> None:
        """Execution logs ERASURE_EXECUTE with CRITICAL severity."""
        req_id = uuid.uuid4()
        req = _make_erasure_request(
            request_id=req_id,
            status=ErasureStatus.COMPLETED,
        )
        mock_execute.return_value = req
        mock_key_provider.return_value = MagicMock()

        resp = await admin_client_a.post(f"{ERASURE_PREFIX}/{req_id}/execute")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["status"] == "completed"

        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"].value == "erasure_execute"
        assert call_kwargs["severity"] == "CRITICAL"
        assert call_kwargs["metadata"]["final_status"] == "completed"


# ── 4. GET /erasure/{id}/verify ──────────────────────────────────────────


class TestVerifyErasureEndpoint:
    """GET /api/v1/admin/erasure/{request_id}/verify"""

    @patch("app.routers.admin.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin.verify_erasure", new_callable=AsyncMock)
    @patch("app.routers.admin.get_erasure_request")
    async def test_verify_success_with_audit_log(
        self,
        mock_get: MagicMock,
        mock_verify: AsyncMock,
        mock_audit: AsyncMock,
        admin_client_a: AsyncClient,
    ) -> None:
        """Verification logs VIEW_ORG with metadata."""
        req_id = uuid.uuid4()
        req = _make_erasure_request(request_id=req_id)
        mock_get.return_value = req
        mock_verify.return_value = {"organizations": 0, "users": 0}

        resp = await admin_client_a.get(f"{ERASURE_PREFIX}/{req_id}/verify")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["all_erased"] is True
        assert body["data"]["counts"]["organizations"] == 0

        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"].value == "view_org"
        assert call_kwargs["metadata"]["all_erased"] is True

    @patch("app.routers.admin.get_erasure_request")
    async def test_verify_not_found_returns_404(
        self,
        mock_get: MagicMock,
        admin_client_a: AsyncClient,
    ) -> None:
        """Non-existent erasure request returns 404."""
        mock_get.return_value = None

        resp = await admin_client_a.get(f"{ERASURE_PREFIX}/{uuid.uuid4()}/verify")

        assert resp.status_code == 404

    @patch("app.routers.admin.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin.verify_erasure", new_callable=AsyncMock)
    @patch("app.routers.admin.get_erasure_request")
    async def test_verify_partial_erasure(
        self,
        mock_get: MagicMock,
        mock_verify: AsyncMock,
        mock_audit: AsyncMock,
        admin_client_a: AsyncClient,
    ) -> None:
        """Partial erasure returns all_erased=False."""
        req_id = uuid.uuid4()
        req = _make_erasure_request(request_id=req_id)
        mock_get.return_value = req
        mock_verify.return_value = {"organizations": 0, "users": 3}

        resp = await admin_client_a.get(f"{ERASURE_PREFIX}/{req_id}/verify")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["all_erased"] is False


# ── 5. GET /erasure/{id} ─────────────────────────────────────────────────


class TestGetErasureRequestEndpoint:
    """GET /api/v1/admin/erasure/{request_id}"""

    @patch("app.routers.admin.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin.get_erasure_request")
    async def test_get_success_with_audit_log(
        self,
        mock_get: MagicMock,
        mock_audit: AsyncMock,
        admin_client_a: AsyncClient,
    ) -> None:
        """Get erasure request logs VIEW_ORG."""
        req_id = uuid.uuid4()
        req = _make_erasure_request(request_id=req_id)
        mock_get.return_value = req

        resp = await admin_client_a.get(f"{ERASURE_PREFIX}/{req_id}")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["org_slug"] == ORG_SLUG

        mock_audit.assert_awaited_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["action"].value == "view_org"
        assert call_kwargs["resource_type"] == "ErasureRequest"

    @patch("app.routers.admin.get_erasure_request")
    async def test_get_not_found_returns_404(
        self,
        mock_get: MagicMock,
        admin_client_a: AsyncClient,
    ) -> None:
        """Non-existent request returns 404."""
        mock_get.return_value = None

        resp = await admin_client_a.get(f"{ERASURE_PREFIX}/{uuid.uuid4()}")

        assert resp.status_code == 404


# ── 6. _to_response helper ───────────────────────────────────────────────


class TestToResponseHelper:
    """Tests for _to_response conversion function."""

    def test_converts_all_fields(self) -> None:
        """_to_response maps all ErasureRequest fields correctly."""
        from app.routers.admin import _to_response

        req = _make_erasure_request(
            approved_by=ADMIN_B_ID,
            status=ErasureStatus.COMPLETED,
        )
        resp = _to_response(req)

        assert resp.id == req.id
        assert resp.organization_id == req.organization_id
        assert resp.org_slug == req.org_slug
        assert resp.initiated_by == req.initiated_by
        assert resp.approved_by == ADMIN_B_ID
        assert resp.status == ErasureStatus.COMPLETED
