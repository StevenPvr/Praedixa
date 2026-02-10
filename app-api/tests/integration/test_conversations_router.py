"""Integration tests for the conversations (webapp) router — 100% coverage.

Tests all endpoints:
- GET /api/v1/conversations
- POST /api/v1/conversations
- GET /api/v1/conversations/unread-count
- GET /api/v1/conversations/{conv_id}/messages
- POST /api/v1/conversations/{conv_id}/messages

Strategy:
- Override get_current_user, get_db_session, get_tenant_filter via
  FastAPI dependency_overrides.
- Mock session.execute to return controlled results.
- Use SimpleNamespace for ORM mocks (Pydantic model_validate compatibility).
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.main import app
from app.models.conversation import ConversationInitiator, ConversationStatus

# -- Fixed test identifiers ---------------------------------------------------
ORG_A_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
USER_A_ID = "11111111-aaaa-bbbb-cccc-000000000001"
CONV_ID = uuid.UUID("cccccccc-1111-1111-1111-111111111111")
MSG_ID = uuid.UUID("dddddddd-1111-1111-1111-111111111111")
PREFIX = "/api/v1/conversations"


def _make_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=USER_A_ID,
        email="user@test.com",
        organization_id=str(ORG_A_ID),
        role="org_admin",
    )


def _make_viewer_jwt() -> JWTPayload:
    return JWTPayload(
        user_id=USER_A_ID,
        email="viewer@test.com",
        organization_id=str(ORG_A_ID),
        role="viewer",
    )


def _make_tenant() -> TenantFilter:
    tf = MagicMock(spec=TenantFilter)
    tf.organization_id = str(ORG_A_ID)
    tf.apply = MagicMock(side_effect=lambda q, *a, **kw: q)
    return tf


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
        "organization_id": ORG_A_ID,
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
        "sender_user_id": uuid.UUID(USER_A_ID),
        "sender_role": "org_admin",
        "content": "Hello",
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
async def client(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = _make_jwt
    app.dependency_overrides[get_tenant_filter] = _make_tenant

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def viewer_client(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """Client with viewer role — should be rejected from conversations."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = _make_viewer_jwt
    app.dependency_overrides[get_tenant_filter] = _make_tenant

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# -- GET /api/v1/conversations ------------------------------------------------


