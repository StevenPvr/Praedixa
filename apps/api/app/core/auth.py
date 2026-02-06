"""JWT verification for Supabase tokens.

Security notes:
- Uses HS256 (symmetric) which is the Supabase default. The JWT secret
  is a shared secret between Supabase and this API — it MUST be kept
  server-side only (loaded from env, never logged or exposed).
- Audience claim is validated to "authenticated" to reject tokens issued
  for other Supabase services (e.g. service_role, anon).
- app_metadata (organization_id, role) cannot be tampered with by users
  via Supabase client APIs — only the service_role key can write it.
- All claim extraction uses .get() with explicit None checks to prevent
  KeyError from malformed tokens.
"""

from dataclasses import dataclass

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from app.core.config import settings


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


def verify_jwt(token: str) -> JWTPayload:
    """Verify and decode a Supabase JWT token.

    Validates:
    - Signature (HS256 with SUPABASE_JWT_SECRET)
    - Audience ("authenticated")
    - Expiry (handled automatically by python-jose)
    - Required claims: sub, email, app_metadata.organization_id

    Returns a frozen JWTPayload on success.
    Raises HTTPException 401 on any failure — generic message to prevent
    information leakage about which specific check failed.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    # Extract claims — app_metadata is set by Supabase admin only
    app_metadata = payload.get("app_metadata", {})

    user_id = payload.get("sub")
    email = payload.get("email")
    organization_id = app_metadata.get("organization_id")
    role = app_metadata.get("role", "viewer")

    if not user_id or not email or not organization_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incomplete token claims",
        )

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
