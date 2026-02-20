"""Admin model registry and inference job endpoints (super_admin)."""
# ruff: noqa: TC001, TC002, TC003

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_admin_tenant_filter, get_db_session
from app.core.request_id import get_or_generate_request_id
from app.core.security import TenantFilter, require_role
from app.models.admin import AdminAuditAction
from app.schemas.mlops import (
    InferenceJobCreateRequest,
    InferenceJobCreateResponse,
    InferenceJobRead,
    ModelActivateResponse,
    ModelRegisterRequest,
    ModelRegistryRead,
)
from app.schemas.responses import ApiResponse
from app.services.admin_audit import log_admin_action
from app.services.model_inference_jobs import (
    create_inference_job,
    get_inference_job,
    run_inference_job,
)
from app.services.model_registry import (
    activate_model,
    get_active_model,
    register_model,
)

router = APIRouter(tags=["admin-mlops"])


def _extract_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()


@router.post("/organizations/{target_org_id}/models/register")
async def register_model_endpoint(
    request: Request,
    target_org_id: uuid.UUID,
    body: ModelRegisterRequest,
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ModelRegistryRead]:
    """Register a model artifact reference for one organization."""
    request_id = get_or_generate_request_id(request)
    ip_hash = _hash_ip(_extract_client_ip(request))

    model = await register_model(
        session,
        tenant,
        payload=body,
        created_by=current_user.user_id,
        request_id=request_id,
        actor_service="api_admin",
        ip_hash=ip_hash,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.MODEL_REGISTER,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ModelRegistry",
        resource_id=model.id,
        metadata={"model_family": model.model_family, "version": model.version},
    )

    return ApiResponse(
        success=True,
        data=ModelRegistryRead.model_validate(model),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/organizations/{target_org_id}/models/{model_id}/activate")
async def activate_model_endpoint(
    request: Request,
    target_org_id: uuid.UUID,
    model_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ModelActivateResponse]:
    """Activate a model version (atomically archives previous active one)."""
    request_id = get_or_generate_request_id(request)
    ip_hash = _hash_ip(_extract_client_ip(request))

    model = await activate_model(
        session,
        tenant,
        model_id=model_id,
        request_id=request_id,
        actor_service="api_admin",
        ip_hash=ip_hash,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.MODEL_ACTIVATE,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ModelRegistry",
        resource_id=model.id,
        metadata={"model_family": model.model_family, "version": model.version},
    )

    return ApiResponse(
        success=True,
        data=ModelActivateResponse(
            model_id=model.id,
            model_family=model.model_family,
            version=model.version,
            status=model.status,
            activated_at=model.activated_at or datetime.now(UTC),
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{target_org_id}/models/active")
async def get_active_model_endpoint(
    request: Request,
    target_org_id: uuid.UUID,
    model_family: str | None = Query(default=None, min_length=2, max_length=80),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[ModelRegistryRead | None]:
    """Read active model for an organization."""
    model = await get_active_model(session, tenant, model_family=model_family)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.MODEL_VIEW,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ModelRegistry",
        resource_id=model.id if model else None,
        metadata={"model_family": model_family} if model_family else None,
    )

    return ApiResponse(
        success=True,
        data=ModelRegistryRead.model_validate(model) if model else None,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/organizations/{target_org_id}/inference/jobs")
async def create_inference_job_endpoint(
    request: Request,
    target_org_id: uuid.UUID,
    body: InferenceJobCreateRequest,
    run_now: bool = Query(default=False),
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[InferenceJobCreateResponse]:
    """Create an inference job. Optional immediate execution with run_now=true."""
    request_id = get_or_generate_request_id(request)
    ip_hash = _hash_ip(_extract_client_ip(request))

    job = await create_inference_job(
        session,
        tenant,
        payload=body,
        requested_by=current_user.user_id,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.INFERENCE_JOB_CREATE,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ModelInferenceJob",
        resource_id=job.id,
        metadata={"run_now": run_now},
    )

    if run_now:
        job = await run_inference_job(
            session,
            tenant,
            job_id=job.id,
            actor_service="api_admin",
            request_id=request_id,
            ip_hash=ip_hash,
            raise_on_error=False,
        )

    return ApiResponse(
        success=True,
        data=InferenceJobCreateResponse(job_id=job.id, status=job.status),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/organizations/{target_org_id}/inference/jobs/{job_id}/run")
async def run_inference_job_endpoint(
    request: Request,
    target_org_id: uuid.UUID,
    job_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[InferenceJobRead]:
    """Run a queued inference job now."""
    request_id = get_or_generate_request_id(request)
    ip_hash = _hash_ip(_extract_client_ip(request))

    job = await run_inference_job(
        session,
        tenant,
        job_id=job_id,
        actor_service="api_admin",
        request_id=request_id,
        ip_hash=ip_hash,
        raise_on_error=False,
    )

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.INFERENCE_JOB_RUN,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ModelInferenceJob",
        resource_id=job.id,
        metadata={"status": job.status},
    )

    return ApiResponse(
        success=True,
        data=InferenceJobRead.model_validate(job),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/organizations/{target_org_id}/inference/jobs/{job_id}")
async def get_inference_job_endpoint(
    request: Request,
    target_org_id: uuid.UUID,
    job_id: uuid.UUID,
    tenant: TenantFilter = Depends(get_admin_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[InferenceJobRead]:
    """Get one inference job status."""
    job = await get_inference_job(session, tenant, job_id=job_id)

    await log_admin_action(
        session,
        admin_user_id=current_user.user_id,
        action=AdminAuditAction.INFERENCE_JOB_VIEW,
        request=request,
        target_org_id=str(target_org_id),
        resource_type="ModelInferenceJob",
        resource_id=job.id,
        metadata={"status": job.status},
    )

    return ApiResponse(
        success=True,
        data=InferenceJobRead.model_validate(job),
        timestamp=datetime.now(UTC).isoformat(),
    )
