"""Global exception handling — never expose internals in production."""

import re
from datetime import UTC
from typing import Any

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.config import settings

# Pre-compiled UUID regex for safe resource_id reflection.
_UUID_REGEX: re.Pattern[str] = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    re.IGNORECASE,
)

logger = structlog.get_logger()

# Max length and charset for X-Request-ID to prevent log injection / response bloat.
_MAX_REQUEST_ID_LEN = 64
_HTTP_UNAUTHORIZED = 401


def _safe_request_id(request: Request) -> str | None:
    """Extract and validate X-Request-ID from request headers.

    Returns None if missing or invalid. Prevents reflection of oversized
    or non-ASCII request IDs in error response bodies.
    """
    raw = request.headers.get("X-Request-ID")
    if raw and len(raw) <= _MAX_REQUEST_ID_LEN and raw.isascii() and raw.isprintable():
        return raw
    return None


class PraedixaError(Exception):
    """Base exception for Praedixa API."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: dict[str, str] | None = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundError(PraedixaError):
    """Resource not found.

    The resource_id is included in details only if it looks like a valid UUID.
    Arbitrary strings are never reflected back to prevent XSS/log injection.
    """

    def __init__(self, resource: str, resource_id: str) -> None:
        # Only reflect UUID-shaped IDs back to client — reject arbitrary strings
        details: dict[str, str] = {"resource": resource}
        if _UUID_REGEX.fullmatch(resource_id):
            details["id"] = resource_id

        super().__init__(
            message=f"{resource} not found",
            code="NOT_FOUND",
            status_code=404,
            details=details,
        )


class ForbiddenError(PraedixaError):
    """Access forbidden."""

    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(message=message, code="FORBIDDEN", status_code=403)


class ConflictError(PraedixaError):
    """Resource conflict (e.g., duplicate)."""

    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="CONFLICT", status_code=409)


def _error_response(
    status_code: int,
    code: str,
    message: str,
    details: dict[str, str] | None = None,
    validation_errors: list[dict[str, str]] | None = None,
    request_id: str | None = None,
) -> JSONResponse:
    """Build a standardized error response."""
    from datetime import datetime

    body: dict[str, Any] = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }
    if details:
        body["error"]["details"] = details
    if validation_errors:
        body["error"]["validationErrors"] = validation_errors
    if request_id:
        body["requestId"] = request_id
    return JSONResponse(status_code=status_code, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""

    @app.exception_handler(PraedixaError)
    async def praedixa_error_handler(
        request: Request, exc: PraedixaError
    ) -> JSONResponse:
        logger.warning(
            "praedixa_error",
            code=exc.code,
            message=exc.message,
            status_code=exc.status_code,
        )
        return _error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            details=exc.details,
            request_id=_safe_request_id(request),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        if exc.status_code == _HTTP_UNAUTHORIZED:
            auth_header = request.headers.get("Authorization", "")
            auth_scheme = auth_header.split(" ", 1)[0] if auth_header else None
            logger.warning(
                "auth_failed",
                path=request.url.path,
                detail=str(exc.detail),
                has_authorization_header=bool(auth_header),
                authorization_scheme=auth_scheme,
            )
        return _error_response(
            status_code=exc.status_code,
            code="HTTP_ERROR",
            message=str(exc.detail),
            request_id=_safe_request_id(request),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = [
            {
                "field": ".".join(str(loc) for loc in err["loc"]),
                "message": err["msg"],
                "code": err["type"],
            }
            for err in exc.errors()
        ]
        return _error_response(
            status_code=422,
            code="VALIDATION_ERROR",
            message="Request validation failed",
            validation_errors=errors,
            request_id=_safe_request_id(request),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(  # pragma: no cover
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("unhandled_error", exc_info=exc)
        # Never expose stack traces in production
        message = str(exc) if settings.DEBUG else "An unexpected error occurred"
        return _error_response(
            status_code=500,
            code="INTERNAL_ERROR",
            message=message,
            request_id=_safe_request_id(request),
        )
