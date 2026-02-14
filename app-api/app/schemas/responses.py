"""Standard API response wrappers.

Maps to shared-types: ApiResponse, PaginatedResponse, ErrorResponse,
HealthCheckResponse.

Security note: Error responses NEVER include stack traces in production.
The `details` field on errors is intentionally generic.
"""

from datetime import UTC, datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

from app.core.pagination import calculate_total_pages
from app.schemas.base import PaginationMeta

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""

    success: bool
    data: T
    message: str | None = None
    timestamp: str
    request_id: str | None = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response."""

    success: bool = True
    data: list[T]
    pagination: PaginationMeta
    timestamp: str
    request_id: str | None = None


def make_paginated_response[T](
    data: list[T], total: int, page: int, page_size: int
) -> PaginatedResponse[T]:
    """Build PaginatedResponse from items, total, and pagination params."""
    total_pages = calculate_total_pages(total, page_size)
    return PaginatedResponse(
        success=True,
        data=data,
        pagination=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next_page=page < total_pages,
            has_previous_page=page > 1,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )


def pagination_meta_dict(total: int, page: int, page_size: int) -> dict[str, Any]:
    """Build pagination meta as dict for embedding in custom ApiResponse payloads."""
    total_pages = calculate_total_pages(total, page_size)
    return PaginationMeta(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next_page=page < total_pages,
        has_previous_page=page > 1,
    ).model_dump()


class ErrorDetail(BaseModel):
    """Structured error detail."""

    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    """Error response — no stack traces, no internal details."""

    success: bool = False
    error: ErrorDetail
    timestamp: str
    request_id: str | None = None


class HealthCheck(BaseModel):
    """Individual health check result."""

    name: str
    status: str  # "pass" | "warn" | "fail"
    duration: float | None = None
    message: str | None = None


class HealthCheckResponse(BaseModel):
    """Health check response."""

    status: str  # "healthy" | "degraded" | "unhealthy"
    version: str
    environment: str
    timestamp: datetime
    checks: list[HealthCheck]
