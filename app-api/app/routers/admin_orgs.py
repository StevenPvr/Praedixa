"""Admin organizations router — CRUD + status transitions.

Security:
- All endpoints require super_admin role.
- Every endpoint logs an admin audit action.
- Text fields are sanitized in the service layer.
- Status transitions are validated via allowlist (no arbitrary status injection).
- org_id path params are UUID-validated by FastAPI.
"""

import uuid
from datetime import UTC, datetime
from typing import Any, cast

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session, get_db_session_for_cross_org
from app.core.security import require_role
from app.models.admin import AdminAuditAction
from app.models.organization import (
    IndustrySector,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.schemas.admin import (
    AdminOrgCreate,
    AdminOrgDetail,
    AdminOrgRead,
    AdminOrgUpdate,
    OrgDepartmentNode,
    OrgSiteNode,
)
from app.schemas.responses import (
    ApiResponse,
    PaginatedResponse,
    make_paginated_response,
)
from app.services.admin_audit import log_admin_action
from app.services.admin_orgs import (
    change_org_status,
    create_organization,
    get_org_counts,
    get_org_hierarchy,
    get_organization,
    list_organizations,
    update_organization,
)

router = APIRouter(tags=["admin-organizations"])


@router.get("/organizations")
async def list_orgs(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=200),
    status: OrganizationStatus | None = Query(default=None),
    plan: SubscriptionPlan | None = Query(default=None),
    sector: IndustrySector | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session_for_cross_org),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[AdminOrgRead]:
    """List all organizations with pagination and filters."""
    items, total = await list_organizations(
        session,
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status,
        plan_filter=plan,
        sector_filter=sector,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_ORG,
        request=request,
        metadata={"page": page, "search": search},
    )

    data = [AdminOrgRead.model_validate(org) for org in items]
    return make_paginated_response(data, total, page, page_size)


@router.post("/organizations", status_code=201)
async def create_org(
    request: Request,
    body: AdminOrgCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminOrgRead]:
    """Create a new organization."""
    org = await create_organization(
        session,
        name=body.name,
        slug=body.slug,
        contact_email=body.contact_email,
        sector=body.sector,
        size=body.size,
        plan=body.plan,
        settings=body.settings,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.CREATE_ORG,
        request=request,
        target_org_id=str(org.id) if org.id else None,
        resource_type="Organization",
        resource_id=org.id,
    )

    return ApiResponse(
        success=True,
        data=AdminOrgRead.model_validate(org),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{org_id}")
async def get_org_detail(
    request: Request,
    org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session_for_cross_org),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminOrgDetail]:
    """Get detailed organization information with hierarchy."""
    org = await get_organization(session, org_id)
    counts = await get_org_counts(session, org_id)
    hierarchy = await get_org_hierarchy(session, org_id)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_ORG,
        request=request,
        target_org_id=str(org_id),
        resource_type="Organization",
        resource_id=org_id,
    )

    # Build detail response — exclude count defaults to avoid collision with real counts
    org_data = AdminOrgRead.model_validate(org)
    count_fields = {"user_count", "site_count", "department_count", "dataset_count"}
    detail = AdminOrgDetail(
        **org_data.model_dump(exclude=count_fields),
        **cast("dict[str, Any]", counts),
        hierarchy=[
            OrgSiteNode(
                id=s["id"],
                name=s["name"],
                city=s.get("city"),
                departments=[
                    OrgDepartmentNode(
                        id=d["id"],
                        name=d["name"],
                        employee_count=d.get("employee_count", 0),
                    )
                    for d in s.get("departments", [])
                ],
            )
            for s in hierarchy
        ],
    )

    return ApiResponse(
        success=True,
        data=detail,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.patch("/organizations/{org_id}")
async def update_org(
    request: Request,
    org_id: uuid.UUID,
    body: AdminOrgUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminOrgRead]:
    """Update organization fields.

    Security: AdminOrgUpdate uses extra="forbid" and typed fields to
    prevent mass-assignment attacks. Only explicitly defined fields
    can be updated.
    """
    # exclude_unset=True ensures only fields the client sent are updated
    safe_data = body.model_dump(exclude_unset=True)

    org = await update_organization(session, org_id, data=safe_data)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.UPDATE_ORG,
        request=request,
        target_org_id=str(org_id),
        resource_type="Organization",
        resource_id=org_id,
        metadata={"fields": list(safe_data.keys())},
    )

    return ApiResponse(
        success=True,
        data=AdminOrgRead.model_validate(org),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/organizations/{org_id}/suspend")
async def suspend_org(
    request: Request,
    org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminOrgRead]:
    """Suspend an organization."""
    org = await change_org_status(session, org_id, OrganizationStatus.SUSPENDED)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.SUSPEND_ORG,
        request=request,
        target_org_id=str(org_id),
        resource_type="Organization",
        resource_id=org_id,
        severity="WARNING",
    )

    return ApiResponse(
        success=True,
        data=AdminOrgRead.model_validate(org),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/organizations/{org_id}/reactivate")
async def reactivate_org(
    request: Request,
    org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminOrgRead]:
    """Reactivate a suspended organization."""
    org = await change_org_status(session, org_id, OrganizationStatus.ACTIVE)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.REACTIVATE_ORG,
        request=request,
        target_org_id=str(org_id),
        resource_type="Organization",
        resource_id=org_id,
    )

    return ApiResponse(
        success=True,
        data=AdminOrgRead.model_validate(org),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/organizations/{org_id}/churn")
async def churn_org(
    request: Request,
    org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[AdminOrgRead]:
    """Mark an organization as churned (irreversible)."""
    org = await change_org_status(session, org_id, OrganizationStatus.CHURNED)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.CHURN_ORG,
        request=request,
        target_org_id=str(org_id),
        resource_type="Organization",
        resource_id=org_id,
        severity="CRITICAL",
    )

    return ApiResponse(
        success=True,
        data=AdminOrgRead.model_validate(org),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{org_id}/hierarchy")
async def get_hierarchy(
    request: Request,
    org_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session_for_cross_org),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[list[OrgSiteNode]]:
    """Get organization site/department hierarchy."""
    hierarchy = await get_org_hierarchy(session, org_id)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.VIEW_ORG,
        request=request,
        target_org_id=str(org_id),
        resource_type="Organization",
        resource_id=org_id,
    )

    data = [
        OrgSiteNode(
            id=s["id"],
            name=s["name"],
            city=s.get("city"),
            departments=[
                OrgDepartmentNode(
                    id=d["id"],
                    name=d["name"],
                    employee_count=d.get("employee_count", 0),
                )
                for d in s.get("departments", [])
            ],
        )
        for s in hierarchy
    ]

    return ApiResponse(
        success=True,
        data=data,
        timestamp=datetime.now(UTC).isoformat(),
    )
