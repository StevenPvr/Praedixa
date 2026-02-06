"""Middleware for audit logging and request tracking."""

import time

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = structlog.get_logger()

# Paths to exclude from audit logging
AUDIT_EXCLUDE_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Log every authenticated request for audit trail."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip audit for excluded paths
        if request.url.path in AUDIT_EXCLUDE_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        # Extract user info from JWT if present (don't fail if missing)
        user_id = None
        org_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from app.core.auth import verify_jwt

                payload = verify_jwt(auth_header[7:])
                user_id = payload.user_id
                org_id = payload.organization_id
            except Exception:
                pass  # Don't fail audit on bad tokens

        # Log audit entry
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
