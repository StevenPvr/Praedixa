"""Security tests for conversation isolation, sanitization, role enforcement.

Threat model:
- Horizontal privilege escalation: user of org_b accesses org_a's conversations.
- Content injection: XSS payloads in message content.
- Mass assignment: injecting organization_id, sender_user_id via body.
- Role escalation: viewer/employee accessing messaging endpoints.
- IDOR: guessing conversation/message IDs across tenants.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_tenant_filter,
)
from app.core.security import TenantFilter
from app.main import app
from app.models.conversation import ConversationInitiator, ConversationStatus
from app.services.conversation_service import _sanitize_content

# -- Fixed test identifiers ---------------------------------------------------
ORG_A_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
ORG_B_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
USER_A_ID = "11111111-aaaa-bbbb-cccc-000000000001"
USER_B_ID = "22222222-aaaa-bbbb-cccc-000000000002"
CONV_A_ID = uuid.UUID("cccccccc-1111-1111-1111-111111111111")
PREFIX = "/api/v1/conversations"


def _make_jwt(user_id: str, org_id: uuid.UUID, role: str = "org_admin") -> JWTPayload:
    return JWTPayload(
        user_id=user_id,
        email=f"{user_id}@test.com",
        organization_id=str(org_id),
        role=role,
    )


JWT_A = _make_jwt(USER_A_ID, ORG_A_ID)
JWT_B = _make_jwt(USER_B_ID, ORG_B_ID)


def _scalar_one_result(value):
    result = MagicMock()
    result.scalar_one.return_value = value
    result.scalar_one_or_none.return_value = value
    return result


def _scalars_all_result(values):
    result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = values
    result.scalars.return_value = scalars_mock
    return result


def _make_conversation(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": CONV_A_ID,
        "organization_id": ORG_A_ID,
        "subject": "Org A ticket",
        "status": ConversationStatus.OPEN,
        "initiated_by": ConversationInitiator.CLIENT,
        "last_message_at": now,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# -- Fixtures ------------------------------------------------------------------


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
async def client_a(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """Client authenticated as org A."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: JWT_A
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def client_b(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """Client authenticated as org B."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: JWT_B
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_B_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def viewer_client(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """Client with viewer role."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    viewer_jwt = _make_jwt(USER_A_ID, ORG_A_ID, role="viewer")
    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: viewer_jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def employee_client(
    mock_session: AsyncMock,
) -> AsyncGenerator[AsyncClient, None]:
    """Client with employee role."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    employee_jwt = _make_jwt(USER_A_ID, ORG_A_ID, role="employee")
    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: employee_jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# -- Tenant Isolation Tests ----------------------------------------------------


class TestTenantIsolation:
    """Org B cannot see or access org A's conversations."""

    async def test_org_b_sees_empty_list(
        self, client_b: AsyncClient, mock_session: AsyncMock
    ) -> None:
        """Org B's tenant filter means org A convs are invisible."""
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _scalars_all_result([]),
        ]

        resp = await client_b.get(PREFIX)

        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_org_b_gets_404_on_org_a_conversation_messages(
        self, client_b: AsyncClient, mock_session: AsyncMock
    ) -> None:
        """Org B gets 404 (not 403) when accessing org A's conversation.

        This is the invisible (not inaccessible) pattern — prevents IDOR
        by making cross-org resources indistinguishable from nonexistent ones.
        """
        # TenantFilter means the query returns None for org A's conv
        mock_session.execute.return_value = _scalar_one_result(None)

        resp = await client_b.get(f"{PREFIX}/{CONV_A_ID}/messages")

        assert resp.status_code == 404

    async def test_org_b_cannot_post_message_to_org_a_conversation(
        self, client_b: AsyncClient, mock_session: AsyncMock
    ) -> None:
        """Org B cannot inject messages into org A's conversations."""
        mock_session.execute.return_value = _scalar_one_result(None)

        resp = await client_b.post(
            f"{PREFIX}/{CONV_A_ID}/messages",
            json={"content": "Injected message"},
        )

        assert resp.status_code == 404


# -- Content Sanitization Tests ------------------------------------------------


class TestContentSanitization:
    """Tests for XSS prevention in message content."""

    def test_strips_script_tags(self) -> None:
        result = _sanitize_content("<script>alert('xss')</script>Hello")
        assert "<script>" not in result
        assert "Hello" in result

    def test_strips_event_handlers(self) -> None:
        result = _sanitize_content('<img onerror="alert(1)" src="x">')
        assert "onerror" not in result

    def test_strips_nested_tags(self) -> None:
        result = _sanitize_content("<b><i>Bold italic</i></b>")
        assert result == "Bold italic"

    def test_preserves_legitimate_content(self) -> None:
        result = _sanitize_content("Hello & welcome! 2 > 1 and 1 < 2")
        assert "Hello" in result

    def test_truncates_oversized_content(self) -> None:
        """Defense-in-depth: truncate at service layer even if schema allows."""
        content = "x" * 10000
        result = _sanitize_content(content)
        assert len(result) == 5000

    def test_empty_after_strip(self) -> None:
        result = _sanitize_content("<p></p>")
        assert result == ""


