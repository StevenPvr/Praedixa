"""Shared test helpers for unit tests.

Provides lightweight mock factories for database session results
without spinning up an actual ASGI client or database.
"""

from unittest.mock import AsyncMock, MagicMock


def make_scalar_result(value):
    """Return a mock execute result where scalar_one_or_none() returns `value`
    and scalar_one() returns `value`."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    result.scalar_one.return_value = value
    return result


def make_scalars_result(values):
    """Return a mock execute result where scalars().all() returns `values`."""
    result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = values
    result.scalars.return_value = scalars_mock
    return result


def make_mock_session(*execute_results):
    """Return an AsyncMock session.

    If ``execute_results`` are provided they are returned in order on
    successive ``await session.execute(...)`` calls.  Otherwise the
    default return is ``make_scalar_result(None)``.
    """
    session = AsyncMock()
    if execute_results:
        session.execute.side_effect = list(execute_results)
    else:
        session.execute.return_value = make_scalar_result(None)
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session
