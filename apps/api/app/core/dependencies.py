"""FastAPI dependencies for auth, tenant isolation, and database sessions.

Security notes:
- get_current_user is the primary auth dependency. It extracts and verifies
  the JWT on every request. All protected endpoints MUST depend on this.
- get_current_user also calls set_rls_org_id() to propagate the org_id
  to the database session via ContextVar. This enables PostgreSQL RLS
  policies (SET LOCAL app.current_organization_id) without modifying
  every router.
- get_tenant_filter builds a TenantFilter scoped to the authenticated user's
  organization. It MUST be used for all tenant-scoped database queries.
- get_admin_tenant_filter builds a TenantFilter scoped to an admin-specified
  org_id path parameter. Only accessible to super_admin users. It overrides
  the RLS org_id to the target org so admin queries are RLS-scoped correctly.
- Database session is imported from database.py (single source of truth).
- User context is stored on request.state for the audit middleware to read
  without re-decoding the JWT (avoids double verification overhead).
"""

import uuid

from fastapi import Depends, Request

from app.core.auth import JWTPayload, extract_token, verify_jwt
from app.core.database import get_db_session, set_rls_org_id
from app.core.security import TenantFilter, require_role

# Re-export get_db_session so routers can import all deps from one place
__all__ = [
    "get_admin_tenant_filter",
    "get_current_user",
    "get_db_session",
    "get_tenant_filter",
]


def get_current_user(request: Request) -> JWTPayload:
    """Extract and verify JWT from the request Authorization header.

    This is the gateway dependency for all authenticated endpoints.
    Returns a frozen JWTPayload with user_id, email, organization_id, role.

    Also stores user_id and org_id on request.state for the audit
    middleware to consume without re-decoding the token.

    Sets the RLS ContextVar so that get_db_session will execute
    SET LOCAL app.current_organization_id on the database connection.
    """
    token = extract_token(request)
    payload = verify_jwt(token)
    # Store for audit middleware — avoids double JWT decode
    request.state.audit_user_id = payload.user_id
    request.state.audit_org_id = payload.organization_id
    # Propagate org_id to database session for PostgreSQL RLS enforcement.
    # ContextVar is async-safe: scoped to the current asyncio task (= request).
    set_rls_org_id(payload.organization_id)
    return payload


def get_tenant_filter(
    current_user: JWTPayload = Depends(get_current_user),
) -> TenantFilter:
    """Return a TenantFilter scoped to the current user's organization.

    Every query on tenant-scoped tables MUST pass through this filter
    to enforce data isolation between organizations.
    """
    return TenantFilter(current_user.organization_id)


def get_admin_tenant_filter(
    target_org_id: uuid.UUID,
    _current_user: JWTPayload = Depends(require_role("super_admin")),
) -> TenantFilter:
    """Return a TenantFilter scoped to the admin-specified org.

    Allows super_admins to query any organization's data by passing
    the target org_id as a path parameter. The TenantFilter returned
    works identically to the regular tenant filter — existing service
    functions accept it without modification.

    Security:
    - require_role("super_admin") ensures only super_admins can use this.
    - target_org_id is UUID-validated by FastAPI (path parameter type).
    - The TenantFilter scopes all downstream queries to the target org,
      preventing accidental cross-org data leakage.
    - Overrides the RLS ContextVar to the target org so the database
      session's SET LOCAL matches the admin's intended org scope.
    """
    # Override RLS context to target org for cross-tenant admin queries.
    # get_current_user already set it to the admin's own org — we must
    # override it to the target org so RLS policies filter correctly.
    set_rls_org_id(str(target_org_id))
    return TenantFilter(str(target_org_id))
