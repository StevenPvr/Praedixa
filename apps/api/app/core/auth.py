"""JWT verification for Supabase tokens.

Security notes:
- Supports both HS256 (legacy symmetric projects) and RS256 (modern
  asymmetric projects) by reading JWT header `alg`.
- For RS256, public keys are loaded from Supabase JWKS and cached in-memory.
- Audience claim is validated to "authenticated" to reject tokens issued
  for other Supabase services (e.g. service_role, anon).
- app_metadata (organization_id, role) cannot be tampered with by users
  via Supabase client APIs — only privileged Supabase contexts can write it.
- All claim extraction uses .get() with explicit None checks to prevent
  KeyError from malformed tokens.
"""

import time
import uuid
from dataclasses import dataclass
from threading import Lock
from typing import Any
from urllib.parse import urlparse

import httpx
import structlog
from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from app.core.config import settings

_AUTH_ERROR_DETAIL = "Invalid or expired token"
_ASYMMETRIC_ALGORITHMS = {"RS256", "ES256"}
_JWKS_CACHE_TTL_SECONDS = 300.0
_JWKS_CACHE: dict[str, Any] | None = None
_JWKS_FETCHED_AT = 0.0
_JWKS_CACHE_URL: str | None = None
_JWKS_LOCK = Lock()
_PLACEHOLDER_SUPABASE_URLS = {"", "https://your-project.supabase.co"}
_MAX_EMAIL_LENGTH = 320
_KNOWN_ROLES = {
    "super_admin", "org_admin", "hr_manager", "manager", "employee", "viewer",
}
# Supabase default "authenticated" role → treat as org_admin for the POC.
# In production, app_metadata.role should be explicitly set per user.
_ROLE_ALIASES: dict[str, str] = {
    "authenticated": "org_admin",
}
logger = structlog.get_logger()


@dataclass(frozen=True)
class JWTPayload:
    """Decoded JWT claims.

    Frozen dataclass to prevent accidental mutation of security context
    after token verification.
    """

    user_id: str
    email: str
    organization_id: str
    role: str


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=_AUTH_ERROR_DETAIL,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _is_allowed_jwks_host(hostname: str | None) -> bool:
    if not hostname:
        return False
    return hostname.endswith(".supabase.co") or hostname in {
        "localhost",
        "127.0.0.1",
        "::1",
    }


def _jwks_url_from_issuer(issuer: str) -> str | None:
    parsed = urlparse(issuer)
    if parsed.scheme not in {"http", "https"}:
        return None
    if not _is_allowed_jwks_host(parsed.hostname):
        return None
    issuer_path = parsed.path.rstrip("/")
    if not issuer_path.endswith("/auth/v1"):
        return None
    return f"{parsed.scheme}://{parsed.netloc}{issuer_path}/.well-known/jwks.json"


def _jwks_url_from_base(base_url: str) -> str | None:
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


def _resolve_jwks_url(token: str) -> str:
    configured_url = settings.SUPABASE_URL.strip()
    if configured_url not in _PLACEHOLDER_SUPABASE_URLS:
        jwks_url = _jwks_url_from_base(configured_url)
        if not jwks_url:
            raise _auth_error()
        return jwks_url

    environment = str(getattr(settings, "ENVIRONMENT", "development")).lower()
    if environment == "production":
        raise _auth_error()

    try:
        claims = jwt.get_unverified_claims(token)
    except JWTError as e:
        raise _auth_error() from e

    issuer = claims.get("iss")
    if not isinstance(issuer, str):
        raise _auth_error()

    jwks_url = _jwks_url_from_issuer(issuer)
    if not jwks_url:
        raise _auth_error()
    return jwks_url


def _load_jwks(jwks_url: str) -> dict[str, Any]:
    try:
        response = httpx.get(jwks_url, timeout=5.0)
        response.raise_for_status()
        payload = response.json()
    except Exception as e:  # pragma: no cover - network path
        logger.warning("jwks_fetch_failed", error=str(e), jwks_url=jwks_url)
        raise _auth_error() from e

    if not isinstance(payload, dict):
        raise _auth_error()
    keys = payload.get("keys")
    if not isinstance(keys, list):
        raise _auth_error()
    return payload


def _get_cached_jwks(jwks_url: str, *, force_refresh: bool = False) -> dict[str, Any]:
    global _JWKS_CACHE, _JWKS_FETCHED_AT, _JWKS_CACHE_URL

    now = time.monotonic()
    with _JWKS_LOCK:
        if (
            not force_refresh
            and _JWKS_CACHE is not None
            and jwks_url == _JWKS_CACHE_URL
            and now - _JWKS_FETCHED_AT < _JWKS_CACHE_TTL_SECONDS
        ):
            return _JWKS_CACHE

        loaded = _load_jwks(jwks_url)
        _JWKS_CACHE = loaded
        _JWKS_FETCHED_AT = now
        _JWKS_CACHE_URL = jwks_url
        return loaded


