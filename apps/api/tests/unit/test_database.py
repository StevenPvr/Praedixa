"""Tests for app.core.database — engine, session factory, get_db_session."""

from unittest.mock import AsyncMock, patch

import pytest


class TestEngineCreation:
    """Test that the engine is configured correctly."""

    @patch("app.core.database.settings")
    def test_engine_exists(self, mock_settings):
        from app.core.database import engine

        # Engine is created at module level; just verify it exists
        assert engine is not None

    @patch("app.core.database.settings")
    def test_session_factory_exists(self, mock_settings):
        from app.core.database import async_session_factory

        assert async_session_factory is not None


class TestGetDbSession:
    """Test get_db_session dependency generator."""

    @pytest.mark.asyncio
    async def test_yields_session_and_commits(self):
        """On success the session should be committed."""
        mock_session = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()

        # Create a mock context manager
        mock_cm = AsyncMock()
        mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_cm.__aexit__ = AsyncMock(return_value=False)

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

    @pytest.mark.asyncio
    async def test_rollback_on_exception(self):
        """On exception the session should be rolled back."""
        mock_session = AsyncMock()
        mock_session.commit = AsyncMock(side_effect=Exception("DB error"))
        mock_session.rollback = AsyncMock()

        mock_cm = AsyncMock()
        mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_cm.__aexit__ = AsyncMock(return_value=False)

        with patch("app.core.database.async_session_factory", return_value=mock_cm):
            from app.core.database import get_db_session

            gen = get_db_session()
            await gen.__anext__()

            # The generator will try to commit, which raises, then rollback
            with pytest.raises(Exception, match="DB error"):
                await gen.__anext__()

            mock_session.rollback.assert_called_once()
