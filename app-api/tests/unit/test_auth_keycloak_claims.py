"""Additional auth claim extraction tests for Keycloak-style tokens."""

from unittest.mock import patch

from app.core.auth import verify_jwt

TEST_USER_ID = "cccccccc-0000-0000-0000-000000000099"
TEST_ORG_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_SITE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


def _payload() -> dict[str, object]:
    return {
        "sub": TEST_USER_ID,
        "email": "ops.client@praedixa.com",
        "organization_id": TEST_ORG_ID,
        "app_metadata": {},
    }


def test_verify_jwt_uses_realm_access_role_when_app_metadata_missing() -> None:
    payload = _payload()
    payload["realm_access"] = {"roles": ["offline_access", "viewer", "manager"]}

    with patch("app.core.auth._decode_token", return_value=payload):
        result = verify_jwt("fake-token")

    assert result.role == "manager"


def test_verify_jwt_uses_resource_access_role_when_realm_missing() -> None:
    payload = _payload()
    payload["azp"] = "praedixa-webapp"
    payload["resource_access"] = {
        "praedixa-webapp": {"roles": ["employee", "org_admin"]}
    }

    with patch("app.core.auth._decode_token", return_value=payload):
        result = verify_jwt("fake-token")

    assert result.role == "org_admin"


def test_verify_jwt_accepts_top_level_site_id_claim() -> None:
    payload = _payload()
    payload["site_id"] = TEST_SITE_ID

    with patch("app.core.auth._decode_token", return_value=payload):
        result = verify_jwt("fake-token")

    assert result.site_id == TEST_SITE_ID
