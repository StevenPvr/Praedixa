"""Async database engine and session factory.

Security notes:
- pool_pre_ping ensures connections are valid before use (prevents stale conn attacks).
- expire_on_commit=False prevents lazy-load from leaking data across request boundaries
  when combined with proper session scoping.
- Session commit/rollback is handled in the dependency to prevent partial writes.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session.

    Commits on success, rolls back on exception.
    Each request gets its own session — no shared state between requests.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
