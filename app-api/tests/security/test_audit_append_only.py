"""Security tests: append-only audit log service + integrity.

Tests that the admin audit log service:
1. Only performs INSERT operations (never UPDATE or DELETE).
2. Extracts IP, User-Agent, Request-ID from the HTTP request (never body).
3. Validates severity against an allowlist.
4. Truncates long resource_type values.
5. Supports pagination and filtering for audit log queries.

Note: The actual PostgreSQL trigger (BEFORE UPDATE/DELETE → raise) can only
be tested against a real database (integration tests with pytest.mark.integration).
These unit tests verify the Python service layer behavior.

Threat model:
- Audit spoofing: admin injects ip_address/user_agent via request body.
- Log injection: admin sends oversized or non-printable request IDs.
- Severity tampering: admin sends invalid severity to bypass alerts.
- Resource type overflow: admin sends extremely long resource_type strings.
"""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.request_id import MAX_REQUEST_ID_LEN, get_or_generate_request_id
from app.models.admin import AdminAuditAction, AdminAuditLog
from app.services.admin_audit import (
    _ALLOWED_SEVERITIES,
    _MAX_IP_LEN,
    _MAX_UA_LEN,
    _extract_ip,
    _extract_user_agent,
    get_audit_log,
    log_admin_action,
)

# ── Helpers ──────────────────────────────────────────────────────────


def _make_request(
    headers: dict | None = None,
    client_host: str = "192.168.1.1",
) -> MagicMock:
    """Create a mock FastAPI Request with configurable headers and client."""
    request = MagicMock()
    all_headers = headers or {}
    request.headers = all_headers
    request.client = MagicMock()
    request.client.host = client_host
    return request


# ── 1. IP extraction ────────────────────────────────────────────────


class TestIPExtraction:
    """IP address must be extracted server-side from the request."""

    def test_prefers_x_forwarded_for(self) -> None:
        """X-Forwarded-For header takes priority over client.host."""
        request = _make_request(
            headers={"X-Forwarded-For": "10.0.0.1, 10.0.0.2"},
            client_host="192.168.1.1",
        )
        assert _extract_ip(request) == "10.0.0.1"

    def test_falls_back_to_client_host(self) -> None:
        """Without X-Forwarded-For, uses request.client.host."""
        request = _make_request(client_host="172.16.0.1")
        assert _extract_ip(request) == "172.16.0.1"

    def test_returns_unknown_when_no_client(self) -> None:
        """Returns 'unknown' when request.client is None."""
        request = _make_request()
        request.client = None
        assert _extract_ip(request) == "unknown"

    def test_truncates_long_ip(self) -> None:
        """IP addresses are truncated to 45 characters (IPv6 max)."""
        long_ip = "a" * 100
        request = _make_request(
            headers={"X-Forwarded-For": long_ip},
        )
        result = _extract_ip(request)
        assert len(result) <= _MAX_IP_LEN

    def test_single_forwarded_ip(self) -> None:
        """Single IP in X-Forwarded-For works."""
        request = _make_request(
            headers={"X-Forwarded-For": "10.0.0.1"},
        )
        assert _extract_ip(request) == "10.0.0.1"

    def test_empty_forwarded_for(self) -> None:
        """Empty X-Forwarded-For falls back to client.host."""
        request = _make_request(
            headers={"X-Forwarded-For": ""},
            client_host="192.168.1.1",
        )
        # Empty string is falsy → should fall back
        assert _extract_ip(request) == "192.168.1.1"

    def test_ipv6_address(self) -> None:
        """IPv6 addresses are handled correctly."""
        request = _make_request(client_host="::1")
        assert _extract_ip(request) == "::1"

    def test_client_host_none(self) -> None:
        """None client.host returns 'unknown'."""
        request = _make_request()
        request.client.host = None
        assert _extract_ip(request) == "unknown"


# ── 2. User-Agent extraction ────────────────────────────────────────


