"""Integration tests for /api/v1/users/me/preferences endpoints."""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.main import app

ORG_ID = uuid.UUID("f2222222-0000-0000-0000-000000000001")
JWT_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


def _scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _make_org(settings: dict | None = None, locale: str = "fr-FR") -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=ORG_ID,
        settings=settings if settings is not None else {},
        locale=locale,
        created_at=now,
        updated_at=now,
    )


def _make_user(locale: str | None = "fr-FR") -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        supabase_user_id=JWT_USER_ID,
        locale=locale,
        created_at=now,
        updated_at=now,
    )


def _jwt() -> JWTPayload:
    return JWTPayload(
        user_id=JWT_USER_ID,
        email="user@test.com",
        organization_id=str(ORG_ID),
        role="manager",
    )


async def _make_client(session: AsyncMock) -> AsyncClient:
    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = _jwt

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


async def test_get_preferences_defaults() -> None:
    """GET returns defaults when no preference record exists."""
    org = _make_org(settings={}, locale="fr-FR")
    user = _make_user(locale="fr-FR")
    session = AsyncMock()
    session.execute = AsyncMock(
        side_effect=[_scalar_result(org), _scalar_result(user)],
    )
    session.flush = AsyncMock()

    async with await _make_client(session) as client:
        response = await client.get("/api/v1/users/me/preferences")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["userId"] == JWT_USER_ID
    assert payload["data"]["language"] == "fr"
    assert payload["data"]["density"] == "comfortable"
    assert payload["data"]["defaultLanding"] == "/dashboard"
    assert payload["data"]["dismissedCoachmarks"] == []


async def test_get_preferences_reads_legacy_camel_key() -> None:
    """GET reads legacy userUxPreferences bucket and sanitizes coachmarks."""
    org = _make_org(
        settings={
            "userUxPreferences": {
                JWT_USER_ID: {
                    "language": "en",
                    "density": "compact",
                    "defaultLanding": "/messages",
                    "dismissedCoachmarks": ["tour-a", "tour-a", "", "tour-b"],
                }
            }
        },
        locale="fr-FR",
    )
    user = _make_user(locale=None)
    session = AsyncMock()
    session.execute = AsyncMock(
        side_effect=[_scalar_result(org), _scalar_result(user)],
    )
    session.flush = AsyncMock()

    async with await _make_client(session) as client:
        response = await client.get("/api/v1/users/me/preferences")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["language"] == "en"
    assert payload["data"]["density"] == "compact"
    assert payload["data"]["defaultLanding"] == "/messages"
    assert payload["data"]["dismissedCoachmarks"] == ["tour-a", "tour-b"]


async def test_patch_preferences_persists_and_updates_locale() -> None:
    """PATCH stores user record under snake_case bucket and updates user locale."""
    org = _make_org(settings={"userUxPreferences": {}}, locale="fr-FR")
    user = _make_user(locale="fr-FR")
    session = AsyncMock()
    session.execute = AsyncMock(
        side_effect=[_scalar_result(org), _scalar_result(user)],
    )
    session.flush = AsyncMock()

    async with await _make_client(session) as client:
        response = await client.patch(
            "/api/v1/users/me/preferences",
            json={
                "language": "en",
                "density": "compact",
                "defaultLanding": "/actions",
                "dismissedCoachmarks": ["step-1", "step-1", "step-2"],
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["language"] == "en"
    assert payload["data"]["density"] == "compact"
    assert payload["data"]["defaultLanding"] == "/actions"
    assert payload["data"]["dismissedCoachmarks"] == ["step-1", "step-2"]
    assert "userUxPreferences" not in org.settings
    assert org.settings["user_ux_preferences"][JWT_USER_ID]["language"] == "en"
    assert user.locale == "en-US"
    session.flush.assert_awaited_once()


async def test_patch_preferences_invalid_default_landing_returns_422() -> None:
    """PATCH validates defaultLanding format."""
    org = _make_org(settings={}, locale="fr-FR")
    user = _make_user(locale="fr-FR")
    session = AsyncMock()
    session.execute = AsyncMock(
        side_effect=[_scalar_result(org), _scalar_result(user)],
    )
    session.flush = AsyncMock()

    async with await _make_client(session) as client:
        response = await client.patch(
            "/api/v1/users/me/preferences",
            json={"defaultLanding": "/../../etc/passwd"},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 422


async def test_get_preferences_401_no_auth() -> None:
    """Preferences endpoints require authentication."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/users/me/preferences")
    app.dependency_overrides.clear()
    assert response.status_code == 401