# -- Mass Assignment Tests -----------------------------------------------------


class TestMassAssignment:
    """Verify that extra fields in request bodies are rejected."""

    async def test_create_conversation_rejects_org_id(
        self, client_a: AsyncClient
    ) -> None:
        resp = await client_a.post(
            PREFIX,
            json={
                "subject": "Ticket",
                "content": "Hello",
                "organizationId": str(ORG_B_ID),
            },
        )
        assert resp.status_code == 422

    async def test_create_conversation_rejects_status(
        self, client_a: AsyncClient
    ) -> None:
        resp = await client_a.post(
            PREFIX,
            json={
                "subject": "Ticket",
                "content": "Hello",
                "status": "resolved",
            },
        )
        assert resp.status_code == 422

    async def test_send_message_rejects_sender_user_id(
        self, client_a: AsyncClient
    ) -> None:
        resp = await client_a.post(
            f"{PREFIX}/{CONV_A_ID}/messages",
            json={"content": "Hello", "senderUserId": str(uuid.uuid4())},
        )
        assert resp.status_code == 422

    async def test_send_message_rejects_sender_role(
        self, client_a: AsyncClient
    ) -> None:
        resp = await client_a.post(
            f"{PREFIX}/{CONV_A_ID}/messages",
            json={"content": "Hello", "senderRole": "super_admin"},
        )
        assert resp.status_code == 422

    async def test_send_message_rejects_is_read(self, client_a: AsyncClient) -> None:
        resp = await client_a.post(
            f"{PREFIX}/{CONV_A_ID}/messages",
            json={"content": "Hello", "isRead": True},
        )
        assert resp.status_code == 422


# -- Role Enforcement Tests ----------------------------------------------------


class TestRoleEnforcement:
    """Verify that only allowed roles can access messaging."""

    async def test_viewer_cannot_list_conversations(
        self, viewer_client: AsyncClient
    ) -> None:
        resp = await viewer_client.get(PREFIX)
        assert resp.status_code == 403

    async def test_viewer_cannot_create_conversation(
        self, viewer_client: AsyncClient
    ) -> None:
        resp = await viewer_client.post(
            PREFIX,
            json={"subject": "Ticket", "content": "Hello"},
        )
        assert resp.status_code == 403

    async def test_viewer_cannot_send_message(self, viewer_client: AsyncClient) -> None:
        resp = await viewer_client.post(
            f"{PREFIX}/{CONV_A_ID}/messages",
            json={"content": "Hello"},
        )
        assert resp.status_code == 403

    async def test_viewer_cannot_get_unread_count(
        self, viewer_client: AsyncClient
    ) -> None:
        resp = await viewer_client.get(f"{PREFIX}/unread-count")
        assert resp.status_code == 403

    async def test_employee_cannot_list_conversations(
        self, employee_client: AsyncClient
    ) -> None:
        resp = await employee_client.get(PREFIX)
        assert resp.status_code == 403

    async def test_employee_cannot_create_conversation(
        self, employee_client: AsyncClient
    ) -> None:
        resp = await employee_client.post(
            PREFIX,
            json={"subject": "Ticket", "content": "Hello"},
        )
        assert resp.status_code == 403


# -- Schema Validation Tests ---------------------------------------------------


class TestSchemaValidation:
    """Input validation at the boundary layer."""

    async def test_subject_too_long(self, client_a: AsyncClient) -> None:
        resp = await client_a.post(
            PREFIX,
            json={"subject": "x" * 256, "content": "Hello"},
        )
        assert resp.status_code == 422

    async def test_content_too_long(self, client_a: AsyncClient) -> None:
        resp = await client_a.post(
            PREFIX,
            json={"subject": "Ticket", "content": "x" * 5001},
        )
        assert resp.status_code == 422

    async def test_status_update_rejects_open(self, client_a: AsyncClient) -> None:
        """Cannot set status to open (reopen) via admin endpoint."""
        # This tests the schema validator, not the endpoint directly.
        # The admin endpoint uses the same schema.
        from app.schemas.conversation import ConversationStatusUpdate

        with pytest.raises(ValueError):
            ConversationStatusUpdate(status="open")

    async def test_status_update_allows_resolved(self, client_a: AsyncClient) -> None:
        from app.schemas.conversation import ConversationStatusUpdate

        update = ConversationStatusUpdate(status="resolved")
        assert update.status == ConversationStatus.RESOLVED

    async def test_status_update_allows_archived(self, client_a: AsyncClient) -> None:
        from app.schemas.conversation import ConversationStatusUpdate

        update = ConversationStatusUpdate(status="archived")
        assert update.status == ConversationStatus.ARCHIVED
