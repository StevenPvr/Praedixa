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

import structlog
from fastapi import HTTPException, Request, status

# Re-export JWT decoding internals so existing `from app.core.auth import …`
# and `patch("app.core.auth.…")` patterns keep working without changes.
from app.core.jwt_decoder import (  # noqa: F401
    _allow_dev_issuer_fallback,
    _auth_error,
    _get_jwk_client,
    _is_allowed_jwks_host,
    _is_local_development,
    _jwks_url_from_base,
    _jwks_url_from_issuer,
    jwt,
    settings,
)
from app.core.jwt_decoder import (
    decode_token as _decode_token,
)

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
    site_id: str | None = None


def _allow_dev_user_metadata_org_id() -> bool:
    if not _is_local_development():
        return False
    return getattr(settings, "ALLOW_DEV_USER_METADATA_ORG_ID", False) is True


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

    # Extract optional site_id from app_metadata.
    # site_id restricts the user to a single site. When absent (None),
    # the user (typically org_admin) sees all sites.
    raw_site_id = app_metadata.get("site_id")
    site_id: str | None = None
    if isinstance(raw_site_id, str) and raw_site_id:
        try:
            site_id = str(uuid.UUID(raw_site_id))
        except (ValueError, TypeError):
            # Invalid site_id format — treat as no site restriction
            logger.warning("jwt_invalid_site_id", site_id=raw_site_id[:50])
            site_id = None

    return JWTPayload(
        user_id=user_id,
        email=email,
        organization_id=organization_id,
        role=role,
        site_id=site_id,
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