def _decode_with_jwks(token: str, algorithm: str, kid: str | None) -> dict[str, Any]:
    if not kid:
        logger.warning("jwt_missing_kid", alg=algorithm)
        raise _auth_error()
    jwks_url = _resolve_jwks_url(token)

    for attempt in range(2):
        jwks_payload = _get_cached_jwks(
            jwks_url,
            force_refresh=attempt == 1,
        )
        raw_keys = jwks_payload.get("keys", [])
        keys = [k for k in raw_keys if isinstance(k, dict)]
        jwk_key = next((k for k in keys if k.get("kid") == kid), None)

        if jwk_key is None:
            logger.warning(
                "jwt_kid_not_found_in_jwks",
                alg=algorithm,
                kid=kid,
                attempt=attempt + 1,
                jwks_url=jwks_url,
            )
            continue

        try:
            decoded = jwt.decode(
                token,
                jwk_key,
                algorithms=[algorithm],
                audience="authenticated",
            )
        except JWTError as e:
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

    logger.warning("jwt_no_matching_jwk", alg=algorithm, kid=kid, jwks_url=jwks_url)
    raise _auth_error()


def _decode_token(token: str) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        logger.warning("jwt_unverified_header_failed", error=str(e))
        raise _auth_error() from e

    algorithm = header.get("alg")
    if not isinstance(algorithm, str):
        logger.warning("jwt_missing_alg")
        raise _auth_error()
    logger.debug("jwt_header", alg=algorithm, kid=header.get("kid"))

    if algorithm == "HS256":
        try:
            decoded = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except JWTError as e:
            logger.warning("jwt_decode_failed_hs256", error=str(e))
            raise _auth_error() from e

        if not isinstance(decoded, dict):
            logger.warning("jwt_payload_not_dict_hs256")
            raise _auth_error()
        return decoded

    if algorithm in _ASYMMETRIC_ALGORITHMS:
        kid = header.get("kid")
        kid_str = kid if isinstance(kid, str) else None
        return _decode_with_jwks(token, algorithm, kid_str)

    raise _auth_error()


def verify_jwt(token: str) -> JWTPayload:
    """Verify and decode a Supabase JWT token.

    Validates:
    - Signature (HS256 with SUPABASE_JWT_SECRET OR RS256 via JWKS)
    - Audience ("authenticated")
    - Expiry (handled automatically by python-jose)
    - Required claims: sub, email, organization_id (canonical or aliases)

    Returns a frozen JWTPayload on success.
    Raises HTTPException 401 on any failure — generic message to prevent
    information leakage about which specific check failed.
    """
    payload = _decode_token(token)

    # Extract claims.
    # In production we only trust org claims issued server-side
    # (app_metadata/top-level custom claims). In development we also accept
    # user_metadata to simplify local testing with incomplete token hooks.
    # Type-check metadata claims: a crafted token could set these to non-dict
    # values (e.g. string, list), which would cause AttributeError on .get() calls.
    raw_app_metadata = payload.get("app_metadata")
    app_metadata = raw_app_metadata if isinstance(raw_app_metadata, dict) else {}
    raw_user_metadata = payload.get("user_metadata")
    user_metadata = raw_user_metadata if isinstance(raw_user_metadata, dict) else {}

    user_id = payload.get("sub")

    # Validate user_id is a valid UUID string — Supabase uses UUID for user IDs.
    # Prevents malformed sub claims from causing 500 errors in downstream UUID() calls.
    if not isinstance(user_id, str):
        raise _auth_error()
    try:
        user_id = str(uuid.UUID(user_id))
    except (ValueError, TypeError) as e:
        logger.warning("jwt_invalid_user_id")
        raise _auth_error() from e

    email = payload.get("email")

    # Basic email validation: must be a string, contain @, and have a sane length.
    # We don't need full RFC 5322 validation here — Supabase validates the email
    # at registration. This prevents malformed/injected values from reaching logs.
    if not isinstance(email, str) or "@" not in email or len(email) > _MAX_EMAIL_LENGTH:
        raise _auth_error()

    organization_id = (
        payload.get("organization_id")
        or app_metadata.get("organization_id")
        or app_metadata.get("org_id")
    )

    environment = str(getattr(settings, "ENVIRONMENT", "development")).lower()
    is_production = environment == "production"
    if not organization_id and not is_production:
        organization_id = (
            user_metadata.get("organization_id") or user_metadata.get("org_id")
        )

    # Prefer app_metadata.role (admin-set, authoritative) over the top-level
    # JWT role claim.  Supabase puts the PostgreSQL RLS role ("authenticated")
    # in the top-level `role` field — this is NOT an application role.
    role = app_metadata.get("role") or payload.get("role") or "viewer"

    if isinstance(role, str):
        role = _ROLE_ALIASES.get(role, role)
    if not isinstance(role, str) or role not in _KNOWN_ROLES:
        logger.warning("jwt_unknown_role", role=str(role)[:50])
        role = "viewer"

    if not user_id or not email or not organization_id:
        raise _auth_error()

    if not isinstance(organization_id, str):
        raise _auth_error()
    try:
        organization_id = str(uuid.UUID(organization_id))
    except (ValueError, TypeError) as e:
        logger.warning("jwt_invalid_organization_id", organization_id=organization_id)
        raise _auth_error() from e

    return JWTPayload(
        user_id=user_id,
        email=email,
        organization_id=organization_id,
        role=role,
    )


def extract_token(request: Request) -> str:
    """Extract Bearer token from Authorization header.

    Strict validation:
    - Header must be present
    - Must start with "Bearer " (case-sensitive, per RFC 6750)
    - Token part must not be empty
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header[7:]  # Remove "Bearer " prefix
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token
