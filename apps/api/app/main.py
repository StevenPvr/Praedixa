"""FastAPI application factory.

Security notes:
- CORS uses explicit origin allowlist from settings (never "*").
- allow_methods is restricted to the HTTP verbs actually used.
- allow_headers="*" is acceptable here because CORS is origin-gated;
  sensitive headers are still protected by the browser same-origin policy.
- Request ID middleware adds traceability without leaking internals.
- Docs endpoints are disabled in production to reduce attack surface.
"""

import math
import time
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, FastAPI, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.config import settings
from app.core.database import async_session_factory, engine
from app.core.dependencies import get_db_session
from app.core.exceptions import register_exception_handlers
from app.core.middleware import AuditLogMiddleware
from app.core.rate_limit import setup_rate_limiting
from app.core.security import require_role
from app.routers import (
    admin,
    admin_alerts_overview,
    admin_billing,
    admin_canonical,
    admin_cost_params,
    admin_data,
    admin_decisions_enhanced,
    admin_monitoring,
    admin_onboarding,
    admin_operational,
    admin_orgs,
    admin_proof_packs,
    admin_scenarios,
    admin_users,
    alerts,
    arbitrage,
    canonical,
    cost_parameters,
    coverage_alerts,
    dashboard,
    datasets,
    decisions,
    forecasts,
    health,
    mock_forecast,
    operational_decisions,
    organizations,
    proof,
    scenarios,
    transforms,
)
from app.schemas.admin import AdminAuditLogRead
from app.schemas.base import PaginationMeta
from app.schemas.responses import PaginatedResponse
from app.services.admin_audit import get_audit_log

logger = structlog.get_logger()
_PLACEHOLDER_SUPABASE_URLS = {"", "https://your-project.supabase.co"}


async def _auto_seed_dev() -> None:  # pragma: no cover
    """Auto-seed demo data in development.

    Seeds operational data into every organization found, or creates a
    new one if the database is empty.  Idempotent: ``seed_all`` skips
    orgs that already have coverage alerts.

    Non-blocking: any failure is logged but does not prevent startup.
    """
    try:
        from sqlalchemy import select as sa_select

        from app.models.organization import Organization

        async with async_session_factory() as session:
            from scripts.seed_full_demo import seed_all

            result = await session.execute(sa_select(Organization.id))
            org_ids = list(result.scalars().all())

            if not org_ids:
                logger.info("auto_seed: no orgs found, creating demo org")
                await seed_all(session)
            else:
                for org_id in org_ids:
                    await seed_all(session, target_org_id=org_id)

            await session.commit()
            logger.info("auto_seed: complete", orgs=len(org_ids) or 1)
    except Exception:
        logger.exception("auto_seed: failed (non-blocking)")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer()
            if settings.DEBUG
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            structlog.stdlib.NAME_TO_LEVEL[settings.LOG_LEVEL],  # type: ignore[attr-defined]
        ),
    )
    logger.info("Starting Praedixa API", version=settings.APP_VERSION)
    _placeholder_secrets = {"", "your-supabase-jwt-secret-here"}
    if settings.SUPABASE_JWT_SECRET in _placeholder_secrets:  # pragma: no cover
        logger.warning(
            "SUPABASE_JWT_SECRET appears unset/placeholder; authenticated "
            "endpoints will return 401 until configured"
        )
    if settings.SUPABASE_URL.strip() in _PLACEHOLDER_SUPABASE_URLS:  # pragma: no cover
        logger.warning(
            "SUPABASE_URL appears unset/placeholder; RS256 JWT verification "
            "will fail unless issuer fallback is available (development only)"
        )
    if settings.DEBUG:  # pragma: no cover
        await _auto_seed_dev()
    yield
    await engine.dispose()
    logger.info("Praedixa API shutdown complete")


app = FastAPI(
    title="Praedixa API",
    description="Capacity forecast API for logistics sites",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    # Disable docs in production to reduce attack surface
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
)

# Register global exception handlers (standardized error responses)
register_exception_handlers(app)

