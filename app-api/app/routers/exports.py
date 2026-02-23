"""Exports router — legacy compatibility endpoint for export requests."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.schemas.compat import ExportRequest, ExportResponseData
from app.schemas.responses import ApiResponse

if TYPE_CHECKING:
    from app.core.auth import JWTPayload

router = APIRouter(prefix="/api/v1/exports", tags=["exports"])

_ALLOWED_RESOURCES = frozenset(
    {
        "forecasts",
        "decisions",
        "alerts",
        "datasets",
        "canonical",
        "coverage-alerts",
        "operational-decisions",
        "proof",
    }
)


@router.post("/{resource}", status_code=202)
async def request_export(
    resource: str,
    body: ExportRequest,
    _user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[ExportResponseData]:
    """Queue a legacy-compatible export request.

    The export is intentionally asynchronous for compatibility and to avoid
    blocking API workers on potentially large payload generation.
    """
    normalized_resource = resource.strip().lower()
    if normalized_resource not in _ALLOWED_RESOURCES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unsupported export resource",
        )

    now = datetime.now(tz=UTC)
    data = ExportResponseData(
        success=True,
        export_id=str(uuid.uuid4()),
        format=body.format,
        status="pending",
        download_url=None,
        expires_at=now + timedelta(hours=24),
        accepted_at=now,
    )

    return ApiResponse(
        success=True,
        message="Export request accepted",
        data=data,
        timestamp=now.isoformat(),
    )