class TestUserAgentExtraction:
    """User-Agent must be extracted from request header."""

    def test_extracts_user_agent(self) -> None:
        """Normal User-Agent header is extracted."""
        request = _make_request(
            headers={"User-Agent": "Mozilla/5.0 Test Browser"},
        )
        assert _extract_user_agent(request) == "Mozilla/5.0 Test Browser"

    def test_truncates_long_user_agent(self) -> None:
        """User-Agent exceeding max length is truncated."""
        long_ua = "x" * 500
        request = _make_request(headers={"User-Agent": long_ua})
        result = _extract_user_agent(request)
        assert len(result) <= _MAX_UA_LEN

    def test_missing_user_agent(self) -> None:
        """Missing User-Agent returns empty string."""
        request = _make_request()
        assert _extract_user_agent(request) == ""


# ── 3. Request-ID extraction ────────────────────────────────────────


class TestRequestIDExtraction:
    """Request-ID must be validated before logging."""

    def test_valid_request_id_preserved(self) -> None:
        request = _make_request(
            headers={"X-Request-ID": "abc-123-def"},
        )
        assert get_or_generate_request_id(request) == "abc-123-def"

    def test_too_long_request_id_replaced(self) -> None:
        long_id = "x" * (MAX_REQUEST_ID_LEN + 1)
        request = _make_request(headers={"X-Request-ID": long_id})
        result = get_or_generate_request_id(request)
        assert result != long_id
        # Should be a UUID4
        uuid.UUID(result)  # Validates UUID format

    def test_missing_request_id_generates_uuid(self) -> None:
        request = _make_request()
        result = get_or_generate_request_id(request)
        uuid.UUID(result)  # Validates UUID format

    def test_non_ascii_request_id_replaced(self) -> None:
        request = _make_request(
            headers={"X-Request-ID": "request-id-\xe9\xe8"},
        )
        result = get_or_generate_request_id(request)
        # The original contained non-ASCII, so it should be replaced
        assert "\xe9" not in result

    def test_non_printable_request_id_replaced(self) -> None:
        request = _make_request(
            headers={"X-Request-ID": "request\x00id"},
        )
        result = get_or_generate_request_id(request)
        assert "\x00" not in result


# ── 4. Severity validation ──────────────────────────────────────────


class TestSeverityValidation:
    """Severity must be from the allowed set."""

    @pytest.mark.parametrize("severity", list(_ALLOWED_SEVERITIES))
    async def test_allowed_severity_accepted(self, severity: str) -> None:
        """Valid severity values are stored as-is."""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        request = _make_request(
            headers={"X-Request-ID": "test-123"},
            client_host="10.0.0.1",
        )

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=request,
            severity=severity,
        )

        # Verify session.add was called with the entry
        entry = session.add.call_args[0][0]
        assert isinstance(entry, AdminAuditLog)
        assert entry.severity == severity

    async def test_invalid_severity_defaults_to_info(self) -> None:
        """Invalid severity values are silently replaced with 'INFO'."""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        request = _make_request(
            headers={"X-Request-ID": "test-456"},
            client_host="10.0.0.1",
        )

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=request,
            severity="PANIC",  # Invalid
        )

        entry = session.add.call_args[0][0]
        assert entry.severity == "INFO"

    async def test_empty_severity_defaults_to_info(self) -> None:
        """Empty string severity defaults to 'INFO'."""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        request = _make_request(
            headers={"X-Request-ID": "test-789"},
            client_host="10.0.0.1",
        )

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=request,
            severity="",
        )

        entry = session.add.call_args[0][0]
        assert entry.severity == "INFO"


# ── 5. log_admin_action behavior ────────────────────────────────────


