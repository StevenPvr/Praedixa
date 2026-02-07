"""P0-01 Evidence — JWT security hardening tests.

Validates that the PyJWT-based auth module correctly:
- Rejects HS256 in production (LEGACY_HS256_ENABLED=False).
- Always rejects alg=none (case-insensitive).
- Accepts HS256 only when LEGACY_HS256_ENABLED=True (dev mode).
- Rejects expired tokens.
- Rejects malformed/garbage tokens.
- Rejects empty tokens.
- Rejects tokens missing required claims (sub, email, org_id).
- Rejects wrong audience.

These tests serve as contractual evidence for security gate P0-01.
"""

import time
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest
from fastapi import HTTPException

from app.core.auth import verify_jwt

# Fixed test values matching the mocked settings
TEST_SECRET = "test-secret-key-for-p0-security-evidence-1234"
TEST_USER_ID = "dddddddd-0000-0000-0000-000000000001"
TEST_ORG_ID = "eeeeeeee-0000-0000-0000-000000000002"


def _make_token(
    payload: dict,
    secret: str = TEST_SECRET,
    algorithm: str = "HS256",
) -> str:
    """Create a signed JWT for testing using PyJWT."""
    return pyjwt.encode(payload, secret, algorithm=algorithm)


def _valid_payload(**overrides: object) -> dict:
    """Return a minimal valid JWT payload with all required claims."""
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


def _mock_settings(
    *,
    is_production: bool = False,
    legacy_hs256: bool = True,
    environment: str = "development",
) -> MagicMock:
    """Build a mock settings object with the given parameters."""
    s = MagicMock()
    s.SUPABASE_JWT_SECRET = TEST_SECRET
    s.SUPABASE_URL = ""
    s.ENVIRONMENT = environment
    s.is_production = is_production
    s.LEGACY_HS256_ENABLED = legacy_hs256
    return s


