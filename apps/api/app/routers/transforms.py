"""Transforms router — trigger incremental and full-refit pipelines.

Security:
- POST /transforms/incremental requires org_admin role.
- POST /transforms/refit requires super_admin role (recalculates all params).
- Dataset ownership verified via TenantFilter in the service layer.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_db_session, get_tenant_filter
from app.core.security import TenantFilter, require_role
from app.schemas.base import CamelModel
from app.schemas.data_catalog import IngestionLogRead
from app.schemas.responses import ApiResponse
from app.services.datasets import get_dataset
from app.services.transform_engine import run_full_refit, run_incremental

router = APIRouter(prefix="/api/v1/transforms", tags=["transforms"])


class TriggerTransformRequest(CamelModel):
    """Request body for triggering a transform pipeline."""

    model_config = ConfigDict(extra="forbid")

    dataset_id: uuid.UUID
    triggered_by: str = Field(default="manual", max_length=100)


@router.post("/incremental", status_code=201)
async def trigger_incremental(  # pragma: no cover
    body: TriggerTransformRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("org_admin")),
) -> ApiResponse[IngestionLogRead]:
    """Trigger an incremental transform. Requires org_admin role.

    Processes only new rows since the last successful run.
    """
    # Verify dataset belongs to tenant
    await get_dataset(body.dataset_id, tenant, session)

    log_entry = await run_incremental(
        dataset_id=body.dataset_id,
        session=session,
        triggered_by=body.triggered_by,
    )

    return ApiResponse(
        success=True,
        data=IngestionLogRead.model_validate(log_entry),
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/refit", status_code=201)
async def trigger_full_refit(  # pragma: no cover
    body: TriggerTransformRequest,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("super_admin")),
) -> ApiResponse[IngestionLogRead]:
    """Trigger a full refit. Requires super_admin role.

    Recalculates ALL fit parameters and atomically swaps the
    transformed table. This is a heavy operation — typically
    scheduled weekly.
    """
    # Verify dataset belongs to tenant
    await get_dataset(body.dataset_id, tenant, session)

    log_entry = await run_full_refit(
        dataset_id=body.dataset_id,
        session=session,
        triggered_by=body.triggered_by,
    )

    return ApiResponse(
        success=True,
        data=IngestionLogRead.model_validate(log_entry),
        timestamp=datetime.now(UTC).isoformat(),
    )
