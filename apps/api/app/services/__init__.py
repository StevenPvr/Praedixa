"""Service layer — business logic between routers and database.

All service functions receive an org_id (from the authenticated user's
JWT) and an AsyncSession. They apply TenantFilter on every query to
enforce multi-tenant isolation. Routers should never build queries
directly — they delegate to services.
"""
