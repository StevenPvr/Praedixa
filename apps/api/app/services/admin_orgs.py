"""Admin organization service — cross-tenant org management.

Security notes:
- No TenantFilter: super_admin queries across all organizations.
- Status transitions are validated via an allowlist. Churned orgs cannot
  be reactivated (irreversible state for RGPD compliance).
- Slug uniqueness is enforced at the DB level (unique constraint) and
  checked explicitly before INSERT to provide a friendly error.
- Text fields (name, legal_name) are sanitized via sanitize_text().
"""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.core.validation import sanitize_text
from app.models.data_catalog import ClientDataset
from app.models.department import Department
from app.models.employee import Employee
from app.models.organization import (
    IndustrySector,
    Organization,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.models.site import Site
from app.models.user import User

# Allowed organization status transitions.
# churned is a terminal state (no transitions out).
_STATUS_TRANSITIONS: dict[str, set[str]] = {
    OrganizationStatus.TRIAL.value: {
        OrganizationStatus.ACTIVE.value,
        OrganizationStatus.SUSPENDED.value,
        OrganizationStatus.CHURNED.value,
    },
    OrganizationStatus.ACTIVE.value: {
        OrganizationStatus.SUSPENDED.value,
        OrganizationStatus.CHURNED.value,
    },
    OrganizationStatus.SUSPENDED.value: {
        OrganizationStatus.ACTIVE.value,
        OrganizationStatus.CHURNED.value,
    },
    OrganizationStatus.CHURNED.value: set(),  # Terminal state
}


async def list_organizations(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    status_filter: OrganizationStatus | None = None,
    plan_filter: SubscriptionPlan | None = None,
    sector_filter: IndustrySector | None = None,
) -> tuple[list[Organization], int]:
    """List all organizations with pagination and filters.

    No TenantFilter — admin sees all orgs. Ordered by created_at DESC.
    """
    base_query = select(Organization)
    count_query = select(func.count(Organization.id))

    if search:
        pattern = f"%{search}%"
        search_filter = (
            Organization.name.ilike(pattern)
            | Organization.slug.ilike(pattern)
            | Organization.contact_email.ilike(pattern)
        )
        base_query = base_query.where(search_filter)
        count_query = count_query.where(search_filter)

    if status_filter is not None:
        base_query = base_query.where(Organization.status == status_filter)
        count_query = count_query.where(Organization.status == status_filter)

    if plan_filter is not None:
        base_query = base_query.where(Organization.plan == plan_filter)
        count_query = count_query.where(Organization.plan == plan_filter)

    if sector_filter is not None:
        base_query = base_query.where(Organization.sector == sector_filter)
        count_query = count_query.where(Organization.sector == sector_filter)

    count_result = await session.execute(count_query)
    total = count_result.scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base_query
        .order_by(Organization.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_organization(
    session: AsyncSession,
    org_id: uuid.UUID,
) -> Organization:
    """Fetch a single organization by ID.

    Raises NotFoundError if not found.
    """
    result = await session.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise NotFoundError("Organization", str(org_id))
    return org


async def get_org_counts(
    session: AsyncSession,
    org_id: uuid.UUID,
) -> dict[str, int]:
    """Get aggregated counts for an organization."""
    user_count = await session.execute(
        select(func.count(User.id)).where(User.organization_id == org_id)
    )
    site_count = await session.execute(
        select(func.count(Site.id)).where(Site.organization_id == org_id)
    )
    dept_count = await session.execute(
        select(func.count(Department.id)).where(Department.organization_id == org_id)
    )
    dataset_count = await session.execute(
        select(func.count(ClientDataset.id)).where(
            ClientDataset.organization_id == org_id
        )
    )

    return {
        "user_count": user_count.scalar_one() or 0,
        "site_count": site_count.scalar_one() or 0,
        "department_count": dept_count.scalar_one() or 0,
        "dataset_count": dataset_count.scalar_one() or 0,
    }


async def create_organization(
    session: AsyncSession,
    *,
    name: str,
    slug: str,
    contact_email: str,
    sector: IndustrySector | None = None,
    size: OrganizationSize | None = None,
    plan: SubscriptionPlan = SubscriptionPlan.FREE,
    settings: dict | None = None,
) -> Organization:
    """Create a new organization.

    Checks slug uniqueness before insert. Default status is TRIAL.
    """
    # Check slug uniqueness
    existing = await session.execute(
        select(Organization.id).where(Organization.slug == slug)
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(f"Organization with slug '{slug}' already exists")

    org = Organization(
        name=sanitize_text(name, max_length=255),
        slug=slug,  # Already validated by schema pattern
        contact_email=contact_email,
        sector=sector,
        size=size,
        plan=plan,
        status=OrganizationStatus.TRIAL,
        settings=settings or {},
    )
    session.add(org)
    await session.flush()
    return org


async def update_organization(
    session: AsyncSession,
    org_id: uuid.UUID,
    *,
    data: dict,
) -> Organization:
    """Update organization fields. Only non-None values are applied."""
    org = await get_organization(session, org_id)

    # Build update values from non-None data
    values: dict = {}
    text_fields = {"name", "legal_name"}
    for key, value in data.items():
        if value is not None:
            if key in text_fields:
                values[key] = sanitize_text(value, max_length=255)
            else:
                values[key] = value

    if not values:
        return org

    stmt = (
        update(Organization)
        .where(Organization.id == org_id)
        .values(**values)
    )
    await session.execute(stmt)
    await session.flush()

    # Refresh attributes
    for key, value in values.items():
        setattr(org, key, value)

    return org


async def change_org_status(
    session: AsyncSession,
    org_id: uuid.UUID,
    new_status: OrganizationStatus,
) -> Organization:
    """Change organization status with transition validation.

    Raises ConflictError if the transition is not allowed.
    """
    org = await get_organization(session, org_id)

    current_status = (
        org.status if isinstance(org.status, str) else org.status.value
    )
    allowed = _STATUS_TRANSITIONS.get(current_status, set())
    if new_status.value not in allowed:
        raise ConflictError(
            f"Cannot transition from '{current_status}' to '{new_status.value}'"
        )

    stmt = (
        update(Organization)
        .where(Organization.id == org_id)
        .values(status=new_status)
    )
    await session.execute(stmt)
    await session.flush()
    org.status = new_status
    return org


async def get_org_hierarchy(
    session: AsyncSession,
    org_id: uuid.UUID,
) -> list[dict]:
    """Get organization hierarchy: sites -> departments -> employee counts.

    Returns a tree structure for the admin org detail view.
    """
    # Verify org exists
    await get_organization(session, org_id)

    # Get sites
    sites_result = await session.execute(
        select(Site).where(Site.organization_id == org_id).order_by(Site.name)
    )
    sites = list(sites_result.scalars().all())

    hierarchy = []
    for site in sites:
        # Get departments for this site
        depts_result = await session.execute(
            select(Department)
            .where(
                Department.organization_id == org_id,
                Department.site_id == site.id,
            )
            .order_by(Department.name)
        )
        departments = list(depts_result.scalars().all())

        dept_nodes = []
        for dept in departments:
            # Count employees per department
            emp_count_result = await session.execute(
                select(func.count(Employee.id)).where(
                    Employee.organization_id == org_id,
                    Employee.department_id == dept.id,
                )
            )
            emp_count = emp_count_result.scalar_one() or 0

            dept_nodes.append({
                "id": dept.id,
                "name": dept.name,
                "employee_count": emp_count,
            })

        hierarchy.append({
            "id": site.id,
            "name": site.name,
            "city": getattr(site, "city", None),
            "departments": dept_nodes,
        })

    return hierarchy
