"""JWT verification for OIDC tokens — hardened with PyJWT.

Security notes:
- Uses PyJWT (actively maintained) instead of python-jose.
- Asymmetric algorithms only by default: RS256, ES256, EdDSA.
- The "none" algorithm is ALWAYS rejected — PyJWT rejects it by default
  when algorithms= is specified, but we also explicitly block it.
- PyJWKClient handles JWKS fetching with built-in caching and kid resolution.
- Audience claim is validated to reject tokens issued for other clients.
- app_metadata (organization_id, role) cannot be tampered with by users
  via self-service profile APIs — only privileged IdP/admin contexts can write it.
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
_ROLE_PRIORITY = (
    "super_admin",
    "org_admin",
    "hr_manager",
    "manager",
    "employee",
    "viewer",
)
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


def _first_known_role(candidates: list[str]) -> str | None:
    if not candidates:
        return None
    for role in _ROLE_PRIORITY:
        if role in candidates:
            return role
    for role in candidates:
        if role in _KNOWN_ROLES:
            return role
    return None


def _extract_role(payload: dict[str, object], app_metadata: dict[str, object]) -> str:
    # 1) Authoritative app metadata role (when present)
    app_role = app_metadata.get("role")
    if isinstance(app_role, str) and app_role in _KNOWN_ROLES:
        return app_role

    # 2) Top-level role compatibility (legacy/custom mappers)
    direct_role = payload.get("role")
    if isinstance(direct_role, str) and direct_role in _KNOWN_ROLES:
        return direct_role

    # 3) Keycloak realm roles
    realm_access = payload.get("realm_access")
    if isinstance(realm_access, dict):
        roles = realm_access.get("roles")
        if isinstance(roles, list):
            realm_roles = [r for r in roles if isinstance(r, str)]
            matched = _first_known_role(realm_roles)
            if matched is not None:
                return matched

    # 4) Keycloak client roles for the authorized party (azp)
    azp = payload.get("azp")
    resource_access = payload.get("resource_access")
    if isinstance(azp, str) and isinstance(resource_access, dict):
        client_access = resource_access.get(azp)
        if isinstance(client_access, dict):
            roles = client_access.get("roles")
            if isinstance(roles, list):
                client_roles = [r for r in roles if isinstance(r, str)]
                matched = _first_known_role(client_roles)
                if matched is not None:
                    return matched

    return "viewer"


def verify_jwt(token: str) -> JWTPayload:
    """Verify and decode an OIDC JWT token.

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

    # Validate user_id is a valid UUID string.
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

    role = _extract_role(payload, app_metadata)

    if not user_id or not email or not organization_id:
        raise _auth_error()

    if not isinstance(organization_id, str):
        raise _auth_error()
    try:
        organization_id = str(uuid.UUID(organization_id))
    except (ValueError, TypeError) as e:
        logger.warning("jwt_invalid_organization_id", organization_id=organization_id)
        raise _auth_error() from e

    # Extract optional site_id from claims.
    # site_id restricts the user to a single site. When absent (None),
    # the user (typically org_admin) sees all sites.
    raw_site_id = payload.get("site_id")
    if not isinstance(raw_site_id, str) or not raw_site_id:
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
