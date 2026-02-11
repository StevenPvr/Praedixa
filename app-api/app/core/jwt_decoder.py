"""JWT token decoding and verification — extracted from auth.py.

Handles:
- Algorithm selection and validation (RS256, ES256, EdDSA, legacy HS256)
- JWKS URL resolution from config or token issuer (dev fallback)
- Token signature verification via PyJWKClient

Security notes:
- "none" algorithm is ALWAYS rejected.
- HS256 is only accepted when LEGACY_HS256_ENABLED=true in local development.
- JWKS hosts are validated against an allowlist (.supabase.co + localhost).

Implementation note:
- Functions that need `settings` or `jwt` access them through `sys.modules`
  from the auth.py module namespace. This ensures that when tests patch
  "app.core.auth.settings" or "app.core.auth.jwt", these functions see the
  patched versions without requiring test changes.
"""

import sys
from typing import Any
from urllib.parse import urlparse

import jwt  # noqa: F401 — re-exported via auth.py for test patching
import structlog
from fastapi import HTTPException, status
from jwt import InvalidTokenError, PyJWKClient

from app.core.config import (
    settings,  # noqa: F401 — re-exported via auth.py for test patching
)

_AUTH_ERROR_DETAIL = "Invalid or expired token"

# Allowed asymmetric algorithms — HS256 and "none" are rejected unless
# LEGACY_HS256_ENABLED is true (development transition only).
_ALLOWED_ASYMMETRIC_ALGORITHMS: frozenset[str] = frozenset({"RS256", "ES256", "EdDSA"})

_PLACEHOLDER_SUPABASE_URLS = {"", "https://your-project.supabase.co"}

logger = structlog.get_logger()

# PyJWKClient instance — lazily initialized per JWKS URL.
# Thread-safe by design (uses urllib3 with connection pooling).
_jwk_clients: dict[str, PyJWKClient] = {}


def _get_auth_module() -> Any:
    """Get the auth module, falling back to jwt_decoder if auth hasn't loaded yet.

    This enables tests to patch "app.core.auth.settings" and have it propagate
    to jwt_decoder functions. During normal app startup, auth.py imports from
    jwt_decoder first, so this fallback ensures no circular import issues.
    """
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


def _is_local_development() -> bool:
    _mod = _get_auth_module()
    environment = str(getattr(_mod.settings, "ENVIRONMENT", "development")).lower()
    return environment == "development"


def _allow_dev_issuer_fallback() -> bool:
    _mod = _get_auth_module()
    if not _is_local_development():
        return False
    return getattr(_mod.settings, "ALLOW_DEV_ISSUER_FALLBACK", False) is True


def _is_allowed_jwks_host(hostname: str | None) -> bool:
    if not hostname:
        return False
    return hostname.endswith(".supabase.co") or hostname in {
        "localhost",
        "127.0.0.1",
        "::1",
    }


def _jwks_url_from_base(base_url: str) -> str | None:
    """Derive the JWKS URL from a Supabase base URL."""
    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"}:
        return None
    if not _is_allowed_jwks_host(parsed.hostname):
        return None

    normalized_base = f"{parsed.scheme}://{parsed.netloc}"
    base_path = parsed.path.rstrip("/")

    if not base_path:
        return f"{normalized_base}/auth/v1/.well-known/jwks.json"

    if base_path.endswith("/auth/v1"):
        return f"{normalized_base}{base_path}/.well-known/jwks.json"

    return None


def _jwks_url_from_issuer(issuer: str) -> str | None:
    """Derive the JWKS URL from a JWT issuer claim."""
    parsed = urlparse(issuer)
    if parsed.scheme not in {"http", "https"}:
        return None
    if not _is_allowed_jwks_host(parsed.hostname):
        return None
    issuer_path = parsed.path.rstrip("/")
    if not issuer_path.endswith("/auth/v1"):
        return None
    return f"{parsed.scheme}://{parsed.netloc}{issuer_path}/.well-known/jwks.json"


def _resolve_jwks_url(token: str) -> str:
    """Resolve the JWKS URL from config or token issuer (dev fallback)."""
    _mod = _get_auth_module()
    configured_url = _mod.settings.SUPABASE_URL.strip()
    if configured_url not in _PLACEHOLDER_SUPABASE_URLS:
        jwks_url = _jwks_url_from_base(configured_url)
        if not jwks_url:
            raise _auth_error()
        return jwks_url

    if not _allow_dev_issuer_fallback():
        raise _auth_error()

    # Dev fallback: extract issuer from unverified claims.
    # This is safe because we verify the token signature against
    # the JWKS endpoint we resolve — an attacker cannot redirect us
    # to a non-allowlisted host.
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


def _get_jwk_client(jwks_url: str) -> PyJWKClient:  # pragma: no cover
    """Get or create a PyJWKClient for the given JWKS URL.

    PyJWKClient handles caching and key rotation internally.
    The lifespan parameter controls how long fetched keys are cached (5 min).
    """
    if jwks_url not in _jwk_clients:
        _jwk_clients[jwks_url] = PyJWKClient(
            jwks_url,
            cache_jwk_set=True,
            lifespan=300,  # Cache JWKS for 5 minutes
        )
    return _jwk_clients[jwks_url]


def _is_hs256_allowed() -> bool:
    """Check if legacy HS256 is allowed (dev transition only).

    HS256 is only allowed in local development when explicitly enabled.
    """
    _mod = _get_auth_module()
    if not _is_local_development():
        return False
    return getattr(_mod.settings, "LEGACY_HS256_ENABLED", False) is True


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT token.

    Algorithm selection:
    - "none" is ALWAYS rejected (PyJWT default when algorithms= is specified).
    - HS256 is only accepted when _is_hs256_allowed() returns True.
    - RS256, ES256, EdDSA use JWKS-based verification with kid resolution.
    """
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

    # Block "none" algorithm explicitly (defense in depth)
    if algorithm.lower() == "none":
        logger.warning("jwt_none_algorithm_rejected")
        raise _auth_error()

    # ── HS256 (legacy, dev only) ─────────────────────
    if algorithm == "HS256":
        if not _is_hs256_allowed():
            logger.warning("jwt_hs256_rejected_in_production")
            raise _auth_error()

        try:
            decoded = _mod.jwt.decode(
                token,
                _mod.settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except InvalidTokenError as e:
            logger.warning("jwt_decode_failed_hs256", error=str(e))
            raise _auth_error() from e

        if not isinstance(decoded, dict):
            logger.warning("jwt_payload_not_dict_hs256")
            raise _auth_error()
        return decoded

    # ── Asymmetric algorithms (RS256, ES256, EdDSA) ──
    if algorithm not in _ALLOWED_ASYMMETRIC_ALGORITHMS:
        logger.warning("jwt_unsupported_algorithm", alg=algorithm)
        raise _auth_error()

    kid = header.get("kid")
    if not isinstance(kid, str) or not kid:
        logger.warning("jwt_missing_kid", alg=algorithm)
        raise _auth_error()

    jwks_url = _resolve_jwks_url(token)
    client = _mod._get_jwk_client(jwks_url)  # noqa: SLF001 — access via auth module for test patchability

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
        decoded = _mod.jwt.decode(
            token,
            signing_key.key,
            algorithms=[algorithm],
            audience="authenticated",
        )
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
