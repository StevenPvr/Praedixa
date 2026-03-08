"""DDL connection context manager for dynamic schema/table operations.

Security notes:
- Uses synchronous psycopg (not asyncpg) because DDL operations benefit
  from explicit transaction control and psycopg.sql safe composition.
- Executes SET ROLE praedixa_owner on entry so all created objects have
  predictable ownership (required for ALTER DEFAULT PRIVILEGES).
- Converts the async DATABASE_URL to a sync psycopg connection string.
- Intended to be called via asyncio.to_thread() from async code.

Usage:
    async def create_schemas():
        def _sync_work():
            with ddl_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(
                        sql.Identifier("acme_raw")
                    ))
        await asyncio.to_thread(_sync_work)
"""

from __future__ import annotations

import contextlib
import re
from typing import TYPE_CHECKING, Any

import psycopg

if TYPE_CHECKING:
    from collections.abc import Generator

from app.core.config import settings


def _convert_database_url(url: str) -> str:
    """Convert async SQLAlchemy URL to sync psycopg connection string.

    Transforms:
        postgresql+asyncpg://user:pass@host:port/db
    To:
        postgresql://user:pass@host:port/db

    Also preserves query parameters (e.g. ?sslmode=require).
    """
    return re.sub(r"^postgresql\+asyncpg://", "postgresql://", url)  # pragma: no cover


@contextlib.contextmanager
def ddl_connection() -> (  # pragma: no cover
    Generator[psycopg.Connection[Any], None, None]
):
    """Yield a psycopg connection configured for DDL operations.

    On entry:
    - Autocommit is disabled (explicit transaction).
    - SET ROLE praedixa_owner is executed so created objects have
      correct ownership for ALTER DEFAULT PRIVILEGES to work.

    On exit:
    - Commits on success, rolls back on exception.
    - Connection is closed.
    """
    dsn = _convert_database_url(settings.DATABASE_URL)
    conn = psycopg.connect(dsn, autocommit=False)
    try:
        with conn.cursor() as cur:
            # Set role so all DDL objects are owned by praedixa_owner.
            # In development (without role architecture), this may fail —
            # we catch and log but continue for local dev convenience.
            try:
                cur.execute("SET ROLE praedixa_owner")
            except psycopg.errors.InsufficientPrivilege:
                conn.rollback()
                if settings.ENVIRONMENT != "development":
                    raise
                # In dev mode without role architecture, proceed as current user
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
