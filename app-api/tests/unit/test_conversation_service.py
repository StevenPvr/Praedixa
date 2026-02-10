"""Unit tests for conversation_service — 100% coverage.

Tests all service functions with mocked database sessions.
Uses SimpleNamespace for ORM mocks (Pydantic model_validate compatibility).
"""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.models.conversation import (
    ConversationInitiator,
    ConversationStatus,
)
from app.services.conversation_service import (
    _sanitize_content,
    create_conversation,
    create_message,
    get_conversation,
    get_conversation_admin,
    get_unread_count,
    get_unread_count_by_org,
    list_conversations,
    list_conversations_admin,
    list_messages,
    list_messages_admin,
    update_conversation_status,
)

# -- Test identifiers ----------------------------------------------------------
ORG_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "22222222-2222-2222-2222-222222222222"
CONV_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")
MSG_ID = uuid.UUID("44444444-4444-4444-4444-444444444444")


# -- Helpers -------------------------------------------------------------------


def _make_tenant(org_id: str = ORG_ID) -> TenantFilter:
    tenant = MagicMock(spec=TenantFilter)
    tenant.organization_id = org_id
    tenant.apply = MagicMock(side_effect=lambda q, *a, **kw: q)
    return tenant


def _make_conversation(**overrides) -> SimpleNamespace:
    now = datetime.now(UTC)
    defaults = {
        "id": CONV_ID,
        "organization_id": uuid.UUID(ORG_ID),
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
        "sender_user_id": uuid.UUID(USER_ID),
        "sender_role": "org_admin",
        "content": "Hello",
        "is_read": False,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


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


def _make_session(*execute_results):
    session = AsyncMock()
    if execute_results:
        session.execute.side_effect = list(execute_results)
    else:
        session.execute.return_value = _scalar_one_result(None)
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    return session


# -- Sanitize content tests ----------------------------------------------------


class TestSanitizeContent:
    """Tests for _sanitize_content helper."""

    def test_strips_html_tags(self) -> None:
        result = _sanitize_content("<b>Hello</b> <script>alert(1)</script>World")
        assert result == "Hello alert(1)World"

    def test_truncates_long_content(self) -> None:
        long = "a" * 6000
        result = _sanitize_content(long)
        assert len(result) == 5000

    def test_preserves_normal_text(self) -> None:
        result = _sanitize_content("Hello, World!")
        assert result == "Hello, World!"

    def test_empty_string(self) -> None:
        result = _sanitize_content("")
        assert result == ""


# -- list_conversations tests --------------------------------------------------


class TestListConversations:
    """Tests for list_conversations (tenant-scoped)."""

    async def test_returns_conversations_and_total(self) -> None:
        convs = [_make_conversation(), _make_conversation(id=uuid.uuid4())]
        session = _make_session(
            _scalar_one_result(2),  # count
            _scalars_all_result(convs),  # items
        )
        tenant = _make_tenant()

        items, total = await list_conversations(session, tenant)

        assert total == 2
        assert len(items) == 2
        assert tenant.apply.called

    async def test_with_status_filter(self) -> None:
        session = _make_session(
            _scalar_one_result(1),
            _scalars_all_result([_make_conversation()]),
        )
        tenant = _make_tenant()

        items, total = await list_conversations(
            session, tenant, status_filter=ConversationStatus.OPEN
        )

        assert total == 1
        assert len(items) == 1

    async def test_empty_result(self) -> None:
        session = _make_session(
            _scalar_one_result(0),
            _scalars_all_result([]),
        )
        tenant = _make_tenant()

        items, total = await list_conversations(session, tenant)

        assert total == 0
        assert items == []

    async def test_pagination_params(self) -> None:
        session = _make_session(
            _scalar_one_result(50),
            _scalars_all_result([_make_conversation()]),
        )
        tenant = _make_tenant()

        items, total = await list_conversations(session, tenant, page=3, page_size=10)

        assert total == 50
        assert len(items) == 1


# -- list_conversations_admin tests --------------------------------------------


class TestListConversationsAdmin:
    """Tests for list_conversations_admin (cross-org)."""

    async def test_returns_all_conversations(self) -> None:
        convs = [_make_conversation()]
        session = _make_session(
            _scalar_one_result(1),
            _scalars_all_result(convs),
        )

        items, total = await list_conversations_admin(session)

        assert total == 1
        assert len(items) == 1

    async def test_with_status_filter(self) -> None:
        session = _make_session(
            _scalar_one_result(0),
            _scalars_all_result([]),
        )

        items, total = await list_conversations_admin(
            session, status_filter=ConversationStatus.RESOLVED
        )

        assert total == 0
        assert items == []

    async def test_with_org_id_filter(self) -> None:
        org_uuid = uuid.UUID(ORG_ID)
        session = _make_session(
            _scalar_one_result(1),
            _scalars_all_result([_make_conversation()]),
        )

        items, total = await list_conversations_admin(session, org_id_filter=org_uuid)

        assert total == 1
        assert len(items) == 1

    async def test_combined_filters(self) -> None:
        org_uuid = uuid.UUID(ORG_ID)
        session = _make_session(
            _scalar_one_result(0),
            _scalars_all_result([]),
        )

        items, total = await list_conversations_admin(
            session,
            status_filter=ConversationStatus.ARCHIVED,
            org_id_filter=org_uuid,
            page=2,
            page_size=5,
        )

        assert total == 0
        assert items == []


# -- get_conversation tests ----------------------------------------------------


class TestGetConversation:
    """Tests for get_conversation (tenant-scoped)."""

    async def test_returns_conversation(self) -> None:
        conv = _make_conversation()
        session = _make_session(_scalar_one_result(conv))
        tenant = _make_tenant()

        result = await get_conversation(session, CONV_ID, tenant)

        assert result.id == CONV_ID

    async def test_not_found_raises(self) -> None:
        session = _make_session(_scalar_one_result(None))
        tenant = _make_tenant()

        with pytest.raises(NotFoundError):
            await get_conversation(session, CONV_ID, tenant)


# -- get_conversation_admin tests ----------------------------------------------


class TestGetConversationAdmin:
    """Tests for get_conversation_admin (no tenant filter)."""

    async def test_returns_conversation(self) -> None:
        conv = _make_conversation()
        session = _make_session(_scalar_one_result(conv))

        result = await get_conversation_admin(session, CONV_ID)

        assert result.id == CONV_ID

    async def test_not_found_raises(self) -> None:
        session = _make_session(_scalar_one_result(None))

        with pytest.raises(NotFoundError):
            await get_conversation_admin(session, CONV_ID)


# -- create_conversation tests -------------------------------------------------


class TestCreateConversation:
    """Tests for create_conversation."""

    async def test_creates_conversation_and_message(self) -> None:
        session = AsyncMock()
        session.add = MagicMock()

        # flush auto-assigns id
        async def _flush():
            for call in session.add.call_args_list:
                obj = call[0][0]
                if not hasattr(obj, "id") or obj.id is None:
                    obj.id = uuid.uuid4()

        session.flush = AsyncMock(side_effect=_flush)

        result = await create_conversation(
            session,
            org_id=ORG_ID,
            subject="Test",
            initiated_by=ConversationInitiator.CLIENT,
            sender_user_id=USER_ID,
            sender_role="org_admin",
            first_message_content="Hello",
        )

        assert result.subject == "Test"
        assert result.status == ConversationStatus.OPEN
        assert result.initiated_by == ConversationInitiator.CLIENT
        assert session.add.call_count == 2  # conversation + message
        assert session.flush.call_count == 2

    async def test_creates_conversation_without_message(self) -> None:
        """When first_message_content is None, only the conversation is created."""
        session = AsyncMock()
        session.add = MagicMock()

        async def _flush():
            for call in session.add.call_args_list:
                obj = call[0][0]
                if not hasattr(obj, "id") or obj.id is None:
                    obj.id = uuid.uuid4()

        session.flush = AsyncMock(side_effect=_flush)

        result = await create_conversation(
            session,
            org_id=ORG_ID,
            subject="No message",
            initiated_by=ConversationInitiator.CLIENT,
            sender_user_id=USER_ID,
            sender_role="org_admin",
        )

        assert result.subject == "No message"
        assert result.last_message_at is None
        assert session.add.call_count == 1  # only conversation, no message
        assert session.flush.call_count == 1

    async def test_sanitizes_html_in_content(self) -> None:
        session = AsyncMock()
        session.add = MagicMock()

        async def _flush():
            for call in session.add.call_args_list:
                obj = call[0][0]
                if not hasattr(obj, "id") or obj.id is None:
                    obj.id = uuid.uuid4()

        session.flush = AsyncMock(side_effect=_flush)

        await create_conversation(
            session,
            org_id=ORG_ID,
            subject="Test",
            initiated_by=ConversationInitiator.CLIENT,
            sender_user_id=USER_ID,
            sender_role="org_admin",
            first_message_content="<script>alert(1)</script>Hello",
        )

        # The second add call is the message
        msg = session.add.call_args_list[1][0][0]
        assert "<script>" not in msg.content
        assert "Hello" in msg.content


# -- list_messages tests -------------------------------------------------------


class TestListMessages:
    """Tests for list_messages (tenant-scoped)."""

    async def test_returns_messages_and_total(self) -> None:
        conv = _make_conversation()
        msgs = [_make_message(), _make_message(id=uuid.uuid4())]
        session = _make_session(
            _scalar_one_result(conv),  # get_conversation
            _scalar_one_result(2),  # count
            _scalars_all_result(msgs),  # items
        )
        tenant = _make_tenant()

        items, total = await list_messages(session, CONV_ID, tenant)

        assert total == 2
        assert len(items) == 2

    async def test_conversation_not_found(self) -> None:
        session = _make_session(_scalar_one_result(None))
        tenant = _make_tenant()

        with pytest.raises(NotFoundError):
            await list_messages(session, CONV_ID, tenant)

    async def test_pagination(self) -> None:
        conv = _make_conversation()
        session = _make_session(
            _scalar_one_result(conv),
            _scalar_one_result(100),
            _scalars_all_result([_make_message()]),
        )
        tenant = _make_tenant()

        items, total = await list_messages(
            session, CONV_ID, tenant, page=5, page_size=10
        )

        assert total == 100
        assert len(items) == 1


# -- list_messages_admin tests -------------------------------------------------


class TestListMessagesAdmin:
    """Tests for list_messages_admin (no tenant filter)."""

    async def test_returns_messages(self) -> None:
        conv = _make_conversation()
        msgs = [_make_message()]
        session = _make_session(
            _scalar_one_result(conv),
            _scalar_one_result(1),
            _scalars_all_result(msgs),
        )

        items, total = await list_messages_admin(session, CONV_ID)

        assert total == 1
        assert len(items) == 1

    async def test_conversation_not_found(self) -> None:
        session = _make_session(_scalar_one_result(None))

        with pytest.raises(NotFoundError):
            await list_messages_admin(session, CONV_ID)


# -- create_message tests -----------------------------------------------------


class TestCreateMessage:
    """Tests for create_message."""

    async def test_creates_message_with_tenant(self) -> None:
        conv = _make_conversation()
        session = _make_session(
            _scalar_one_result(conv),  # get_conversation
        )
        # After the side_effect list is exhausted, remaining calls return default
        session.execute = AsyncMock(
            side_effect=[
                _scalar_one_result(conv),  # get_conversation
                MagicMock(),  # update last_message_at
            ]
        )
        session.add = MagicMock()
        session.flush = AsyncMock()
        tenant = _make_tenant()

        msg = await create_message(
            session,
            CONV_ID,
            sender_user_id=USER_ID,
            sender_role="org_admin",
            content="Hello",
            tenant=tenant,
        )

        assert msg.content == "Hello"
        session.add.assert_called_once()
        session.flush.assert_called_once()

    async def test_creates_message_without_tenant_admin_path(self) -> None:
        conv = _make_conversation()
        session = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                _scalar_one_result(conv),  # get_conversation_admin
                MagicMock(),  # update last_message_at
            ]
        )
        session.add = MagicMock()
        session.flush = AsyncMock()

        msg = await create_message(
            session,
            CONV_ID,
            sender_user_id=USER_ID,
            sender_role="super_admin",
            content="Admin reply",
            tenant=None,
        )

        assert msg.content == "Admin reply"
        assert msg.sender_role == "super_admin"

    async def test_sanitizes_content(self) -> None:
        conv = _make_conversation()
        session = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                _scalar_one_result(conv),
                MagicMock(),
            ]
        )
        session.add = MagicMock()
        session.flush = AsyncMock()
        tenant = _make_tenant()

        msg = await create_message(
            session,
            CONV_ID,
            sender_user_id=USER_ID,
            sender_role="org_admin",
            content="<b>Bold</b>",
            tenant=tenant,
        )

        assert "<b>" not in msg.content
        assert "Bold" in msg.content

    async def test_conversation_not_found_raises(self) -> None:
        session = _make_session(_scalar_one_result(None))
        tenant = _make_tenant()

        with pytest.raises(NotFoundError):
            await create_message(
                session,
                CONV_ID,
                sender_user_id=USER_ID,
                sender_role="org_admin",
                content="Hello",
                tenant=tenant,
            )


