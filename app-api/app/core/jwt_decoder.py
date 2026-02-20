"""JWT token decoding and verification — extracted from auth.py.

Handles:
- Algorithm selection and validation (RS256, ES256, EdDSA, legacy HS256)
- JWKS URL resolution from explicit OIDC config or legacy Supabase config
- Token signature verification via PyJWKClient

Security notes:
- "none" algorithm is ALWAYS rejected.
- HS256 is only accepted when LEGACY_HS256_ENABLED=true in local development.
- JWKS hosts are validated against an allowlist (.supabase.co + localhost + custom).
"""

import sys
from typing import Any
from urllib.parse import urlparse

import jwt  # noqa: F401 — re-exported via auth.py for test patching
import structlog
from fastapi import HTTPException, status
from jwt import InvalidTokenError, PyJWKClient

from app.core.config import settings  # noqa: F401 — re-exported for test patching

_AUTH_ERROR_DETAIL = "Invalid or expired token"
_ALLOWED_ASYMMETRIC_ALGORITHMS: frozenset[str] = frozenset({"RS256", "ES256", "EdDSA"})
_PLACEHOLDER_SUPABASE_URLS = {"", "https://your-project.supabase.co"}

logger = structlog.get_logger()
_jwk_clients: dict[str, PyJWKClient] = {}


def _get_auth_module() -> Any:
    """Get auth module, falling back to jwt_decoder during early import."""
    auth = sys.modules.get("app.core.auth")
    if auth is not None:
        return auth
    return sys.modules["app.core.jwt_decoder"]


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=_AUTH_ERROR_DETAIL,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _setting_str(name: str, default: str = "") -> str:
    _mod = _get_auth_module()
    raw = getattr(_mod.settings, name, default)
    if not isinstance(raw, str):
        return default
    return raw.strip()


def _setting_str_list(name: str) -> set[str]:
    _mod = _get_auth_module()
    raw = getattr(_mod.settings, name, [])
    if not isinstance(raw, (list, tuple, set)):
        return set()
    values: set[str] = set()
    for item in raw:
        if isinstance(item, str):
            normalized = item.strip().lower()
            if normalized:
                values.add(normalized)
    return values


def _is_local_development() -> bool:
    environment = _setting_str("ENVIRONMENT", "development").lower()
    return environment == "development"


def _allow_dev_issuer_fallback() -> bool:
    if not _is_local_development():
        return False
    _mod = _get_auth_module()
    return getattr(_mod.settings, "ALLOW_DEV_ISSUER_FALLBACK", False) is True


def _is_hs256_allowed() -> bool:
    if not _is_local_development():
        return False
    _mod = _get_auth_module()
    return getattr(_mod.settings, "LEGACY_HS256_ENABLED", False) is True


def _is_allowed_jwks_host(hostname: str | None) -> bool:
    if not hostname:
        return False
    host = hostname.lower()
    if host.endswith(".supabase.co"):
        return True
    if host in {"localhost", "127.0.0.1", "::1"}:
        return True
    allowed_custom_hosts = _setting_str_list("AUTH_ALLOWED_JWKS_HOSTS")
    return host in allowed_custom_hosts


def _jwks_url_from_base(base_url: str) -> str | None:
    """Derive a JWKS URL from a base URL (Supabase or Keycloak-compatible)."""
    if not isinstance(base_url, str):
        return None
    parsed = urlparse(base_url.strip())
    if parsed.scheme not in {"http", "https"}:
        return None
    if not _is_allowed_jwks_host(parsed.hostname):
        return None

    normalized_base = f"{parsed.scheme}://{parsed.netloc}"
    path = parsed.path.rstrip("/")

    # Supabase base URL.
    if not path:
        return f"{normalized_base}/auth/v1/.well-known/jwks.json"
    if path.endswith("/auth/v1"):
        return f"{normalized_base}{path}/.well-known/jwks.json"

    # Keycloak endpoints.
    if path.endswith("/protocol/openid-connect"):
        return f"{normalized_base}{path}/certs"
    if "/realms/" in path:
        return f"{normalized_base}{path}/protocol/openid-connect/certs"

    return None


def _jwks_url_from_issuer(issuer: str) -> str | None:
    return _jwks_url_from_base(issuer)


