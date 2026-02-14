"""Audit logging middleware — reads user context from request.state."""

import time

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = structlog.get_logger()
AUDIT_EXCLUDE_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.url.path in AUDIT_EXCLUDE_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        user_id = getattr(request.state, "audit_user_id", None)
        org_id = getattr(request.state, "audit_org_id", None)
        logger.info(
            "audit",
            user_id=user_id,
            organization_id=org_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent", "")[:200],
        )

        return response
