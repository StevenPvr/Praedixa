"""FastAPI dependencies for auth, tenant isolation, and database sessions.

Security notes:
- get_current_user is the primary auth dependency. It extracts and verifies
  the JWT on every request. All protected endpoints MUST depend on this.
- get_tenant_filter builds a TenantFilter scoped to the authenticated user's
  organization. It MUST be used for all tenant-scoped database queries.
- Database session is imported from database.py (single source of truth).
- User context is stored on request.state for the audit middleware to read
  without re-decoding the JWT (avoids double verification overhead).
"""

from fastapi import Depends, Request

from app.core.auth import JWTPayload, extract_token, verify_jwt
from app.core.database import get_db_session
from app.core.security import TenantFilter

# Re-export get_db_session so routers can import all deps from one place
__all__ = ["get_current_user", "get_db_session", "get_tenant_filter"]


def get_current_user(request: Request) -> JWTPayload:
    """Extract and verify JWT from the request Authorization header.

    This is the gateway dependency for all authenticated endpoints.
    Returns a frozen JWTPayload with user_id, email, organization_id, role.

    Also stores user_id and org_id on request.state for the audit
    middleware to consume without re-decoding the token.
    """
    token = extract_token(request)
    payload = verify_jwt(token)
    # Store for audit middleware — avoids double JWT decode
    request.state.audit_user_id = payload.user_id
    request.state.audit_org_id = payload.organization_id
    return payload


def get_tenant_filter(
    current_user: JWTPayload = Depends(get_current_user),
) -> TenantFilter:
    """Return a TenantFilter scoped to the current user's organization.

    Every query on tenant-scoped tables MUST pass through this filter
    to enforce data isolation between organizations.
    """
    return TenantFilter(current_user.organization_id)
