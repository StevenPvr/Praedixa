"""Integration tests for admin_conversations router — 100% coverage.

Tests all endpoints:
- GET /api/v1/admin/conversations
- GET /api/v1/admin/organizations/{target_org_id}/conversations
- GET /api/v1/admin/conversations/unread-count
- GET /api/v1/admin/conversations/{conv_id}/messages
- POST /api/v1/admin/conversations/{conv_id}/messages
- PATCH /api/v1/admin/conversations/{conv_id}

Strategy:
- Override get_current_user, get_db_session via FastAPI dependency_overrides.
- Mock session.execute to return controlled results.
- Verify audit logging calls (session.add called for audit log entries).
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.main import app
from app.models.conversation import ConversationInitiator, ConversationStatus

# -- Fixed test identifiers ---------------------------------------------------
ADMIN_USER_ID = "11111111-aaaa-bbbb-cccc-000000000004"
ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
TARGET_ORG_ID = uuid.UUID("cccccccc-3333-3333-3333-333333333333")
CONV_ID = uuid.UUID("cccccccc-1111-1111-1111-111111111111")
MSG_ID = uuid.UUID("dddddddd-1111-1111-1111-111111111111")
ADMIN_PREFIX = "/api/v1/admin"


def _make_admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="admin@test.com",
        organization_id=str(ADMIN_ORG_ID),
        role="super_admin",
    )


def _make_non_admin_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=ADMIN_USER_ID,
        email="user@test.com",
        organization_id=str(ADMIN_ORG_ID),
        role="org_admin",
    )


# -- Helpers -------------------------------------------------------------------


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
        "id": CONV_ID,
        "organization_id": TARGET_ORG_ID,
        "subject": "Test conversation",
        "status": ConversationStatus.OPEN,
        "initiated_by": ConversationInitiator.CLIENT,
        "last_message_at": now,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_message(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": MSG_ID,
        "conversation_id": CONV_ID,
        "sender_user_id": uuid.UUID(ADMIN_USER_ID),
        "sender_role": "super_admin",
        "content": "Admin reply",
        "is_read": False,
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
async def admin_client(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = _make_admin_jwt

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def non_admin_client(
    mock_session: AsyncMock,
) -> AsyncGenerator[AsyncClient, None]:
    """Client with non-admin role — should be rejected."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = _make_non_admin_jwt

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# -- GET /api/v1/admin/conversations -----------------------------------------


