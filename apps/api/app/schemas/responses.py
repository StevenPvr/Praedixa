"""Standard API response wrappers.

Maps to shared-types: ApiResponse, PaginatedResponse, ErrorResponse,
HealthCheckResponse.

Security note: Error responses NEVER include stack traces in production.
The `details` field on errors is intentionally generic.
"""

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

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