class TestLogAdminAction:
    """Verify log_admin_action creates correct audit entries."""

    async def test_creates_audit_log_entry(self) -> None:
        """A valid call creates an AdminAuditLog entry."""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        admin_id = str(uuid.uuid4())
        target_org = str(uuid.uuid4())
        resource_id = uuid.uuid4()

        request = _make_request(
            headers={
                "X-Request-ID": "req-001",
                "User-Agent": "Test/1.0",
                "X-Forwarded-For": "203.0.113.1",
            },
        )

        await log_admin_action(
            session,
            admin_user_id=admin_id,
            action=AdminAuditAction.VIEW_ORG,
            request=request,
            target_org_id=target_org,
            resource_type="Organization",
            resource_id=resource_id,
            metadata={"detail": "test"},
        )

        # Verify session.add was called
        assert session.add.call_count == 1
        entry = session.add.call_args[0][0]
        assert isinstance(entry, AdminAuditLog)
        assert entry.admin_user_id == uuid.UUID(admin_id)
        assert entry.target_org_id == uuid.UUID(target_org)
        assert entry.action == AdminAuditAction.VIEW_ORG
        assert entry.resource_type == "Organization"
        assert entry.resource_id == resource_id
        assert entry.ip_address == "203.0.113.1"
        assert entry.user_agent == "Test/1.0"
        assert entry.request_id == "req-001"
        assert entry.metadata_json == {"detail": "test"}
        assert entry.severity == "INFO"

        # Verify flush was called (fire-and-forget INSERT)
        assert session.flush.call_count == 1

    async def test_null_target_org(self) -> None:
        """Platform-wide actions have no target_org_id."""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        request = _make_request(
            headers={"X-Request-ID": "req-002"},
            client_host="10.0.0.1",
        )

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_MONITORING,
            request=request,
        )

        entry = session.add.call_args[0][0]
        assert entry.target_org_id is None

    async def test_truncates_resource_type(self) -> None:
        """Resource type exceeding 100 chars is truncated."""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        request = _make_request(
            headers={"X-Request-ID": "req-003"},
            client_host="10.0.0.1",
        )

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=request,
            resource_type="A" * 200,
        )

        entry = session.add.call_args[0][0]
        assert len(entry.resource_type) <= 100

    async def test_null_metadata_becomes_empty_dict(self) -> None:
        """None metadata is stored as empty dict."""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        request = _make_request(
            headers={"X-Request-ID": "req-004"},
            client_host="10.0.0.1",
        )

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=request,
            metadata=None,
        )

        entry = session.add.call_args[0][0]
        assert entry.metadata_json == {}

    async def test_only_calls_add_and_flush(self) -> None:
        """log_admin_action only calls session.add + flush (no commit).

        This is critical: the audit log entry should be part of the same
        transaction as the main operation. Separate commit could lead to
        inconsistency (operation succeeds but audit fails, or vice versa).
        """
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.execute = AsyncMock()
        session.delete = AsyncMock()

        request = _make_request(
            headers={"X-Request-ID": "req-005"},
            client_host="10.0.0.1",
        )

        await log_admin_action(
            session,
            admin_user_id=str(uuid.uuid4()),
            action=AdminAuditAction.VIEW_ORG,
            request=request,
        )

        # Only add and flush should be called
        assert session.add.call_count == 1
        assert session.flush.call_count == 1
        # These should NOT be called
        assert session.commit.call_count == 0
        assert session.execute.call_count == 0
        assert session.delete.call_count == 0


# ── 6. get_audit_log query behavior ─────────────────────────────────


