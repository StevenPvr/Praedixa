"""Rate limiting via slowapi — DoS protection, trusted-proxy IP handling."""

from __future__ import annotations

from datetime import UTC, datetime
from ipaddress import IPv4Network, IPv6Network, ip_address, ip_network
from typing import TYPE_CHECKING

import structlog
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import (
    BaseHTTPMiddleware,
    RequestResponseEndpoint,
)

if TYPE_CHECKING:
    from fastapi import FastAPI, Request, Response

from app.core.config import settings
from app.core.request_id import extract_valid_request_id

logger = structlog.get_logger()

GLOBAL_RATE_LIMIT = "100/minute"
AUTH_RATE_LIMIT = "10/minute"
SENSITIVE_RATE_LIMIT = "5/minute"
MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024
_EXEMPT_PATHS = frozenset({"/health", "/api/v1/health"})


def _resolve_storage_uri() -> str | None:
    storage_uri = settings.RATE_LIMIT_STORAGE_URI.strip()
    if settings.ENVIRONMENT in {"staging", "production"} and not storage_uri:
        msg = "RATE_LIMIT_STORAGE_URI is required in staging/production"
        raise RuntimeError(msg)
    return storage_uri or None


def _parse_trusted_proxy_networks(
    proxy_values: list[str],
) -> tuple[IPv4Network | IPv6Network, ...]:
    networks = []
    for raw in proxy_values:
        value = raw.strip()
        if "/" in value:
            networks.append(ip_network(value, strict=False))
        else:
            addr = ip_address(value)
            networks.append(ip_network(f"{addr}/{addr.max_prefixlen}", strict=False))
    return tuple(networks)


_TRUSTED_PROXY_NETWORKS = _parse_trusted_proxy_networks(settings.TRUSTED_PROXY_IPS)


def _normalized_ip(value: str | None) -> str | None:
    if value is None:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    try:
        return str(ip_address(candidate))
    except ValueError:
        return None


def _is_trusted_proxy_host(host: str | None) -> bool:
    normalized = _normalized_ip(host)
    if normalized is None:
        return False
    addr = ip_address(normalized)
    return any(addr in network for network in _TRUSTED_PROXY_NETWORKS)


def _get_client_ip(request: Request) -> str:
    if request.client is None:
        return "unknown"

    remote_host = request.client.host
    normalized_remote = _normalized_ip(remote_host)
    if normalized_remote is None:
        return remote_host

    if not _is_trusted_proxy_host(remote_host):
        return normalized_remote

    cf_ip = _normalized_ip(request.headers.get("cf-connecting-ip"))
    if cf_ip:
        return cf_ip

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        first_hop = forwarded_for.split(",")[0]
        normalized_first_hop = _normalized_ip(first_hop)
        if normalized_first_hop:
            return normalized_first_hop

    return normalized_remote


limiter = Limiter(
    key_func=_get_client_ip,
    default_limits=[GLOBAL_RATE_LIMIT],
    headers_enabled=True,
    storage_uri=_resolve_storage_uri(),
)


def rate_limit_exceeded_handler(
    request: Request,
    exc: RateLimitExceeded,
) -> JSONResponse:
    request_id = extract_valid_request_id(request)

    logger.warning(
        "rate_limit_exceeded",
        path=request.url.path,
        method=request.method,
        client_ip=_get_client_ip(request),
        limit=str(exc.detail),
    )

    body: dict[str, object] = {
        "success": False,
        "error": {
            "code": "RATE_LIMIT_EXCEEDED",
            "message": "Too many requests. Please try again later.",
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }
    if request_id:
        body["requestId"] = request_id

    retry_after = getattr(exc, "retry_after", None)
    headers: dict[str, str] = {}
    if retry_after:
        headers["Retry-After"] = str(int(retry_after))

    return JSONResponse(
        status_code=429,
        content=body,
        headers=headers,
    )


class RequestBodySizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: FastAPI,
        max_body_size: int = MAX_REQUEST_BODY_SIZE,
    ) -> None:
        super().__init__(app)
        self.max_body_size = max_body_size

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        if request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                if length > self.max_body_size:
                    return _payload_too_large_response()
            except ValueError:
                pass

        if content_length is None and request.method in {"POST", "PUT", "PATCH"}:
            body = await request.body()
            if len(body) > self.max_body_size:
                return _payload_too_large_response()

            async def _receive() -> dict[str, object]:
                return {
                    "type": "http.request",
                    "body": body,
                    "more_body": False,
                }

            request._receive = _receive  # noqa: SLF001

        return await call_next(request)


def setup_rate_limiting(app: FastAPI) -> None:
    app.state.limiter = limiter
    app.add_exception_handler(
        RateLimitExceeded,
        rate_limit_exceeded_handler,  # type: ignore[arg-type]
    )
    app.add_middleware(RequestBodySizeLimitMiddleware)  # type: ignore[arg-type]
    app.add_middleware(SlowAPIMiddleware)


def _payload_too_large_response() -> JSONResponse:
    return JSONResponse(
        status_code=413,
        content={
            "success": False,
            "error": {
                "code": "PAYLOAD_TOO_LARGE",
                "message": "Request body too large",
            },
            "timestamp": datetime.now(UTC).isoformat(),
        },
    )
