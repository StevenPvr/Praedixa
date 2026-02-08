"""Security gap analysis — JWT algorithm confusion tests.

Tests for algorithm confusion attacks where an attacker:
1. Sends an HS256 token signed with a public key as the HMAC secret.
2. Sends unsupported algorithms (PS256, PS384, etc.).
3. Attempts to downgrade from RS256 to HS256.
4. Sends tokens with missing or tampered headers.
5. Attempts header injection via the kid parameter.

OWASP API2:2023 — Broken Authentication
CWE-287 — Improper Authentication
"""

import time
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest
from fastapi import HTTPException

from app.core.auth import verify_jwt

# Fixed test values
TEST_SECRET = "test-secret-key-for-algorithm-confusion-1234567"
TEST_USER_ID = "dddddddd-0000-0000-0000-000000000001"
TEST_ORG_ID = "eeeeeeee-0000-0000-0000-000000000002"


def _valid_payload(**overrides: object) -> dict:
    """Return a minimal valid JWT payload."""
    base: dict = {
        "sub": TEST_USER_ID,
        "email": "security@praedixa.com",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "app_metadata": {
            "organization_id": TEST_ORG_ID,
            "role": "org_admin",
        },
    }
    base.update(overrides)
    return base


def _dev_settings() -> MagicMock:
    """Mock settings allowing HS256 (dev mode)."""
    s = MagicMock()
    s.SUPABASE_JWT_SECRET = TEST_SECRET
    s.SUPABASE_URL = ""
    s.ENVIRONMENT = "development"
    s.is_production = False
    s.LEGACY_HS256_ENABLED = True
    return s


def _prod_settings() -> MagicMock:
    """Mock settings for production (HS256 disabled)."""
    s = MagicMock()
    s.SUPABASE_JWT_SECRET = TEST_SECRET
    s.SUPABASE_URL = ""
    s.ENVIRONMENT = "production"
    s.is_production = True
    s.LEGACY_HS256_ENABLED = False
    return s


# ── 1. Unsupported algorithm rejection ─────────────────────────


class TestUnsupportedAlgorithms:
    """Tokens signed with unsupported algorithms are rejected."""

    @pytest.mark.parametrize(
        "alg",
        ["PS256", "PS384", "PS512", "ES384", "ES512"],
        ids=["PS256", "PS384", "PS512", "ES384", "ES512"],
    )
    @patch("app.core.auth.settings")
    def test_unsupported_asymmetric_algorithm_rejected(
        self,
        mock_settings: MagicMock,
        alg: str,
    ) -> None:
        """Asymmetric algorithms outside {RS256, ES256, EdDSA} are rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        # Craft a token with an unsupported algorithm header
        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": alg, "kid": "test-kid"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("fake-token-body")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_hs384_rejected(self, mock_settings: MagicMock) -> None:
        """HS384 algorithm is rejected (only HS256 is ever allowed, in dev)."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "HS384"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("fake-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_hs512_rejected(self, mock_settings: MagicMock) -> None:
        """HS512 algorithm is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "HS512"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("fake-token")
            assert exc_info.value.status_code == 401


# ── 2. Algorithm header manipulation ───────────────────────────


class TestAlgorithmHeaderManipulation:
    """Attacker manipulates the JWT alg header to bypass verification."""

    @patch("app.core.auth.settings")
    def test_missing_alg_header_rejected(self, mock_settings: MagicMock) -> None:
        """Token with no alg in header is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"typ": "JWT"}  # no "alg"
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("fake-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_non_string_alg_rejected(self, mock_settings: MagicMock) -> None:
        """Token with numeric alg header is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": 256}  # int, not str
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("fake-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_alg_with_whitespace_rejected(self, mock_settings: MagicMock) -> None:
        """Token with whitespace in alg is rejected (not 'none' but not valid)."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": " HS256 "}  # whitespace
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("fake-token")
            assert exc_info.value.status_code == 401


# ── 3. RS256 without kid is rejected ───────────────────────────


class TestAsymmetricWithoutKid:
    """Asymmetric algorithms require a kid header for JWKS resolution."""

    @patch("app.core.auth.settings")
    def test_rs256_without_kid_rejected(self, mock_settings: MagicMock) -> None:
        """RS256 token without kid header is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://test.supabase.co"
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "RS256"}  # no kid
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("fake-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_es256_with_empty_kid_rejected(self, mock_settings: MagicMock) -> None:
        """ES256 with empty string kid is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://test.supabase.co"
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "ES256", "kid": ""}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("fake-token")
            assert exc_info.value.status_code == 401


# ── 4. Token claim manipulation ────────────────────────────────


