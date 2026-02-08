"""JWT verification for Supabase tokens — hardened with PyJWT.

Security notes:
- Uses PyJWT (actively maintained) instead of python-jose.
- Asymmetric algorithms only by default: RS256, ES256, EdDSA.
- HS256 is only accepted when LEGACY_HS256_ENABLED=true in local development.
- The "none" algorithm is ALWAYS rejected — PyJWT rejects it by default
  when algorithms= is specified, but we also explicitly block it.
- PyJWKClient handles JWKS fetching with built-in caching and kid resolution.
- Audience claim is validated to "authenticated" to reject tokens issued
  for other Supabase services (e.g. service_role, anon).
- app_metadata (organization_id, role) cannot be tampered with by users
  via Supabase client APIs — only privileged Supabase contexts can write it.
- All claim extraction uses .get() with explicit None checks to prevent
  KeyError from malformed tokens.
"""

import uuid
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import jwt
import structlog
from fastapi import HTTPException, Request, status
from jwt import InvalidTokenError, PyJWKClient

from app.core.config import settings

_AUTH_ERROR_DETAIL = "Invalid or expired token"

# Allowed asymmetric algorithms — HS256 and "none" are rejected unless
# LEGACY_HS256_ENABLED is true (development transition only).
_ALLOWED_ASYMMETRIC_ALGORITHMS: frozenset[str] = frozenset({"RS256", "ES256", "EdDSA"})

_PLACEHOLDER_SUPABASE_URLS = {"", "https://your-project.supabase.co"}
_MAX_EMAIL_LENGTH = 320
_KNOWN_ROLES = {
    "super_admin",
    "org_admin",
    "hr_manager",
    "manager",
    "employee",
    "viewer",
}
logger = structlog.get_logger()

# PyJWKClient instance — lazily initialized per JWKS URL.
# Thread-safe by design (uses urllib3 with connection pooling).
_jwk_clients: dict[str, PyJWKClient] = {}


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


def _is_local_development() -> bool:
    environment = str(getattr(settings, "ENVIRONMENT", "development")).lower()
    return environment == "development"


def _allow_dev_issuer_fallback() -> bool:
    if not _is_local_development():
        return False
    return getattr(settings, "ALLOW_DEV_ISSUER_FALLBACK", False) is True


def _allow_dev_user_metadata_org_id() -> bool:
    if not _is_local_development():
        return False
    return getattr(settings, "ALLOW_DEV_USER_METADATA_ORG_ID", False) is True


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
    configured_url = settings.SUPABASE_URL.strip()
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
        unverified = jwt.decode(token, options={"verify_signature": False})
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
    if not _is_local_development():
        return False
    return getattr(settings, "LEGACY_HS256_ENABLED", False) is True


def _decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT token.

    Algorithm selection:
    - "none" is ALWAYS rejected (PyJWT default when algorithms= is specified).
    - HS256 is only accepted when _is_hs256_allowed() returns True.
    - RS256, ES256, EdDSA use JWKS-based verification with kid resolution.
    """
    try:
        header = jwt.get_unverified_header(token)
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
            decoded = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
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
    client = _get_jwk_client(jwks_url)

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
        decoded = jwt.decode(
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


def verify_jwt(token: str) -> JWTPayload:
    """Verify and decode a Supabase JWT token.

    Validates:
    - Signature (HS256 in dev only, RS256/ES256/EdDSA via JWKS)
    - Audience ("authenticated")
    - Expiry (handled automatically by PyJWT)
    - Required claims: sub, email, organization_id (canonical or aliases)

    Returns a frozen JWTPayload on success.
    Raises HTTPException 401 on any failure -- generic message to prevent
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

    # Validate user_id is a valid UUID string -- Supabase uses UUID for user IDs.
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
    # We don't need full RFC 5322 validation here -- Supabase validates the email
    # at registration. This prevents malformed/injected values from reaching logs.
    if not isinstance(email, str) or "@" not in email or len(email) > _MAX_EMAIL_LENGTH:
        raise _auth_error()

    organization_id = (
        payload.get("organization_id")
        or app_metadata.get("organization_id")
        or app_metadata.get("org_id")
    )

    if not organization_id and _allow_dev_user_metadata_org_id():
        organization_id = user_metadata.get("organization_id") or user_metadata.get(
            "org_id"
        )

    # Application role must come from app_metadata (admin-set, authoritative).
    # Top-level JWT role is ignored because it represents DB role context.
    role = app_metadata.get("role") or "viewer"

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
