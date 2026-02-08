"""Multi-tenant security: tenant isolation and role-based access.

Security notes:
- TenantFilter applies a mandatory WHERE clause on organization_id.
  It MUST be used on every tenant-scoped query to prevent cross-tenant
  data access. Forgetting this filter is a critical vulnerability.
- require_role() returns a dependency that rejects requests from users
  without the required role. The error message lists allowed roles but
  NOT the user's actual role, to limit information leakage.
- Role values come from app_metadata (admin-only writable in Supabase).
- require_role uses Depends(get_current_user) as a sub-dependency so
  FastAPI resolves the JWT payload correctly via dependency injection.
"""

from collections.abc import Callable
from typing import Any

from fastapi import Depends, HTTPException, status
from sqlalchemy import Select

from app.core.auth import JWTPayload


class TenantFilter:
    """Filter queries by organization_id for multi-tenant isolation.

    Usage:
        query = tenant_filter.apply(select(Site), Site)
        # Adds: WHERE site.organization_id = '<current_org_id>'
    """

    def __init__(self, organization_id: str) -> None:
        self.organization_id = organization_id

    def apply(self, query: Select[Any], model: Any) -> Select[Any]:
        """Apply tenant filter to a SQLAlchemy select query.

        The model MUST have an organization_id column (i.e. use TenantMixin).
        """
        return query.where(model.organization_id == self.organization_id)


class SiteFilter:
    """Filter queries by site_id for site-level access control.

    When site_id is None (e.g. org_admin), no filtering is applied —
    the user sees all sites in the organization. When site_id is set,
    only records matching that site are returned.

    Usage:
        query = site_filter.apply(select(CoverageAlert), CoverageAlert)
        # Adds: WHERE coverage_alert.site_id = '<user_site_id>'
        # or no-op if site_id is None
    """

    def __init__(self, site_id: str | None) -> None:
        self.site_id = site_id

    def apply(self, query: Select[Any], model: Any) -> Select[Any]:
        """Apply site filter to a SQLAlchemy select query.

        The model MUST have a site_id column. If self.site_id is None,
        the query is returned unchanged (org-wide access).
        """
        if self.site_id is None:
            return query
        return query.where(model.site_id == self.site_id)


def require_role(*allowed_roles: str) -> Callable[..., JWTPayload]:
    """FastAPI dependency factory: require the user to have one of the specified roles.

    Usage as inline dependency (returns the user payload):
        current_user: JWTPayload = Depends(require_role("admin", "manager"))

    Usage in dependencies list (just validates, discards return):
        @router.post("/", dependencies=[Depends(require_role("admin", "manager"))])

    The returned sub-dependency uses Depends(get_current_user) so FastAPI
    resolves the JWT automatically. Without this, FastAPI would try to
    instantiate JWTPayload from query params, which would fail.
    """
    # Import here to avoid circular import (dependencies -> security -> dependencies)
    from app.core.dependencies import get_current_user

    def _check_role(
        current_user: JWTPayload = Depends(get_current_user),
    ) -> JWTPayload:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action",
            )
        return current_user

    return _check_role