class TestAdminListConversations:
    """GET /api/v1/admin/conversations"""

    async def test_returns_conversations(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        convs = [_make_conversation()]
        mock_session.execute.side_effect = [
            _scalar_one_result(1),  # count
            _scalars_all_result(convs),  # items
        ]

        resp = await admin_client.get(f"{ADMIN_PREFIX}/conversations")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 1
        # Audit log entry was added
        assert mock_session.add.called

    async def test_with_status_filter(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _scalars_all_result([]),
        ]

        resp = await admin_client.get(
            f"{ADMIN_PREFIX}/conversations", params={"status": "open"}
        )

        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_with_org_id_filter(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.side_effect = [
            _scalar_one_result(1),
            _scalars_all_result([_make_conversation()]),
        ]

        resp = await admin_client.get(
            f"{ADMIN_PREFIX}/conversations",
            params={"org_id": str(TARGET_ORG_ID)},
        )

        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1

    async def test_non_admin_rejected(self, non_admin_client: AsyncClient) -> None:
        resp = await non_admin_client.get(f"{ADMIN_PREFIX}/conversations")
        assert resp.status_code == 403


# -- GET /api/v1/admin/organizations/{target_org_id}/conversations ----------


class TestAdminListOrgConversations:
    """GET /api/v1/admin/organizations/{target_org_id}/conversations"""

    async def test_returns_org_conversations(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        convs = [_make_conversation()]
        mock_session.execute.side_effect = [
            _scalar_one_result(1),
            _scalars_all_result(convs),
        ]

        resp = await admin_client.get(
            f"{ADMIN_PREFIX}/organizations/{TARGET_ORG_ID}/conversations"
        )

        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1

    async def test_empty_org(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _scalars_all_result([]),
        ]

        resp = await admin_client.get(
            f"{ADMIN_PREFIX}/organizations/{TARGET_ORG_ID}/conversations"
        )

        assert resp.status_code == 200
        assert resp.json()["data"] == []


# -- GET /api/v1/admin/conversations/unread-count ----------------------------


class TestAdminUnreadCount:
    """GET /api/v1/admin/conversations/unread-count"""

    async def test_returns_count_by_org(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        org_id = uuid.uuid4()
        by_org_row = SimpleNamespace(organization_id=org_id, org_name="Acme", cnt=7)
        by_org_result = MagicMock()
        by_org_result.all.return_value = [by_org_row]

        mock_session.execute.side_effect = [
            _scalar_one_result(10),  # total count
            by_org_result,  # per-org rows
        ]

        resp = await admin_client.get(f"{ADMIN_PREFIX}/conversations/unread-count")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total"] == 10
        assert len(data["byOrg"]) == 1
        assert data["byOrg"][0]["orgId"] == str(org_id)
        assert data["byOrg"][0]["orgName"] == "Acme"
        assert data["byOrg"][0]["count"] == 7

    async def test_returns_empty_when_no_unread(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        by_org_result = MagicMock()
        by_org_result.all.return_value = []

        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            by_org_result,
        ]

        resp = await admin_client.get(f"{ADMIN_PREFIX}/conversations/unread-count")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total"] == 0
        assert data["byOrg"] == []

    async def test_non_admin_rejected(self, non_admin_client: AsyncClient) -> None:
        resp = await non_admin_client.get(f"{ADMIN_PREFIX}/conversations/unread-count")
        assert resp.status_code == 403


# -- GET /api/v1/admin/conversations/{conv_id}/messages --------------------


class TestAdminListMessages:
    """GET /api/v1/admin/conversations/{conv_id}/messages"""

    async def test_returns_messages(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        conv = _make_conversation()
        msgs = [_make_message()]
        mock_session.execute.side_effect = [
            _scalar_one_result(conv),  # get_conversation_admin
            _scalar_one_result(1),  # count
            _scalars_all_result(msgs),  # items
        ]

        resp = await admin_client.get(
            f"{ADMIN_PREFIX}/conversations/{CONV_ID}/messages"
        )

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) == 1
        assert body["data"][0]["senderRole"] == "super_admin"

    async def test_conversation_not_found(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.return_value = _scalar_one_result(None)

        resp = await admin_client.get(
            f"{ADMIN_PREFIX}/conversations/{CONV_ID}/messages"
        )

        assert resp.status_code == 404


# -- POST /api/v1/admin/conversations/{conv_id}/messages -------------------


class TestAdminSendMessage:
    """POST /api/v1/admin/conversations/{conv_id}/messages"""

    async def test_sends_message(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        conv = _make_conversation()
        mock_session.execute.side_effect = [
            _scalar_one_result(conv),  # get_conversation_admin
            MagicMock(),  # update last_message_at
        ]

        async def _flush():
            for call in mock_session.add.call_args_list:
                obj = call[0][0]
                if hasattr(obj, "id") and obj.id is None:
                    obj.id = uuid.uuid4()
                created = getattr(obj, "created_at", None)
                if created is None:
                    obj.created_at = datetime.now(UTC)
                updated = getattr(obj, "updated_at", None)
                if updated is None:
                    obj.updated_at = datetime.now(UTC)

        mock_session.flush = AsyncMock(side_effect=_flush)

        resp = await admin_client.post(
            f"{ADMIN_PREFIX}/conversations/{CONV_ID}/messages",
            json={"content": "Admin reply here"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["content"] == "Admin reply here"
        # Audit log entry was added
        assert mock_session.add.call_count >= 2  # message + audit

    async def test_conversation_not_found(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.return_value = _scalar_one_result(None)

        resp = await admin_client.post(
            f"{ADMIN_PREFIX}/conversations/{CONV_ID}/messages",
            json={"content": "Hello"},
        )

        assert resp.status_code == 404


# -- PATCH /api/v1/admin/conversations/{conv_id} ----------------------------


class TestAdminUpdateStatus:
    """PATCH /api/v1/admin/conversations/{conv_id}"""

    async def test_resolves_conversation(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        conv = _make_conversation()
        mock_session.execute.side_effect = [
            _scalar_one_result(conv),  # get_conversation_admin
            MagicMock(),  # update status
        ]

        resp = await admin_client.patch(
            f"{ADMIN_PREFIX}/conversations/{CONV_ID}",
            json={"status": "resolved"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["status"] == "resolved"

    async def test_archives_conversation(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        conv = _make_conversation()
        mock_session.execute.side_effect = [
            _scalar_one_result(conv),
            MagicMock(),
        ]

        resp = await admin_client.patch(
            f"{ADMIN_PREFIX}/conversations/{CONV_ID}",
            json={"status": "archived"},
        )

        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "archived"

    async def test_rejects_open_status(self, admin_client: AsyncClient) -> None:
        """Cannot reopen a conversation — schema validator rejects it."""
        resp = await admin_client.patch(
            f"{ADMIN_PREFIX}/conversations/{CONV_ID}",
            json={"status": "open"},
        )
        assert resp.status_code == 422

    async def test_conversation_not_found(
        self, admin_client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.return_value = _scalar_one_result(None)

        resp = await admin_client.patch(
            f"{ADMIN_PREFIX}/conversations/{CONV_ID}",
            json={"status": "resolved"},
        )

        assert resp.status_code == 404

    async def test_non_admin_rejected(self, non_admin_client: AsyncClient) -> None:
        resp = await non_admin_client.patch(
            f"{ADMIN_PREFIX}/conversations/{CONV_ID}",
            json={"status": "resolved"},
        )
        assert resp.status_code == 403
