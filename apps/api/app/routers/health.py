"""Health check endpoint.

Security notes:
- The health endpoint is unauthenticated (required for load balancer probes).
- Database error details are logged server-side but NEVER returned to the client.
  Only "pass" / "fail" status is exposed.
- Version and environment are safe to return — they are not secrets.
"""

from datetime import UTC, datetime

import structlog
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import async_session_factory

logger = structlog.get_logger()

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> JSONResponse:
    """Health check with database connectivity test.

    Returns overall status and individual check results.
    Returns HTTP 503 when degraded so load balancers stop routing traffic.
    Database errors are logged internally but the error message
    is NOT exposed to the client (information disclosure prevention).
    """
    checks: list[dict[str, str]] = []

    # Database connectivity check
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        checks.append({"name": "database", "status": "pass"})
    except Exception:
        logger.exception("Health check: database connectivity failed")
        checks.append({"name": "database", "status": "fail"})

    is_healthy = all(c["status"] == "pass" for c in checks)
    overall = "healthy" if is_healthy else "degraded"

    body = {
        "status": overall,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(UTC).isoformat(),
        "checks": checks,
    }

    return JSONResponse(content=body, status_code=200 if is_healthy else 503)