def _resolve_jwks_url(token: str) -> str:
    """Resolve JWKS URL from explicit config, legacy config, or dev issuer fallback."""
    _mod = _get_auth_module()

    custom_jwks_url = _setting_str("AUTH_JWKS_URL")
    if custom_jwks_url:
        parsed_custom = urlparse(custom_jwks_url)
        if parsed_custom.scheme not in {"http", "https"}:
            raise _auth_error()
        if not _is_allowed_jwks_host(parsed_custom.hostname):
            raise _auth_error()
        return custom_jwks_url

    configured_issuer = _setting_str("AUTH_ISSUER_URL")
    if configured_issuer:
        issuer_jwks_url = _jwks_url_from_issuer(configured_issuer)
        if not issuer_jwks_url:
            raise _auth_error()
        return issuer_jwks_url

    configured_supabase_url = _setting_str("SUPABASE_URL")
    if configured_supabase_url not in _PLACEHOLDER_SUPABASE_URLS:
        legacy_jwks_url = _jwks_url_from_base(configured_supabase_url)
        if not legacy_jwks_url:
            raise _auth_error()
        return legacy_jwks_url

    if not _allow_dev_issuer_fallback():
        raise _auth_error()

    # Dev fallback: derive issuer from unverified claims, then constrain host.
    try:
        unverified = _mod.jwt.decode(token, options={"verify_signature": False})
    except InvalidTokenError as e:
        raise _auth_error() from e

    issuer = unverified.get("iss")
    if not isinstance(issuer, str):
        raise _auth_error()

    jwks_url = _jwks_url_from_issuer(issuer)
    if not jwks_url:
        raise _auth_error()
    return jwks_url


def _resolve_audience() -> str:
    audience = _setting_str("AUTH_AUDIENCE", "authenticated")
    if not audience:
        raise _auth_error()
    return audience


def _resolve_issuer() -> str | None:
    issuer = _setting_str("AUTH_ISSUER_URL")
    return issuer or None


def _get_jwk_client(jwks_url: str) -> PyJWKClient:  # pragma: no cover
    """Get or create a cached PyJWKClient for a JWKS URL."""
    if jwks_url not in _jwk_clients:
        _jwk_clients[jwks_url] = PyJWKClient(
            jwks_url,
            cache_jwk_set=True,
            lifespan=300,
        )
    return _jwk_clients[jwks_url]


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT token."""
    _mod = _get_auth_module()

    try:
        header = _mod.jwt.get_unverified_header(token)
    except InvalidTokenError as e:
        logger.warning("jwt_unverified_header_failed", error=str(e))
        raise _auth_error() from e

    algorithm = header.get("alg")
    if not isinstance(algorithm, str):
        logger.warning("jwt_missing_alg")
        raise _auth_error()

    logger.debug("jwt_header", alg=algorithm, kid=header.get("kid"))

    if algorithm.lower() == "none":
        logger.warning("jwt_none_algorithm_rejected")
        raise _auth_error()

    # Legacy HS256 path (dev-only, explicitly gated).
    if algorithm == "HS256":
        if not _is_hs256_allowed():
            logger.warning("jwt_hs256_rejected")
            raise _auth_error()
        try:
            decoded = _mod.jwt.decode(
                token,
                _setting_str("SUPABASE_JWT_SECRET"),
                algorithms=["HS256"],
                audience=_resolve_audience(),
            )
        except InvalidTokenError as e:
            logger.warning("jwt_decode_failed_hs256", error=str(e))
            raise _auth_error() from e
        if not isinstance(decoded, dict):
            logger.warning("jwt_payload_not_dict_hs256")
            raise _auth_error()
        return decoded

    if algorithm not in _ALLOWED_ASYMMETRIC_ALGORITHMS:
        logger.warning("jwt_unsupported_algorithm", alg=algorithm)
        raise _auth_error()

    kid = header.get("kid")
    if not isinstance(kid, str) or not kid:
        logger.warning("jwt_missing_kid", alg=algorithm)
        raise _auth_error()

    jwks_url = _resolve_jwks_url(token)
    client = _mod._get_jwk_client(jwks_url)  # noqa: SLF001

    try:
        signing_key = client.get_signing_key(kid)
    except Exception as e:
        logger.warning(
            "jwt_jwks_key_resolution_failed",
            alg=algorithm,
            kid=kid,
            error=str(e),
            jwks_url=jwks_url,
        )
        raise _auth_error() from e

    try:
        decode_kwargs: dict[str, Any] = {
            "algorithms": [algorithm],
            "audience": _resolve_audience(),
        }
        issuer = _resolve_issuer()
        if issuer:
            decode_kwargs["issuer"] = issuer
        decoded = _mod.jwt.decode(token, signing_key.key, **decode_kwargs)
    except InvalidTokenError as e:
        logger.warning(
            "jwt_decode_failed_asymmetric",
            alg=algorithm,
            kid=kid,
            error=str(e),
        )
        raise _auth_error() from e

    if not isinstance(decoded, dict):
        logger.warning("jwt_payload_not_dict_asymmetric", alg=algorithm, kid=kid)
        raise _auth_error()
    return decoded