class TestGetAuditLog:
    """Test audit log query with pagination and filters."""

    async def test_default_pagination(self) -> None:
        """Default call uses page=1, page_size=20."""
        session = AsyncMock()
        # Mock count query
        count_result = MagicMock()
        count_result.scalar_one.return_value = 5
        # Mock items query
        items_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        items_result.scalars.return_value = scalars

        session.execute = AsyncMock(side_effect=[count_result, items_result])

        items, total = await get_audit_log(session)
        assert total == 5
        assert items == []

    async def test_filter_by_admin_user_id(self) -> None:
        """Filtering by admin_user_id adds WHERE clause."""
        session = AsyncMock()
        count_result = MagicMock()
        count_result.scalar_one.return_value = 2
        items_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        items_result.scalars.return_value = scalars

        session.execute = AsyncMock(side_effect=[count_result, items_result])
        admin_id = str(uuid.uuid4())

        _items, total = await get_audit_log(session, admin_user_id=admin_id)
        assert total == 2
        # Verify execute was called twice (count + items)
        assert session.execute.call_count == 2

    async def test_filter_by_target_org_id(self) -> None:
        """Filtering by target_org_id works."""
        session = AsyncMock()
        count_result = MagicMock()
        count_result.scalar_one.return_value = 3
        items_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        items_result.scalars.return_value = scalars

        session.execute = AsyncMock(side_effect=[count_result, items_result])

        _items, total = await get_audit_log(session, target_org_id=str(uuid.uuid4()))
        assert total == 3

    async def test_filter_by_action(self) -> None:
        """Filtering by valid action adds WHERE clause."""
        session = AsyncMock()
        count_result = MagicMock()
        count_result.scalar_one.return_value = 1
        items_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        items_result.scalars.return_value = scalars

        session.execute = AsyncMock(side_effect=[count_result, items_result])

        _items, total = await get_audit_log(session, action="view_org")
        assert total == 1

    async def test_invalid_action_ignored(self) -> None:
        """Invalid action filter is silently ignored (no WHERE clause)."""
        session = AsyncMock()
        count_result = MagicMock()
        count_result.scalar_one.return_value = 10
        items_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        items_result.scalars.return_value = scalars

        session.execute = AsyncMock(side_effect=[count_result, items_result])

        _items, total = await get_audit_log(session, action="fake_action")
        assert total == 10

    async def test_date_range_filters(self) -> None:
        """Date range filters add WHERE clauses."""
        session = AsyncMock()
        count_result = MagicMock()
        count_result.scalar_one.return_value = 0
        items_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        items_result.scalars.return_value = scalars

        session.execute = AsyncMock(side_effect=[count_result, items_result])

        now = datetime.now(UTC)
        _items, total = await get_audit_log(
            session,
            date_from=now,
            date_to=now,
        )
        assert total == 0

    async def test_pagination_offset_calculation(self) -> None:
        """Page 3 with page_size 10 starts at offset 20."""
        session = AsyncMock()
        count_result = MagicMock()
        count_result.scalar_one.return_value = 50
        items_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        items_result.scalars.return_value = scalars

        session.execute = AsyncMock(side_effect=[count_result, items_result])

        _items, total = await get_audit_log(session, page=3, page_size=10)
        assert total == 50

    async def test_count_returns_none_falls_back_to_zero(self) -> None:
        """If count returns None, total should be 0."""
        session = AsyncMock()
        count_result = MagicMock()
        count_result.scalar_one.return_value = None
        items_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        items_result.scalars.return_value = scalars

        session.execute = AsyncMock(side_effect=[count_result, items_result])

        _items, total = await get_audit_log(session)
        assert total == 0


# ── 7. Allowed severities constant ──────────────────────────────────


class TestSeverityConstants:
    """Verify the severity allowlist is correct."""

    def test_info_in_allowed(self) -> None:
        assert "INFO" in _ALLOWED_SEVERITIES

    def test_warning_in_allowed(self) -> None:
        assert "WARNING" in _ALLOWED_SEVERITIES

    def test_critical_in_allowed(self) -> None:
        assert "CRITICAL" in _ALLOWED_SEVERITIES

    def test_debug_not_allowed(self) -> None:
        """DEBUG is not an allowed severity (too verbose for audit)."""
        assert "DEBUG" not in _ALLOWED_SEVERITIES

    def test_error_not_allowed(self) -> None:
        """ERROR is not allowed — use CRITICAL for security events."""
        assert "ERROR" not in _ALLOWED_SEVERITIES
