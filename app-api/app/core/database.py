"""Async database engine and session factory.

Security notes:
- pool_pre_ping ensures connections are valid before use (prevents stale conn attacks).
- expire_on_commit=False prevents lazy-load from leaking data across request boundaries
  when combined with proper session scoping.
- Session commit/rollback is handled in the dependency to prevent partial writes.
- SET LOCAL app.current_organization_id is executed at session start to activate
  PostgreSQL Row-Level Security (RLS) policies. The org_id is read from a
  contextvars.ContextVar set by the auth dependency chain. SET LOCAL is
  transaction-scoped — it cannot leak between requests.
"""

import re
from collections.abc import AsyncGenerator
from contextvars import ContextVar

from sqlalchemy import text
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

# ── RLS context propagation ──────────────────────────
# The auth dependency sets this ContextVar with the authenticated user's
# organization_id. get_db_session reads it to execute SET LOCAL, which
# activates PostgreSQL RLS policies for the current transaction.
# ContextVar is async-safe: each asyncio task (= each request) gets
# its own copy, preventing cross-request leakage.
_current_org_id: ContextVar[str | None] = ContextVar("_current_org_id", default=None)

# When True, super_admin cross-org endpoints can read all orgs via RLS bypass.
# Set by require_super_admin_cross_org dependency. Write operations remain
# tenant-scoped — only SELECT policies allow the bypass.
_bypass_rls_for_admin: ContextVar[bool] = ContextVar(
    "_bypass_rls_for_admin", default=False
)

# Strict UUID v4 pattern — prevents SQL injection via malformed org_id.
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def set_rls_org_id(org_id: str | None) -> None:
    """Set the organization_id for RLS context propagation.

    Called by the auth dependency chain. The value is read by
    get_db_session to execute SET LOCAL on the database connection.

    Security: org_id is validated as a strict UUID format before being
    stored. This is defense-in-depth — the JWT verification already
    validates organization_id as a UUID, but we double-check here to
    prevent injection if this function is ever called from a different path.
    """
    if org_id is not None and not _UUID_RE.match(org_id):
        msg = "set_rls_org_id: org_id must be a valid UUID"
        raise ValueError(msg)
    _current_org_id.set(org_id)


def get_rls_org_id() -> str | None:
    """Read the current RLS organization_id (for testing/introspection)."""
    return _current_org_id.get()


def set_bypass_rls_for_admin(enabled: bool) -> None:
    """Enable RLS bypass for super_admin cross-org read-only endpoints.

    When enabled, get_db_session will SET LOCAL app.bypass_rls = 'true',
    allowing SELECT policies to return rows from all organizations.
    Only require_super_admin_cross_org should call this with enabled=True.
    """
    _bypass_rls_for_admin.set(enabled)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session.

    If an organization_id has been set via set_rls_org_id (by the auth
    dependency chain), executes SET LOCAL app.current_organization_id
    to activate PostgreSQL RLS policies for the current transaction.

    Commits on success, rolls back on exception.
    Each request gets its own session — no shared state between requests.
    """
    async with async_session_factory() as session:
        try:
            # Propagate tenant context to PostgreSQL for RLS enforcement.
            # SET LOCAL is transaction-scoped — it resets automatically
            # at COMMIT/ROLLBACK, so it cannot leak to other requests.
            org_id = _current_org_id.get()
            if org_id is not None:
                # Defense-in-depth: re-validate UUID format before sending to DB.
                # The auth layer already validated this, but we guard against
                # programming errors that could bypass auth validation.
                if not _UUID_RE.match(org_id):
                    msg = "Invalid organization_id format for RLS context"
                    raise ValueError(msg)  # noqa: TRY301
                await session.execute(
                    text("SET LOCAL app.current_organization_id = :org_id"),
                    {"org_id": org_id},
                )
            if _bypass_rls_for_admin.get():
                await session.execute(text("SET LOCAL app.bypass_rls = 'true'"))
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