class TestHS256RejectedInProduction:
    """P0-01: HS256 tokens MUST be rejected when LEGACY_HS256_ENABLED=False."""

    @patch("app.core.auth.settings")
    def test_hs256_rejected_when_legacy_disabled(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """HS256 token signed correctly is still rejected in production."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False

        token = _make_token(_valid_payload())
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid or expired token"

    @patch("app.core.auth.settings")
    def test_hs256_rejected_even_with_valid_claims(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Even with perfectly valid claims, HS256 is rejected in production."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False

        # Token has every required claim, correct audience, not expired
        payload = _valid_payload(
            exp=int(time.time()) + 7200,
            role="super_admin",
        )
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_www_authenticate_header_on_hs256_rejection(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Rejection includes WWW-Authenticate: Bearer header (RFC 6750)."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False

        token = _make_token(_valid_payload())
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.headers["WWW-Authenticate"] == "Bearer"


class TestNoneAlgorithmRejected:
    """P0-01: Tokens with alg=none are ALWAYS rejected (any env)."""

    @patch("app.core.auth.settings")
    def test_none_lowercase_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """alg='none' is rejected even in development."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "none"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("unsigned-token-body")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_none_capitalized_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """alg='None' (capitalized) is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "None"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("unsigned-token-body")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_none_uppercase_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """alg='NONE' (all caps) is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "NONE"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("unsigned-token-body")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_none_rejected_in_production(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """alg=none is rejected in production too."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "none"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("unsigned-token-body")
            assert exc_info.value.status_code == 401


class TestValidHS256InDev:
    """P0-01: HS256 tokens work when LEGACY_HS256_ENABLED=True (dev mode)."""

    @patch("app.core.auth.settings")
    def test_valid_hs256_accepted_in_dev(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Valid HS256 token is accepted in development with legacy flag on."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        token = _make_token(_valid_payload())
        result = verify_jwt(token)
        assert result.user_id == TEST_USER_ID
        assert result.email == "security@praedixa.com"
        assert result.organization_id == TEST_ORG_ID
        assert result.role == "org_admin"

    @patch("app.core.auth.settings")
    def test_hs256_with_all_known_roles(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """HS256 token with each known role is accepted in dev."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        known_roles = [
            "super_admin",
            "org_admin",
            "hr_manager",
            "manager",
            "employee",
            "viewer",
        ]
        for role in known_roles:
            payload = _valid_payload()
            payload["app_metadata"]["role"] = role
            token = _make_token(payload)
            result = verify_jwt(token)
            assert result.role == role


class TestExpiredTokenRejected:
    """P0-01: Expired tokens MUST be rejected."""

    @patch("app.core.auth.settings")
    def test_expired_token_raises_401(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token with exp in the past is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload(exp=int(time.time()) - 3600)
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_token_expired_one_second_ago(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token expired just 1 second ago is still rejected (no leeway)."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload(exp=int(time.time()) - 1)
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401


class TestMalformedTokenRejected:
    """P0-01: Random garbage strings MUST be rejected."""

    @patch("app.core.auth.settings")
    def test_random_garbage_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Random ASCII garbage is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt("x9f!@#$%^&*()_+")
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_three_part_garbage_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Three-part string that looks JWT-like but is not."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt("not.a.jwt")
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_unicode_garbage_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Unicode input is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt("\u00e9\u00e8\u00ea\u00eb.token.\u00fc")
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_sql_injection_in_token_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """SQL injection attempt in token string is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt("'; DROP TABLE users;--")
        assert exc_info.value.status_code == 401


class TestEmptyTokenRejected:
    """P0-01: Empty string token MUST be rejected."""

    @patch("app.core.auth.settings")
    def test_empty_string_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Empty string is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt("")
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_whitespace_only_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Whitespace-only string is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt("   ")
        assert exc_info.value.status_code == 401


class TestMissingClaimsRejected:
    """P0-01: Tokens without required claims (sub, email, org_id) are rejected."""

    @patch("app.core.auth.settings")
    def test_missing_sub_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token without 'sub' claim is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        del payload["sub"]
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_missing_email_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token without 'email' claim is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        del payload["email"]
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_missing_org_id_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token without 'organization_id' in app_metadata is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        del payload["app_metadata"]["organization_id"]
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_null_sub_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token with sub=None is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload(sub=None)
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_non_uuid_sub_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token with non-UUID sub is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        token = _make_token(_valid_payload(sub="not-a-uuid"))
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_email_without_at_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Email without @ is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        token = _make_token(_valid_payload(email="noatsign"))
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_non_string_org_id_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Non-string organization_id is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        payload["app_metadata"]["organization_id"] = 12345
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401


class TestWrongAudienceRejected:
    """P0-01: Wrong audience claim is rejected."""

    @patch("app.core.auth.settings")
    def test_wrong_audience_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token with aud != 'authenticated' is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        token = _make_token(_valid_payload(aud="service_role"))
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_missing_audience_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token without audience claim is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        payload = _valid_payload()
        del payload["aud"]
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_anon_audience_rejected(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """Token with aud='anon' (Supabase anon key) is rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        token = _make_token(_valid_payload(aud="anon"))
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401


class TestGenericErrorMessage:
    """P0-01: Error messages MUST NOT leak which specific check failed."""

    @patch("app.core.auth.settings")
    def test_all_rejections_have_same_message(
        self,
        mock_settings: MagicMock,
    ) -> None:
        """All rejection reasons produce the same generic error message.

        This prevents attackers from using error messages as an oracle
        to learn which specific check their crafted token failed.
        """
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True

        # Collect error messages from different failure modes
        failures = [
            _make_token(_valid_payload(exp=int(time.time()) - 3600)),  # expired
            _make_token(_valid_payload(aud="wrong")),  # wrong audience
            "garbage-not-a-jwt",  # malformed
            "",  # empty
        ]

        messages = set()
        for token_str in failures:
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt(token_str)
            messages.add(exc_info.value.detail)

        # All messages should be the same generic string
        assert len(messages) == 1
        assert messages.pop() == "Invalid or expired token"
