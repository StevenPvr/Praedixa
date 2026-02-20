"""User preferences router for authenticated UX personalization."""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.core.exceptions import NotFoundError
from app.models.organization import Organization
from app.models.user import User
from app.schemas.responses import ApiResponse
from app.schemas.ux import UserUxPreferencesPatch, UserUxPreferencesRead

router = APIRouter(prefix="/api/v1/users", tags=["user-preferences"])

_PREFERENCES_KEY = "user_ux_preferences"
_ALLOWED_DEFAULT_LANDING = {
    "/dashboard",
    "/actions",
    "/previsions",
    "/donnees",
    "/messages",
    "/rapports",
    "/parametres",
}


def _safe_uuid(raw: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(raw)
    except (ValueError, TypeError):
        return None


def _default_language(org_locale: str | None, user_locale: str | None) -> str:
    source = (user_locale or org_locale or "fr").lower()
    return "en" if source.startswith("en") else "fr"


def _read_prefs_bucket(settings: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(settings, dict):
        return {}
    raw_bucket = settings.get(_PREFERENCES_KEY)
    if raw_bucket is None:
        raw_bucket = settings.get("userUxPreferences")
    if not isinstance(raw_bucket, dict):
        return {}

    bucket: dict[str, dict[str, Any]] = {}
    for key, value in raw_bucket.items():
        if isinstance(key, str) and isinstance(value, dict):
            bucket[key] = dict(value)
    return bucket


def _sanitize_default_landing(raw: Any, fallback: str) -> str:
    if not isinstance(raw, str):
        return fallback
    candidate = raw.strip()
    if not candidate:
        return fallback
    if candidate not in _ALLOWED_DEFAULT_LANDING:
        return fallback
    return candidate


def _build_preferences(
    *,
    jwt_user_id: str,
    organization: Organization,
    user: User | None,
) -> UserUxPreferencesRead:
    bucket = _read_prefs_bucket(organization.settings)
    record = bucket.get(jwt_user_id, {})

    fallback_language = _default_language(
        organization.locale,
        user.locale if user is not None else None,
    )

    language_raw = record.get("language")
    language = language_raw if language_raw in {"fr", "en"} else fallback_language

    density_raw = record.get("density")
    density = (
        density_raw if density_raw in {"comfortable", "compact"} else "comfortable"
    )

    default_landing = _sanitize_default_landing(
        record.get("default_landing", record.get("defaultLanding")),
        "/dashboard",
    )

    dismissed = record.get("dismissed_coachmarks", record.get("dismissedCoachmarks"))

    return UserUxPreferencesRead(
        user_id=_safe_uuid(jwt_user_id),
        language=language,
        density=density,
        default_landing=default_landing,
        dismissed_coachmarks=dismissed,
    )


async def _get_org_and_user(
    session: AsyncSession,
    current_user: JWTPayload,
) -> tuple[Organization, User | None]:
    org_uuid = uuid.UUID(current_user.organization_id)
    org_result = await session.execute(
        select(Organization).where(Organization.id == org_uuid)
    )
    organization = org_result.scalar_one_or_none()
    if organization is None:
        raise NotFoundError("Organization", str(org_uuid))

    user_result = await session.execute(
        select(User).where(
            User.organization_id == org_uuid,
            User.auth_user_id == current_user.user_id,
        )
    )
    user = user_result.scalar_one_or_none()
    return organization, user


@router.get("/me/preferences")
async def get_my_preferences(
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[UserUxPreferencesRead]:
    """Get persisted UX preferences for the current user."""
    organization, user = await _get_org_and_user(session, current_user)
    prefs = _build_preferences(
        jwt_user_id=current_user.user_id,
        organization=organization,
        user=user,
    )

    return ApiResponse(
        success=True,
        data=prefs,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.patch("/me/preferences")
async def patch_my_preferences(
    body: UserUxPreferencesPatch,
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(get_current_user),
) -> ApiResponse[UserUxPreferencesRead]:
    """Patch UX preferences for the current user."""
    organization, user = await _get_org_and_user(session, current_user)
    current = _build_preferences(
        jwt_user_id=current_user.user_id,
        organization=organization,
        user=user,
    )

    next_prefs = UserUxPreferencesRead(
        user_id=current.user_id,
        language=body.language or current.language,
        density=body.density or current.density,
        default_landing=(
            _sanitize_default_landing(body.default_landing, current.default_landing)
            if body.default_landing is not None
            else current.default_landing
        ),
        dismissed_coachmarks=(
            body.dismissed_coachmarks
            if body.dismissed_coachmarks is not None
            else current.dismissed_coachmarks
        ),
    )

    settings = (
        dict(organization.settings) if isinstance(organization.settings, dict) else {}
    )
    bucket = _read_prefs_bucket(settings)
    bucket[current_user.user_id] = {
        "language": next_prefs.language,
        "density": next_prefs.density,
        "default_landing": next_prefs.default_landing,
        "dismissed_coachmarks": next_prefs.dismissed_coachmarks,
    }
    settings[_PREFERENCES_KEY] = bucket
    settings.pop("userUxPreferences", None)
    organization.settings = settings

    if user is not None and body.language is not None:
        user.locale = "en-US" if body.language == "en" else "fr-FR"

    await session.flush()

    return ApiResponse(
        success=True,
        data=next_prefs,
        timestamp=datetime.now(UTC).isoformat(),
    )