# -- update_conversation_status tests ------------------------------------------


class TestUpdateConversationStatus:
    """Tests for update_conversation_status."""

    async def test_updates_with_tenant(self) -> None:
        conv = _make_conversation()
        session = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                _scalar_one_result(conv),  # get_conversation
                MagicMock(),  # update
            ]
        )
        session.flush = AsyncMock()
        tenant = _make_tenant()

        result = await update_conversation_status(
            session,
            CONV_ID,
            ConversationStatus.RESOLVED,
            tenant=tenant,
        )

        assert result.status == ConversationStatus.RESOLVED

    async def test_updates_without_tenant_admin(self) -> None:
        conv = _make_conversation()
        session = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                _scalar_one_result(conv),
                MagicMock(),
            ]
        )
        session.flush = AsyncMock()

        result = await update_conversation_status(
            session,
            CONV_ID,
            ConversationStatus.ARCHIVED,
            tenant=None,
        )

        assert result.status == ConversationStatus.ARCHIVED

    async def test_not_found_raises(self) -> None:
        session = _make_session(_scalar_one_result(None))
        tenant = _make_tenant()

        with pytest.raises(NotFoundError):
            await update_conversation_status(
                session,
                CONV_ID,
                ConversationStatus.RESOLVED,
                tenant=tenant,
            )


