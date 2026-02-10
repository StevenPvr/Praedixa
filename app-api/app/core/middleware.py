"""Middleware for audit logging and request tracking.

Security notes:
- Audit logging never decodes JWT itself to avoid double-verification overhead.
  Instead, it reads user context from request.state, which is set by the
  auth dependency chain during normal request handling.
- User-Agent is truncated to prevent log storage abuse.
- IP address is logged for forensic analysis.
"""

import time

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = structlog.get_logger()

# Paths to exclude from audit logging
AUDIT_EXCLUDE_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Log every authenticated request for audit trail.

    User context (user_id, org_id) is read from request.state if available.
    The auth dependency chain sets these values — this avoids decoding the
    JWT a second time (wastes CPU, risks time-of-check/time-of-use issues).
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip audit for excluded paths
        if request.url.path in AUDIT_EXCLUDE_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        # Read user context from request.state (set by auth dependency)
        # Falls back to None for unauthenticated endpoints
        user_id = getattr(request.state, "audit_user_id", None)
        org_id = getattr(request.state, "audit_org_id", None)

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
