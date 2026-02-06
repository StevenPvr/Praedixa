"""FastAPI application factory.

Security notes:
- CORS uses explicit origin allowlist from settings (never "*").
- allow_methods is restricted to the HTTP verbs actually used.
- allow_headers="*" is acceptable here because CORS is origin-gated;
  sensitive headers are still protected by the browser same-origin policy.
- Request ID middleware adds traceability without leaking internals.
- Docs endpoints are disabled in production to reduce attack surface.
"""

import time
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import register_exception_handlers
from app.core.middleware import AuditLogMiddleware
from app.routers import health

logger = structlog.get_logger()


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
            structlog.stdlib.NAME_TO_LEVEL[settings.LOG_LEVEL],
        ),
    )
    logger.info("Starting Praedixa API", version=settings.APP_VERSION)
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
)

# Register global exception handlers (standardized error responses)
register_exception_handlers(app)

# CORS — explicit origin allowlist, restricted methods
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# Audit logging — logs user_id, org_id, endpoint, method, status
app.add_middleware(AuditLogMiddleware)


@app.middleware("http")
async def request_id_middleware(
    request: Request,
    call_next,  # type: ignore[no-untyped-def]
) -> Response:
    """Add unique request ID and timing to each request.

    If the client provides X-Request-ID we use it for traceability;
    otherwise we generate a UUID4. The ID is bound to structlog context
    so every log line in the request lifecycle carries it.
    """
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(duration_ms)

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