# -- get_unread_count tests ----------------------------------------------------


class TestGetUnreadCount:
    """Tests for get_unread_count."""

    async def test_returns_count_with_tenant(self) -> None:
        session = _make_session(_scalar_one_result(5))
        tenant = _make_tenant()

        count = await get_unread_count(session, tenant=tenant)

        assert count == 5

    async def test_returns_count_without_tenant_admin(self) -> None:
        session = _make_session(_scalar_one_result(42))

        count = await get_unread_count(session, tenant=None)

        assert count == 42

    async def test_returns_zero_on_null(self) -> None:
        session = _make_session(_scalar_one_result(0))
        tenant = _make_tenant()

        count = await get_unread_count(session, tenant=tenant)

        assert count == 0


# -- get_unread_count_by_org tests --------------------------------------------


class TestGetUnreadCountByOrg:
    """Tests for get_unread_count_by_org (admin per-org breakdown)."""

    async def test_returns_total_and_by_org(self) -> None:
        org_id = uuid.UUID(ORG_ID)
        by_org_row = SimpleNamespace(organization_id=org_id, org_name="Acme", cnt=5)
        by_org_result = MagicMock()
        by_org_result.all.return_value = [by_org_row]

        session = _make_session(
            _scalar_one_result(5),  # total count
        )
        # Override to return both results in sequence
        session.execute = AsyncMock(
            side_effect=[
                _scalar_one_result(5),
                by_org_result,
            ]
        )

        result = await get_unread_count_by_org(session)

        assert result["total"] == 5
        assert len(result["by_org"]) == 1
        assert result["by_org"][0]["org_id"] == str(org_id)
        assert result["by_org"][0]["org_name"] == "Acme"
        assert result["by_org"][0]["count"] == 5

    async def test_returns_empty_by_org_when_zero(self) -> None:
        by_org_result = MagicMock()
        by_org_result.all.return_value = []

        session = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                _scalar_one_result(0),
                by_org_result,
            ]
        )

        result = await get_unread_count_by_org(session)

        assert result["total"] == 0
        assert result["by_org"] == []

    async def test_multiple_orgs(self) -> None:
        org_a = uuid.uuid4()
        org_b = uuid.uuid4()
        rows = [
            SimpleNamespace(organization_id=org_a, org_name="Acme", cnt=10),
            SimpleNamespace(organization_id=org_b, org_name="Beta", cnt=3),
        ]
        by_org_result = MagicMock()
        by_org_result.all.return_value = rows

        session = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                _scalar_one_result(13),
                by_org_result,
            ]
        )

        result = await get_unread_count_by_org(session)

        assert result["total"] == 13
        assert len(result["by_org"]) == 2
        assert result["by_org"][0]["count"] == 10
        assert result["by_org"][1]["count"] == 3
