"""FastAPI application factory."""

import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import structlog
from fastapi import APIRouter, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import async_session_factory, engine
from app.core.exceptions import register_exception_handlers
from app.core.middleware import AuditLogMiddleware
from app.core.rate_limit import setup_rate_limiting
from app.core.request_id import get_or_generate_request_id
from app.routers import (
    admin,
    admin_alerts_overview,
    admin_audit,
    admin_billing,
    admin_canonical,
    admin_conversations,
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
    conversations,
    cost_parameters,
    coverage_alerts,
    dashboard,
    datasets,
    decision_workspace,
    decisions,
    forecasts,
    health,
    live_client,
    mock_forecast,
    operational_decisions,
    organizations,
    product_events,
    proof,
    scenarios,
    transforms,
    user_preferences,
)

logger = structlog.get_logger()
_PLACEHOLDER_SUPABASE_URLS = {"", "https://your-project.supabase.co"}


def _is_mock_forecast_enabled() -> bool:
    return not settings.is_production or settings.ENABLE_MOCK_FORECAST_ROUTER


async def _auto_seed_dev() -> None:  # pragma: no cover
    logger.info("auto_seed: starting development seed")
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
                await session.commit()
            else:
                for org_id in org_ids:
                    try:
                        await seed_all(session, target_org_id=org_id)
                        await session.commit()
                    except Exception:
                        await session.rollback()
                        logger.exception("auto_seed: org failed", org_id=str(org_id))
                        continue

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
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
)

register_exception_handlers(app)
setup_rate_limiting(app)
# Middleware order: last add_first runs innermost (closest to route handler).
# Execution order: SlowAPI → RequestBodySize → CORS → AuditLog → request_id.
# CORS runs before AuditLog so CORS headers are set correctly on responses.
app.add_middleware(AuditLogMiddleware)
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
    request_id = get_or_generate_request_id(request)
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(duration_ms)
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
app.include_router(live_client.router)
app.include_router(dashboard.router)
app.include_router(forecasts.router)
app.include_router(alerts.router)
app.include_router(organizations.router)
app.include_router(decisions.router)
app.include_router(arbitrage.router)
app.include_router(datasets.router)
app.include_router(datasets.ingestion_router)
app.include_router(transforms.router)
app.include_router(canonical.router)
app.include_router(cost_parameters.router)
app.include_router(coverage_alerts.router)
app.include_router(decision_workspace.router)
app.include_router(scenarios.router)
app.include_router(operational_decisions.router)
app.include_router(proof.router)
if _is_mock_forecast_enabled():
    app.include_router(mock_forecast.router)
app.include_router(conversations.router)
app.include_router(user_preferences.router)
app.include_router(product_events.router)
app.include_router(admin.router)  # Existing RGPD erasure under /api/v1/admin

admin_backoffice = APIRouter(prefix="/api/v1/admin", tags=["admin"])
admin_backoffice.include_router(admin_audit.router)
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
admin_backoffice.include_router(admin_conversations.router)


app.include_router(admin_backoffice)
