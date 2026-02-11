"""Telemetry ingestion router for product UX events."""

from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user
from app.schemas.responses import ApiResponse
from app.schemas.ux import ProductEventBatchRequest, ProductEventBatchResult

router = APIRouter(prefix="/api/v1/product-events", tags=["product-events"])
logger = structlog.get_logger()

_MAX_CONTEXT_DEPTH = 4
_MAX_CONTEXT_ITEMS = 20
_MAX_STRING_LENGTH = 200


def _sanitize_context(value: Any, *, depth: int = 0) -> Any:
    if depth >= _MAX_CONTEXT_DEPTH:
        return "<truncated>"

    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for idx, (key, item) in enumerate(value.items()):
            if idx >= _MAX_CONTEXT_ITEMS:
                break
            out[str(key)[:80]] = _sanitize_context(item, depth=depth + 1)
        return out

    if isinstance(value, (list, tuple)):
        return [
            _sanitize_context(item, depth=depth + 1)
            for item in list(value)[:_MAX_CONTEXT_ITEMS]
        ]

    if isinstance(value, str):
        return value[:_MAX_STRING_LENGTH]

    if isinstance(value, (int, float, bool)) or value is None:
        return value

    return str(value)[:_MAX_STRING_LENGTH]


@router.post("/batch")
async def ingest_product_events(
    body: ProductEventBatchRequest,
    current_user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[ProductEventBatchResult]:
    """Accept a telemetry batch and log sanitized event payloads."""
    accepted = 0
    for event in body.events:
        occurred_at = event.occurred_at or datetime.now(UTC)
        logger.info(
            "product_event",
            organization_id=current_user.organization_id,
            user_id=current_user.user_id,
            event_name=event.name,
            occurred_at=occurred_at.isoformat(),
            context=_sanitize_context(event.context),
        )
        accepted += 1

    return ApiResponse(
        success=True,
        data=ProductEventBatchResult(accepted=accepted),
        timestamp=datetime.now(UTC).isoformat(),
    )