class TestTokenClaimManipulation:
    """Crafted tokens with manipulated claims are rejected."""

    @patch("app.core.auth.settings")
    def test_app_metadata_as_string_rejected(self, mock_settings: MagicMock) -> None:
        """app_metadata set to a string (not dict) is handled safely."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        payload["app_metadata"] = "not-a-dict"
        token = pyjwt.encode(payload, TEST_SECRET, algorithm="HS256")

        # Should not crash but should reject (no org_id extractable)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_app_metadata_as_list_rejected(self, mock_settings: MagicMock) -> None:
        """app_metadata set to a list is handled safely."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        payload["app_metadata"] = ["injected"]
        token = pyjwt.encode(payload, TEST_SECRET, algorithm="HS256")

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_role_injection_via_top_level_claim(self, mock_settings: MagicMock) -> None:
        """Top-level JWT 'role' claim does not override app_metadata role.

        In Supabase, the top-level 'role' is the DB role context (e.g. 'authenticated').
        The application role must come from app_metadata, which is admin-set.
        """
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        payload["role"] = "super_admin"  # Top-level — should be ignored
        payload["app_metadata"]["role"] = "viewer"  # This is authoritative
        token = pyjwt.encode(payload, TEST_SECRET, algorithm="HS256")

        result = verify_jwt(token)
        assert result.role == "viewer"  # Not "super_admin"

    @patch("app.core.auth.settings")
    def test_unknown_role_defaults_to_viewer(self, mock_settings: MagicMock) -> None:
        """Unknown role in app_metadata defaults to viewer (least privilege)."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        payload["app_metadata"]["role"] = "god_mode"
        token = pyjwt.encode(payload, TEST_SECRET, algorithm="HS256")

        result = verify_jwt(token)
        assert result.role == "viewer"

    @patch("app.core.auth.settings")
    def test_org_id_injection_via_non_uuid_rejected(
        self, mock_settings: MagicMock
    ) -> None:
        """Non-UUID organization_id in JWT is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        payload["app_metadata"]["organization_id"] = "'; DROP TABLE--"
        token = pyjwt.encode(payload, TEST_SECRET, algorithm="HS256")

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401


# ── 5. HS256 downgrade in production ───────────────────────────


class TestHs256DowngradeAttack:
    """An attacker cannot downgrade from asymmetric to HS256 in production."""

    @patch("app.core.auth.settings")
    def test_hs256_signed_with_correct_secret_rejected_in_prod(
        self, mock_settings: MagicMock
    ) -> None:
        """Even a correctly-signed HS256 token is rejected in production.

        This prevents key confusion attacks where the attacker signs
        with the JWT secret (or public key) using HS256.
        """
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://test.supabase.co"
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False

        token = pyjwt.encode(_valid_payload(), TEST_SECRET, algorithm="HS256")
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_generic_error_message_for_hs256_rejection(
        self, mock_settings: MagicMock
    ) -> None:
        """HS256 rejection in production gives generic error (no oracle)."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://test.supabase.co"
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False

        token = pyjwt.encode(_valid_payload(), TEST_SECRET, algorithm="HS256")
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        # Error message must not reveal the specific failure reason
        assert exc_info.value.detail == "Invalid or expired token"
        assert "HS256" not in exc_info.value.detail
        assert "algorithm" not in exc_info.value.detail.lower()


# ── 6. extract_token strict parsing ────────────────────────────


class TestExtractTokenStrictParsing:
    """extract_token enforces strict Bearer token format."""

    def test_bearer_lowercase_rejected(self) -> None:
        """'bearer' (lowercase) is rejected per RFC 6750."""
        from app.core.auth import extract_token

        request = MagicMock()
        request.headers.get.return_value = "bearer some-token"
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401

    def test_basic_auth_rejected(self) -> None:
        """'Basic' auth scheme is rejected."""
        from app.core.auth import extract_token

        request = MagicMock()
        request.headers.get.return_value = "Basic dXNlcjpwYXNz"
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401

    def test_no_space_after_bearer_rejected(self) -> None:
        """'BearerTOKEN' (no space) is rejected."""
        from app.core.auth import extract_token

        request = MagicMock()
        request.headers.get.return_value = "BearerTOKEN"
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401

    def test_bearer_with_empty_token_rejected(self) -> None:
        """'Bearer ' (trailing space only) is rejected."""
        from app.core.auth import extract_token

        request = MagicMock()
        request.headers.get.return_value = "Bearer "
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401

    def test_missing_authorization_header_rejected(self) -> None:
        """Missing Authorization header returns 401."""
        from app.core.auth import extract_token

        request = MagicMock()
        request.headers.get.return_value = None
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401