# Rate limiting — must be after exception handlers so 429 responses use our format
setup_rate_limiting(app)

# Audit logging — logs user_id, org_id, endpoint, method, status
# Added BEFORE CORSMiddleware so it's INNER (LIFO order).
app.add_middleware(AuditLogMiddleware)

# CORS — explicit origin allowlist.
# Must be added AFTER AuditLogMiddleware so it's the OUTERMOST add_middleware.
# This ensures OPTIONS preflight is handled before BaseHTTPMiddleware layers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def request_id_middleware(
    request: Request,
    call_next: Any,
) -> Response:
    """Add unique request ID and timing to each request.

    If the client provides X-Request-ID we use it for traceability;
    otherwise we generate a UUID4. The ID is bound to structlog context
    so every log line in the request lifecycle carries it.
    """
    # Validate client-supplied request ID: must be a reasonable string.
    # Reject oversized or malformed IDs to prevent log injection attacks.
    _max_request_id_len = 64
    raw_request_id = request.headers.get("X-Request-ID")
    if (
        raw_request_id
        and len(raw_request_id) <= _max_request_id_len
        and raw_request_id.isascii()
        and raw_request_id.isprintable()
    ):
        request_id = raw_request_id
    else:
        request_id = str(uuid.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(duration_ms)
    # Security headers — defense in depth for API responses
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )

    logger.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
    )
    return response


# Routers
app.include_router(health.router)
app.include_router(dashboard.router)
app.include_router(forecasts.router)
app.include_router(alerts.router)
app.include_router(organizations.router)
app.include_router(decisions.router)
app.include_router(arbitrage.router)
app.include_router(datasets.router)
app.include_router(transforms.router)
app.include_router(canonical.router)
app.include_router(cost_parameters.router)
app.include_router(coverage_alerts.router)
app.include_router(scenarios.router)
app.include_router(operational_decisions.router)
app.include_router(proof.router)
app.include_router(mock_forecast.router)
app.include_router(admin.router)  # Existing RGPD erasure under /api/v1/admin

# ── Admin back-office routers ────────────────────────────
# Composed under /api/v1/admin prefix. Each sub-router has no prefix.
admin_backoffice = APIRouter(prefix="/api/v1/admin", tags=["admin"])
admin_backoffice.include_router(admin_orgs.router)
admin_backoffice.include_router(admin_users.router)
admin_backoffice.include_router(admin_billing.router)
admin_backoffice.include_router(admin_monitoring.router)
admin_backoffice.include_router(admin_data.router)
admin_backoffice.include_router(admin_onboarding.router)
admin_backoffice.include_router(admin_operational.router)
admin_backoffice.include_router(admin_canonical.router)
admin_backoffice.include_router(admin_alerts_overview.router)
admin_backoffice.include_router(admin_scenarios.router)
admin_backoffice.include_router(admin_decisions_enhanced.router)
admin_backoffice.include_router(admin_proof_packs.router)
admin_backoffice.include_router(admin_cost_params.router)


@admin_backoffice.get("/audit-log", tags=["admin-audit"])
async def list_audit_log(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    admin_user_id: uuid.UUID | None = Query(default=None),
    target_org_id: uuid.UUID | None = Query(default=None),
    action: str | None = Query(default=None, max_length=50),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
    _current_user: JWTPayload = Depends(require_role("super_admin")),
) -> PaginatedResponse[AdminAuditLogRead]:
    """List admin audit log entries with filters.

    Security: Requires super_admin role. The audit log itself is not
    audited (to prevent infinite recursion).
    """
    items, total = await get_audit_log(
        session,
        page=page,
        page_size=page_size,
        admin_user_id=str(admin_user_id) if admin_user_id else None,
        target_org_id=str(target_org_id) if target_org_id else None,
        action=action,
        date_from=date_from,
        date_to=date_to,
    )

    total_pages = max(1, math.ceil(total / page_size))
    data = [AdminAuditLogRead.model_validate(entry) for entry in items]

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


app.include_router(admin_backoffice)
