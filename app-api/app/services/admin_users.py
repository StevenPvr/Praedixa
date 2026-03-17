"""Admin user management service — cross-org user operations.

Security notes:
- super_admin role assignment is blocked at both schema and service layers.
  The service layer check is defense-in-depth — even if a crafted request
  bypasses Pydantic validation, the service will reject it.
- User ownership is verified against the target org_id for all mutations.
  A user from org A cannot be modified via an org B path.
- Email uniqueness is enforced at the DB level (unique constraint) and
  checked explicitly before INSERT.
"""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import normalize_page_window
from app.models.user import User, UserRole, UserStatus


async def list_org_users(
    session: AsyncSession,
    org_id: uuid.UUID,
    *,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[User], int]:
    """List users for a specific organization with pagination.

    Scoped by org_id (admin-specified, not from JWT).
    """
    base_query = select(User).where(User.organization_id == org_id)
    count_query = select(func.count(User.id)).where(User.organization_id == org_id)

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    _, page_size, offset = normalize_page_window(page, page_size)
    query = base_query.order_by(User.created_at.desc()).offset(offset).limit(page_size)
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def invite_user(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    email: str,
    role: UserRole,
    invited_by: str,
    site_id: uuid.UUID | None = None,
) -> User:
    """Fail closed: account provisioning belongs to the TypeScript admin API.

    The data-plane Python service must not create placeholder auth identities or
    local-only account records for end-user/operator access.
    """
    del session, org_id, email, role, invited_by, site_id
    raise ForbiddenError(
        "User provisioning is handled by the TypeScript admin API and "
        "Keycloak lifecycle; the Python data-plane service must not create "
        "placeholder auth identities."
    )


async def _get_org_user(
    session: AsyncSession,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
) -> User:
    """Fetch a user ensuring it belongs to the specified org.

    Raises NotFoundError if user does not exist or is in a different org.
    """
    result = await session.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == org_id,
        )
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User", str(user_id))
    return user


async def change_user_role(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    new_role: UserRole,
) -> User:
    """Change a user's role within their organization.

    Security:
    - Rejects super_admin assignment (defense-in-depth).
    - Verifies user belongs to the specified org.
    """
    if new_role == UserRole.SUPER_ADMIN:
        raise ForbiddenError("Cannot assign super_admin role")

    user = await _get_org_user(session, org_id, user_id)

    stmt = (
        update(User)
        .where(User.id == user_id, User.organization_id == org_id)
        .values(role=new_role)
    )
    await session.execute(stmt)
    await session.flush()
    user.role = new_role
    return user


async def deactivate_user(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
) -> User:
    """Deactivate a user (set status=INACTIVE)."""
    user = await _get_org_user(session, org_id, user_id)

    stmt = (
        update(User)
        .where(User.id == user_id, User.organization_id == org_id)
        .values(status=UserStatus.INACTIVE)
    )
    await session.execute(stmt)
    await session.flush()
    user.status = UserStatus.INACTIVE
    return user


async def reactivate_user(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
) -> User:
    """Reactivate a user (set status=ACTIVE)."""
    user = await _get_org_user(session, org_id, user_id)

    stmt = (
        update(User)
        .where(User.id == user_id, User.organization_id == org_id)
        .values(status=UserStatus.ACTIVE)
    )
    await session.execute(stmt)
    await session.flush()
    user.status = UserStatus.ACTIVE
    return user
