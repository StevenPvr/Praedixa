"""Global exception handling — never expose internals in production."""

import re
from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.request_id import extract_valid_request_id

_UUID_REGEX: re.Pattern[str] = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    re.IGNORECASE,
)

logger = structlog.get_logger()
_HTTP_UNAUTHORIZED = 401


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
            request_id=extract_valid_request_id(request),
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
            request_id=extract_valid_request_id(request),
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
            request_id=extract_valid_request_id(request),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(  # pragma: no cover
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("unhandled_error", exc_info=exc)
        message = str(exc) if settings.DEBUG else "An unexpected error occurred"
        return _error_response(
            status_code=500,
            code="INTERNAL_ERROR",
            message=message,
            request_id=extract_valid_request_id(request),
        )
