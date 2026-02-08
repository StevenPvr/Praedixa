"""Tests for app.services.admin_audit — admin audit log service."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.models.admin import AdminAuditAction, AdminAuditLog
from app.services.admin_audit import (
    _extract_ip,
    _extract_request_id,
    _extract_user_agent,
    get_audit_log,
    log_admin_action,
)
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


def _make_request(
    ip: str = "10.0.0.1",
    forwarded_for: str | None = None,
    user_agent: str = "TestAgent/1.0",
    request_id: str | None = "req-123",
):
    """Create a mock Request object."""
    headers = {"User-Agent": user_agent}
    if forwarded_for:
        headers["X-Forwarded-For"] = forwarded_for
    if request_id:
        headers["X-Request-ID"] = request_id
    mock = MagicMock()
    mock.headers = headers
    mock.client = SimpleNamespace(host=ip)
    return mock


class TestExtractIp:
    """Tests for _extract_ip()."""

    def test_uses_client_host_when_no_forwarded(self):
        req = _make_request(ip="192.168.1.1")
        assert _extract_ip(req) == "192.168.1.1"

    def test_prefers_x_forwarded_for(self):
        req = _make_request(ip="10.0.0.1", forwarded_for="1.2.3.4, 10.0.0.2")
        assert _extract_ip(req) == "1.2.3.4"

    def test_truncates_long_ip(self):
        long_ip = "a" * 100
        req = _make_request(forwarded_for=long_ip)
        assert len(_extract_ip(req)) <= 45

    def test_no_client_returns_unknown(self):
        req = MagicMock()
        req.headers = {}
        req.client = None
        assert _extract_ip(req) == "unknown"


class TestExtractUserAgent:
    """Tests for _extract_user_agent()."""

    def test_returns_user_agent(self):
        req = _make_request(user_agent="Mozilla/5.0")
        assert _extract_user_agent(req) == "Mozilla/5.0"

    def test_truncates_long_user_agent(self):
        long_ua = "A" * 300
        req = _make_request(user_agent=long_ua)
        assert len(_extract_user_agent(req)) == 200

    def test_missing_user_agent_returns_empty(self):
        req = MagicMock()
        req.headers = {}
        assert _extract_user_agent(req) == ""


class TestExtractRequestId:
    """Tests for _extract_request_id()."""

    def test_valid_request_id(self):
        req = _make_request(request_id="abc-123")
        assert _extract_request_id(req) == "abc-123"

    def test_missing_request_id_generates_uuid(self):
        req = _make_request(request_id=None)
        rid = _extract_request_id(req)
        # Should be a valid UUID4
        uuid.UUID(rid)

    def test_too_long_request_id_generates_uuid(self):
        req = _make_request(request_id="x" * 100)
        rid = _extract_request_id(req)
        uuid.UUID(rid)

    def test_non_ascii_request_id_generates_uuid(self):
        req = MagicMock()
        req.headers = {"X-Request-ID": "\u00e9\u00e0"}
        rid = _extract_request_id(req)
        uuid.UUID(rid)


class TestLogAdminAction:
    """Tests for log_admin_action()."""

    @pytest.mark.asyncio
    async def test_inserts_audit_entry(self):
        session = make_mock_session()
        req = _make_request()
        admin_id = str(uuid.uuid4())

        await log_admin_action(
            session,
            admin_user_id=admin_id,
            action=AdminAuditAction.VIEW_ORG,
            request=req,
        )

        session.add.assert_called_once()
        session.flush.assert_awaited_once()
        entry = session.add.call_args[0][0]
        assert isinstance(entry, AdminAuditLog)
        assert entry.action == AdminAuditAction.VIEW_ORG
        assert str(entry.admin_user_id) == admin_id

    @pytest.mark.asyncio
    async def test_sets_target_org_id(self):
        session = make_mock_session()
        req = _make_request()
        org_id = str(uuid.uuid4())

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.UPDATE_ORG,
            request=req,
            target_org_id=org_id,
        )

        entry = session.add.call_args[0][0]
        assert str(entry.target_org_id) == org_id

    @pytest.mark.asyncio
    async def test_null_target_org_id(self):
        session = make_mock_session()
        req = _make_request()

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_MONITORING,
            request=req,
        )

        entry = session.add.call_args[0][0]
        assert entry.target_org_id is None

    @pytest.mark.asyncio
    async def test_invalid_severity_defaults_to_info(self):
        session = make_mock_session()
        req = _make_request()

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=req,
            severity="INVALID",
        )

        entry = session.add.call_args[0][0]
        assert entry.severity == "INFO"

    @pytest.mark.asyncio
    async def test_valid_severity_preserved(self):
        session = make_mock_session()
        req = _make_request()

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.CHURN_ORG,
            request=req,
            severity="CRITICAL",
        )

        entry = session.add.call_args[0][0]
        assert entry.severity == "CRITICAL"

    @pytest.mark.asyncio
    async def test_resource_type_truncated(self):
        session = make_mock_session()
        req = _make_request()

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=req,
            resource_type="A" * 200,
        )

        entry = session.add.call_args[0][0]
        assert len(entry.resource_type) <= 100

    @pytest.mark.asyncio
    async def test_metadata_stored(self):
        session = make_mock_session()
        req = _make_request()
        meta = {"key": "value"}

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=req,
            metadata=meta,
        )

        entry = session.add.call_args[0][0]
        assert entry.metadata_json == meta

    @pytest.mark.asyncio
    async def test_metadata_defaults_to_empty_dict(self):
        session = make_mock_session()
        req = _make_request()

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=req,
        )

        entry = session.add.call_args[0][0]
        assert entry.metadata_json == {}


class TestGetAuditLog:
    """Tests for get_audit_log()."""

    @pytest.mark.asyncio
    async def test_basic_query(self):
        items = [SimpleNamespace(id=uuid.uuid4())]
        session = make_mock_session(
            make_scalar_result(1),  # count
            make_scalars_result(items),  # items
        )

        result_items, total = await get_audit_log(session)
        assert total == 1
        assert len(result_items) == 1

    @pytest.mark.asyncio
    async def test_pagination(self):
        session = make_mock_session(
            make_scalar_result(50),  # count
            make_scalars_result([]),  # items
        )

        _, total = await get_audit_log(session, page=3, page_size=10)
        assert total == 50

    @pytest.mark.asyncio
    async def test_filter_by_admin_user_id(self):
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        admin_id = str(uuid.uuid4())
        _, total = await get_audit_log(session, admin_user_id=admin_id)
        assert total == 0

    @pytest.mark.asyncio
    async def test_filter_by_target_org(self):
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        org_id = str(uuid.uuid4())
        _, total = await get_audit_log(session, target_org_id=org_id)
        assert total == 0

    @pytest.mark.asyncio
    async def test_filter_by_action(self):
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        _, total = await get_audit_log(session, action="view_org")
        assert total == 0

    @pytest.mark.asyncio
    async def test_invalid_action_filter_ignored(self):
        session = make_mock_session(
            make_scalar_result(5),
            make_scalars_result([]),
        )

        _, total = await get_audit_log(session, action="invalid_action")
        # Invalid action is not applied as filter, returns all
        assert total == 5

    @pytest.mark.asyncio
    async def test_date_range_filter(self):
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        now = datetime.now(UTC)
        _, total = await get_audit_log(session, date_from=now, date_to=now)
        assert total == 0