class TestListConversations:
    """GET /api/v1/conversations"""

    async def test_returns_paginated_conversations(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        convs = [_make_conversation(), _make_conversation(id=uuid.uuid4())]
        mock_session.execute.side_effect = [
            _scalar_one_result(2),
            _scalars_all_result(convs),
        ]

        resp = await client.get(PREFIX)

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 2
        assert body["pagination"]["total"] == 2

    async def test_with_status_filter(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _scalars_all_result([]),
        ]

        resp = await client.get(PREFIX, params={"status": "resolved"})

        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_empty_list(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.side_effect = [
            _scalar_one_result(0),
            _scalars_all_result([]),
        ]

        resp = await client.get(PREFIX)

        assert resp.status_code == 200
        assert resp.json()["pagination"]["total"] == 0

    async def test_viewer_role_rejected(self, viewer_client: AsyncClient) -> None:
        resp = await viewer_client.get(PREFIX)
        assert resp.status_code == 403


# -- POST /api/v1/conversations -----------------------------------------------


class TestCreateConversation:
    """POST /api/v1/conversations"""

    async def test_creates_conversation(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        # flush auto-assigns IDs
        async def _flush():
            for call in mock_session.add.call_args_list:
                obj = call[0][0]
                if not hasattr(obj, "id") or obj.id is None:
                    obj.id = uuid.uuid4()
                if hasattr(obj, "created_at") and obj.created_at is None:
                    obj.created_at = datetime.now(UTC)
                if hasattr(obj, "updated_at") and obj.updated_at is None:
                    obj.updated_at = datetime.now(UTC)

        mock_session.flush = AsyncMock(side_effect=_flush)

        resp = await client.post(
            PREFIX,
            json={"subject": "New ticket", "content": "I need help"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["subject"] == "New ticket"
        assert body["data"]["status"] == "open"
        assert body["data"]["initiatedBy"] == "client"

    async def test_rejects_empty_subject(self, client: AsyncClient) -> None:
        resp = await client.post(
            PREFIX,
            json={"subject": "", "content": "Hello"},
        )
        assert resp.status_code == 422

    async def test_creates_conversation_without_content(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        """Content is optional — conversation can be created with subject only."""

        async def _flush():
            for call in mock_session.add.call_args_list:
                obj = call[0][0]
                if not hasattr(obj, "id") or obj.id is None:
                    obj.id = uuid.uuid4()
                if hasattr(obj, "created_at") and obj.created_at is None:
                    obj.created_at = datetime.now(UTC)
                if hasattr(obj, "updated_at") and obj.updated_at is None:
                    obj.updated_at = datetime.now(UTC)

        mock_session.flush = AsyncMock(side_effect=_flush)

        resp = await client.post(
            PREFIX,
            json={"subject": "Hello"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["subject"] == "Hello"
        # Only conversation added, no message
        assert mock_session.add.call_count == 1

    async def test_rejects_extra_fields(self, client: AsyncClient) -> None:
        resp = await client.post(
            PREFIX,
            json={
                "subject": "Ticket",
                "content": "Hello",
                "organizationId": "injected",
            },
        )
        assert resp.status_code == 422

    async def test_viewer_role_rejected(self, viewer_client: AsyncClient) -> None:
        resp = await viewer_client.post(
            PREFIX,
            json={"subject": "Ticket", "content": "Hello"},
        )
        assert resp.status_code == 403


# -- GET /api/v1/conversations/unread-count -----------------------------------


class TestUnreadCount:
    """GET /api/v1/conversations/unread-count"""

    async def test_returns_unread_count(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.return_value = _scalar_one_result(5)

        resp = await client.get(f"{PREFIX}/unread-count")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["unreadCount"] == 5

    async def test_returns_zero(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.return_value = _scalar_one_result(0)

        resp = await client.get(f"{PREFIX}/unread-count")

        assert resp.status_code == 200
        assert resp.json()["data"]["unreadCount"] == 0


# -- GET /api/v1/conversations/{conv_id}/messages ----------------------------


class TestListMessages:
    """GET /api/v1/conversations/{conv_id}/messages"""

    async def test_returns_messages(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        conv = _make_conversation()
        msgs = [_make_message()]
        mock_session.execute.side_effect = [
            _scalar_one_result(conv),  # get_conversation
            _scalar_one_result(1),  # count
            _scalars_all_result(msgs),  # items
        ]

        resp = await client.get(f"{PREFIX}/{CONV_ID}/messages")

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) == 1
        assert body["pagination"]["total"] == 1

    async def test_conversation_not_found(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.return_value = _scalar_one_result(None)

        resp = await client.get(f"{PREFIX}/{CONV_ID}/messages")

        assert resp.status_code == 404


# -- POST /api/v1/conversations/{conv_id}/messages ---------------------------


class TestSendMessage:
    """POST /api/v1/conversations/{conv_id}/messages"""

    async def test_sends_message(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        conv = _make_conversation()
        mock_session.execute.side_effect = [
            _scalar_one_result(conv),  # get_conversation
            MagicMock(),  # update last_message_at
        ]

        async def _flush():
            for call in mock_session.add.call_args_list:
                obj = call[0][0]
                if not hasattr(obj, "id") or obj.id is None:
                    obj.id = uuid.uuid4()
                if hasattr(obj, "created_at") and obj.created_at is None:
                    obj.created_at = datetime.now(UTC)
                if hasattr(obj, "updated_at") and obj.updated_at is None:
                    obj.updated_at = datetime.now(UTC)

        mock_session.flush = AsyncMock(side_effect=_flush)

        resp = await client.post(
            f"{PREFIX}/{CONV_ID}/messages",
            json={"content": "Hello from client"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["content"] == "Hello from client"

    async def test_conversation_not_found(
        self, client: AsyncClient, mock_session: AsyncMock
    ) -> None:
        mock_session.execute.return_value = _scalar_one_result(None)

        resp = await client.post(
            f"{PREFIX}/{CONV_ID}/messages",
            json={"content": "Hello"},
        )

        assert resp.status_code == 404

    async def test_rejects_empty_content(self, client: AsyncClient) -> None:
        resp = await client.post(
            f"{PREFIX}/{CONV_ID}/messages",
            json={"content": ""},
        )
        assert resp.status_code == 422

    async def test_rejects_extra_fields(self, client: AsyncClient) -> None:
        resp = await client.post(
            f"{PREFIX}/{CONV_ID}/messages",
            json={"content": "Hello", "senderUserId": "injected"},
        )
        assert resp.status_code == 422
