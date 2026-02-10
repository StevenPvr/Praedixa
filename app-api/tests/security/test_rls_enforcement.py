"""Security gap analysis — RLS SET LOCAL enforcement tests.

Tests that the ContextVar-based RLS propagation chain works correctly:
1. set_rls_org_id validates UUID format (rejects injection payloads).
2. get_db_session reads the ContextVar and executes SET LOCAL.
3. get_current_user sets the ContextVar from the JWT payload.
4. get_admin_tenant_filter overrides the ContextVar to target org.
5. Invalid org_id formats are rejected at every layer.

OWASP API1:2023 — Broken Object Level Authorization (BOLA)
OWASP API5:2023 — Broken Function Level Authorization
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.database import (
    _UUID_RE,
    get_db_session,
    get_rls_org_id,
    set_rls_org_id,
)

# ── Fixed test identifiers ─────────────────────────────────────
VALID_UUID = "aaaaaaaa-1111-1111-1111-111111111111"
VALID_UUID_2 = "bbbbbbbb-2222-2222-2222-222222222222"


# ── 1. set_rls_org_id validation ────────────────────────────────


class TestSetRlsOrgIdValidation:
    """set_rls_org_id rejects non-UUID org_id values (SQL injection defense)."""

    def test_valid_uuid_accepted(self) -> None:
        """A valid UUID string is accepted and stored."""
        set_rls_org_id(VALID_UUID)
        assert get_rls_org_id() == VALID_UUID

    def test_none_accepted(self) -> None:
        """None is accepted (public/unauthenticated context)."""
        set_rls_org_id(None)
        assert get_rls_org_id() is None

    def test_uppercase_uuid_accepted(self) -> None:
        """Uppercase UUID is accepted (re.IGNORECASE)."""
        upper = VALID_UUID.upper()
        set_rls_org_id(upper)
        assert get_rls_org_id() == upper

    @pytest.mark.parametrize(
        "malicious_input",
        [
            "not-a-uuid",
            "'; DROP TABLE users;--",
            "../../etc/passwd",
            "<script>alert(1)</script>",
            "aaaaaaaa-1111-1111-1111-111111111111; SELECT 1",
            "",
            "   ",
            "aaaaaaaa-1111-1111-1111-gggggggggggg",  # invalid hex chars
            "aaaaaaaa11111111111111111111",  # no dashes
            "aaaaaaaa-1111-1111-1111-1111111111111",  # one char too long
            "aaaaaaaa-1111-1111-1111-11111111111",  # one char too short
        ],
        ids=[
            "random_string",
            "sql_injection",
            "path_traversal",
            "xss",
            "uuid_with_sql_suffix",
            "empty_string",
            "whitespace_only",
            "invalid_hex",
            "no_dashes",
            "too_long",
            "too_short",
        ],
    )
    def test_malicious_org_id_rejected(self, malicious_input: str) -> None:
        """Non-UUID org_id raises ValueError (prevents SQL injection)."""
        with pytest.raises(ValueError, match="valid UUID"):
            set_rls_org_id(malicious_input)


# ── 2. UUID regex strictness ────────────────────────────────────


class TestUuidRegexStrictness:
    """The _UUID_RE pattern is strict enough to prevent injection."""

    def test_standard_uuid_matches(self) -> None:
        assert _UUID_RE.match(VALID_UUID)

    def test_uuid4_from_stdlib_matches(self) -> None:
        """stdlib uuid.uuid4() output always matches."""
        for _ in range(10):
            assert _UUID_RE.match(str(uuid.uuid4()))

    @pytest.mark.parametrize(
        "bad",
        [
            "12345",
            "aaaaaaaa-1111-1111-1111-111111111111 ",
            " aaaaaaaa-1111-1111-1111-111111111111",
            "{aaaaaaaa-1111-1111-1111-111111111111}",
            "urn:uuid:aaaaaaaa-1111-1111-1111-111111111111",
        ],
    )
    def test_non_standard_uuid_rejected(self, bad: str) -> None:
        """UUID with extra formatting/characters does not match."""
        assert not _UUID_RE.match(bad)

    def test_uuid_with_trailing_newline_matches_regex(self) -> None:
        """Python's $ matches before a trailing newline.

        This is an inherent Python re behavior: $ matches end of string
        OR before a trailing \\n. In practice this is not exploitable
        because set_rls_org_id sends the value as a parameterized query
        parameter — SQLAlchemy/psycopg will reject a UUID with a newline.
        However, if fullmatch() or \\Z were used instead of match()+$,
        this edge case would be eliminated. Documenting for completeness.
        """
        # Python re.match with $ allows trailing \n
        assert _UUID_RE.match("aaaaaaaa-1111-1111-1111-111111111111\n")


# ── 3. get_db_session executes SET LOCAL when org_id is set ─────


class TestGetDbSessionRlsPropagation:
    """get_db_session reads ContextVar and executes SET LOCAL."""

    async def test_set_local_executed_when_org_id_set(self) -> None:
        """When org_id is set, SET LOCAL is executed on the session."""
        set_rls_org_id(VALID_UUID)

        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_session.commit = AsyncMock()

        with patch(
            "app.core.database.async_session_factory",
        ) as mock_factory:
            # Make the context manager yield our mock session
            mock_cm = AsyncMock()
            mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
            mock_cm.__aexit__ = AsyncMock(return_value=False)
            mock_factory.return_value = mock_cm

            gen = get_db_session()
            await gen.__anext__()

            # Verify SET LOCAL was called
            mock_session.execute.assert_called_once()
            call_args = mock_session.execute.call_args
            # The first arg is the text() object
            sql_text = str(call_args[0][0])
            assert "SET LOCAL" in sql_text
            assert "app.current_organization_id" in sql_text
            # The second arg is the params dict (positional arg [1])
            params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1]
            assert params["org_id"] == VALID_UUID

        # Clean up ContextVar
        set_rls_org_id(None)

    async def test_no_set_local_when_org_id_is_none(self) -> None:
        """When org_id is None, SET LOCAL is NOT executed."""
        set_rls_org_id(None)

        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_session.commit = AsyncMock()

        with patch(
            "app.core.database.async_session_factory",
        ) as mock_factory:
            mock_cm = AsyncMock()
            mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
            mock_cm.__aexit__ = AsyncMock(return_value=False)
            mock_factory.return_value = mock_cm

            gen = get_db_session()
            await gen.__anext__()

            # SET LOCAL should NOT be called
            mock_session.execute.assert_not_called()

    async def test_corrupted_contextvar_rejected_in_get_db_session(self) -> None:
        """If ContextVar somehow contains a non-UUID, get_db_session raises.

        This tests the defense-in-depth: even if set_rls_org_id was bypassed
        (e.g., via direct ContextVar manipulation), get_db_session re-validates.
        """
        from app.core.database import _current_org_id

        # Bypass set_rls_org_id validation by setting the ContextVar directly
        token = _current_org_id.set("'; DROP TABLE users;--")

        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_session.rollback = AsyncMock()

        try:
            with patch(
                "app.core.database.async_session_factory",
            ) as mock_factory:
                mock_cm = AsyncMock()
                mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
                mock_cm.__aexit__ = AsyncMock(return_value=False)
                mock_factory.return_value = mock_cm

                gen = get_db_session()
                with pytest.raises(ValueError, match="Invalid organization_id"):
                    await gen.__anext__()
        finally:
            _current_org_id.reset(token)


# ── 4. get_current_user propagates org_id to RLS ───────────────


class TestGetCurrentUserRlsPropagation:
    """get_current_user calls set_rls_org_id with the JWT org_id."""

    def test_get_current_user_sets_rls_context(self) -> None:
        """After get_current_user, get_rls_org_id returns the JWT org_id."""
        from app.core.auth import JWTPayload
        from app.core.dependencies import get_current_user

        mock_request = MagicMock()
        mock_request.headers.get.return_value = "Bearer test-token"
        mock_request.state = MagicMock()

        jwt = JWTPayload(
            user_id="dddddddd-0000-0000-0000-000000000001",
            email="test@praedixa.com",
            organization_id=VALID_UUID,
            role="org_admin",
        )

        with (
            patch("app.core.dependencies.extract_token", return_value="test-token"),
            patch("app.core.dependencies.verify_jwt", return_value=jwt),
        ):
            result = get_current_user(mock_request)

        assert result.organization_id == VALID_UUID
        assert get_rls_org_id() == VALID_UUID

        # Clean up
        set_rls_org_id(None)


# ── 5. get_admin_tenant_filter overrides RLS org_id ─────────────


class TestAdminTenantFilterRlsOverride:
    """get_admin_tenant_filter overrides the RLS ContextVar to target org."""

    def test_admin_tenant_filter_overrides_rls_to_target_org(self) -> None:
        """After get_admin_tenant_filter, RLS org_id is the TARGET org."""
        from app.core.auth import JWTPayload
        from app.core.dependencies import get_admin_tenant_filter

        # Set initial RLS to admin's own org
        set_rls_org_id(VALID_UUID)

        target_org = uuid.UUID(VALID_UUID_2)

        with patch(
            "app.core.dependencies.require_role",
            return_value=lambda: JWTPayload(
                user_id="admin-001",
                email="admin@praedixa.com",
                organization_id=VALID_UUID,
                role="super_admin",
            ),
        ):
            tf = get_admin_tenant_filter(target_org)

        # TenantFilter uses target org
        assert tf.organization_id == str(target_org)
        # RLS ContextVar is now set to target org (not admin's own org)
        assert get_rls_org_id() == str(target_org)
        assert get_rls_org_id() != VALID_UUID

        # Clean up
        set_rls_org_id(None)
