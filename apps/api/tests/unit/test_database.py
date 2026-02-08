"""Tests for app.core.database — engine, session factory, RLS."""

from unittest.mock import AsyncMock, patch

import pytest

from app.core.database import _UUID_RE, get_rls_org_id, set_rls_org_id


class TestEngineCreation:
    """Test that the engine is configured correctly."""

    @patch("app.core.database.settings")
    def test_engine_exists(self, mock_settings) -> None:
        from app.core.database import engine

        # Engine is created at module level; just verify it exists
        assert engine is not None

    @patch("app.core.database.settings")
    def test_session_factory_exists(self, mock_settings) -> None:
        from app.core.database import async_session_factory

        assert async_session_factory is not None


class TestGetDbSession:
    """Test get_db_session dependency generator."""

    @pytest.mark.asyncio
    async def test_yields_session_and_commits(self) -> None:
        """On success the session should be committed."""
        mock_session = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()

        # Create a mock context manager
        mock_cm = AsyncMock()
        mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_cm.__aexit__ = AsyncMock(return_value=False)

        # Ensure no RLS org_id is set (clean state)
        set_rls_org_id(None)

        with patch("app.core.database.async_session_factory", return_value=mock_cm):
            from app.core.database import get_db_session

            gen = get_db_session()
            session = await gen.__anext__()
            assert session is mock_session

            # Simulate end of request (no exception)
            with pytest.raises(StopAsyncIteration):
                await gen.__anext__()

            mock_session.commit.assert_called_once()
            mock_session.rollback.assert_not_called()
            # No SET LOCAL should have been called (no org_id set)
            mock_session.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_rollback_on_exception(self) -> None:
        """On exception the session should be rolled back."""
        mock_session = AsyncMock()
        mock_session.commit = AsyncMock(side_effect=Exception("DB error"))
        mock_session.rollback = AsyncMock()

        mock_cm = AsyncMock()
        mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_cm.__aexit__ = AsyncMock(return_value=False)

        # Ensure no RLS org_id is set
        set_rls_org_id(None)

        with patch("app.core.database.async_session_factory", return_value=mock_cm):
            from app.core.database import get_db_session

            gen = get_db_session()
            await gen.__anext__()

            # The generator will try to commit, which raises, then rollback
            with pytest.raises(Exception, match="DB error"):
                await gen.__anext__()

            mock_session.rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_set_local_executed_when_org_id_present(self) -> None:
        """When RLS org_id is set, SET LOCAL should be executed."""
        mock_session = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()
        mock_session.execute = AsyncMock()

        mock_cm = AsyncMock()
        mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_cm.__aexit__ = AsyncMock(return_value=False)

        org_id = "aaaaaaaa-0000-0000-0000-000000000001"
        set_rls_org_id(org_id)

        with patch("app.core.database.async_session_factory", return_value=mock_cm):
            from app.core.database import get_db_session

            gen = get_db_session()
            session = await gen.__anext__()
            assert session is mock_session

            # SET LOCAL should have been called with the org_id
            mock_session.execute.assert_called_once()
            call_args = mock_session.execute.call_args
            sql_text = str(call_args[0][0])
            assert "SET LOCAL app.current_organization_id" in sql_text
            assert call_args[1] == {"org_id": org_id} or call_args[0][1] == {
                "org_id": org_id
            }

            with pytest.raises(StopAsyncIteration):
                await gen.__anext__()

            mock_session.commit.assert_called_once()

        # Clean up
        set_rls_org_id(None)

    @pytest.mark.asyncio
    async def test_no_set_local_when_org_id_none(self) -> None:
        """When no RLS org_id is set, SET LOCAL should NOT be executed."""
        mock_session = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()
        mock_session.execute = AsyncMock()

        mock_cm = AsyncMock()
        mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_cm.__aexit__ = AsyncMock(return_value=False)

        set_rls_org_id(None)

        with patch("app.core.database.async_session_factory", return_value=mock_cm):
            from app.core.database import get_db_session

            gen = get_db_session()
            await gen.__anext__()

            mock_session.execute.assert_not_called()

            with pytest.raises(StopAsyncIteration):
                await gen.__anext__()


class TestRlsContextVar:
    """Test set_rls_org_id / get_rls_org_id."""

    def test_set_and_get_valid_uuid(self) -> None:
        org_id = "12345678-1234-1234-1234-123456789abc"
        set_rls_org_id(org_id)
        assert get_rls_org_id() == org_id
        # Clean up
        set_rls_org_id(None)

    def test_set_none_clears(self) -> None:
        set_rls_org_id("12345678-1234-1234-1234-123456789abc")
        set_rls_org_id(None)
        assert get_rls_org_id() is None

    def test_rejects_non_uuid(self) -> None:
        with pytest.raises(ValueError, match="valid UUID"):
            set_rls_org_id("not-a-uuid")

    def test_rejects_sql_injection_attempt(self) -> None:
        with pytest.raises(ValueError, match="valid UUID"):
            set_rls_org_id("'; DROP TABLE users; --")

    def test_rejects_empty_string(self) -> None:
        with pytest.raises(ValueError, match="valid UUID"):
            set_rls_org_id("")

    def test_accepts_uppercase_uuid(self) -> None:
        org_id = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE"
        set_rls_org_id(org_id)
        assert get_rls_org_id() == org_id
        set_rls_org_id(None)


class TestUuidRegex:
    """Test the UUID validation regex."""

    def test_valid_uuid(self) -> None:
        assert _UUID_RE.match("12345678-1234-1234-1234-123456789abc")

    def test_invalid_uuid_too_short(self) -> None:
        assert not _UUID_RE.match("1234")

    def test_invalid_uuid_with_injection(self) -> None:
        assert not _UUID_RE.match("12345678-1234-1234-1234-123456789abc'; DROP TABLE")

    def test_invalid_uuid_wrong_format(self) -> None:
        assert not _UUID_RE.match("not-a-valid-uuid-string-at-all")
