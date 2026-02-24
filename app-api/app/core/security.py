"""Multi-tenant security primitives used by data/ML services."""

from typing import Any

from sqlalchemy import Select


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
