"""Tests for app.core.auth — JWT verification and token extraction.

Updated for PyJWT migration (replacing python-jose).
"""

from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest
from fastapi import HTTPException

from app.core.auth import (
    JWTPayload,
    _is_allowed_jwks_host,
    _jwks_url_from_base,
    _jwks_url_from_issuer,
    extract_token,
    verify_jwt,
)

# A test secret for signing JWTs — matches the mocked settings value.
TEST_SECRET = "test-secret-key-for-unit-tests-1234567890"
TEST_USER_ID = "cccccccc-0000-0000-0000-000000000099"
TEST_ORG_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_ORG_ALIAS_ID = "aaaaaaaa-0000-0000-0000-000000000001"
TEST_ORG_USER_META_ID = "bbbbbbbb-0000-0000-0000-000000000002"


def _make_token(payload: dict, secret: str = TEST_SECRET) -> str:
    """Create a signed JWT for testing using PyJWT."""
    return pyjwt.encode(payload, secret, algorithm="HS256")


def _valid_payload(**overrides) -> dict:
    """Return a minimal valid JWT payload."""
    import time

    base = {
        "sub": TEST_USER_ID,
        "email": "test@example.com",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "app_metadata": {
            "organization_id": TEST_ORG_ID,
            "role": "manager",
        },
    }
    base.update(overrides)
    return base


class TestVerifyJwt:
    """Test verify_jwt function."""

    @patch("app.core.auth.settings")
    def test_valid_token(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        token = _make_token(_valid_payload())
        result = verify_jwt(token)
        assert isinstance(result, JWTPayload)
        assert result.user_id == TEST_USER_ID
        assert result.email == "test@example.com"
        assert result.organization_id == TEST_ORG_ID
        assert result.role == "manager"

    @patch("app.core.auth.settings")
    def test_expired_token_raises_401(self, mock_settings):
        import time

        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        token = _make_token(
            _valid_payload(exp=int(time.time()) - 3600),
        )
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid or expired token"

    @pytest.mark.filterwarnings("ignore::jwt.warnings.InsecureKeyLengthWarning")
    @patch("app.core.auth.settings")
    def test_bad_signature_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        wrong_secret = "wrong-secret-wrong-secret-12345"  # gitleaks:allow
        token = _make_token(_valid_payload(), secret=wrong_secret)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_invalid_audience_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        token = _make_token(_valid_payload(aud="wrong-audience"))
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_missing_sub_raises_401(self, mock_settings):
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
    def test_missing_email_raises_401(self, mock_settings):
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
    def test_missing_organization_id_raises_401(self, mock_settings):
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
    def test_default_role_viewer(self, mock_settings):
        """When role is missing from app_metadata, defaults to viewer."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        payload = _valid_payload()
        del payload["app_metadata"]["role"]
        token = _make_token(payload)
        result = verify_jwt(token)
        assert result.role == "viewer"

    @patch("app.core.auth.settings")
    def test_empty_app_metadata_missing_org(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        payload = _valid_payload()
        payload["app_metadata"] = {}
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_no_app_metadata_key(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        payload = _valid_payload()
        del payload["app_metadata"]
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_totally_invalid_token_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt("not.a.jwt")
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_accepts_org_id_in_app_metadata_alias(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        payload = _valid_payload()
        del payload["app_metadata"]["organization_id"]
        payload["app_metadata"]["org_id"] = TEST_ORG_ALIAS_ID
        token = _make_token(payload)
        result = verify_jwt(token)
        assert result.organization_id == TEST_ORG_ALIAS_ID

    @patch("app.core.auth.settings")
    def test_dev_accepts_org_id_from_user_metadata(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        mock_settings.ALLOW_DEV_USER_METADATA_ORG_ID = True
        payload = _valid_payload()
        del payload["app_metadata"]["organization_id"]
        payload["user_metadata"] = {
            "org_id": TEST_ORG_USER_META_ID,
        }
        token = _make_token(payload)
        result = verify_jwt(token)
        assert result.organization_id == TEST_ORG_USER_META_ID

    @patch("app.core.auth.settings")
    def test_production_rejects_user_metadata_org_fallback(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False
        mock_settings.ALLOW_DEV_USER_METADATA_ORG_ID = False
        payload = _valid_payload()
        del payload["app_metadata"]["organization_id"]
        payload["user_metadata"] = {
            "org_id": TEST_ORG_USER_META_ID,
        }
        token = _make_token(payload)
        # HS256 rejected in production
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_invalid_organization_id_format_raises_401(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        payload = _valid_payload()
        payload["app_metadata"]["organization_id"] = "org_demo_001"
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_rs256_token_uses_jwks(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://example.supabase.co"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        mock_key = MagicMock()
        mock_key.key = "fake-rsa-public-key"

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_hdr,
            patch("app.core.auth._get_jwk_client") as m_client,
            patch("app.core.auth.jwt.decode") as m_decode,
        ):
            m_hdr.return_value = {"alg": "RS256", "kid": "kid-1"}
            m_client.return_value.get_signing_key.return_value = mock_key
            m_decode.return_value = _valid_payload()

            result = verify_jwt("rs256-token")

            assert result.organization_id == TEST_ORG_ID
            m_decode.assert_called_once_with(
                "rs256-token",
                "fake-rsa-public-key",
                algorithms=["RS256"],
                audience="authenticated",
            )

    @patch("app.core.auth.settings")
    def test_es256_token_uses_jwks(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://example.supabase.co"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        mock_key = MagicMock()
        mock_key.key = "fake-ec-public-key"

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_hdr,
            patch("app.core.auth._get_jwk_client") as m_client,
            patch("app.core.auth.jwt.decode") as m_decode,
        ):
            m_hdr.return_value = {"alg": "ES256", "kid": "kid-1"}
            m_client.return_value.get_signing_key.return_value = mock_key
            m_decode.return_value = _valid_payload()

            result = verify_jwt("es256-token")

            assert result.organization_id == TEST_ORG_ID
            m_decode.assert_called_once_with(
                "es256-token",
                "fake-ec-public-key",
                algorithms=["ES256"],
                audience="authenticated",
            )

    @patch("app.core.auth.settings")
    def test_rs256_missing_kid_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://example.supabase.co"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m_hdr:
            m_hdr.return_value = {"alg": "RS256"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("rs256-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_rs256_placeholder_url_uses_issuer_in_dev(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://your-project.supabase.co"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.ALLOW_DEV_ISSUER_FALLBACK = True

        mock_key = MagicMock()
        mock_key.key = "fake-rsa-public-key"

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_hdr,
            patch(
                "app.core.auth.jwt.decode",
            ) as m_decode,
            patch("app.core.auth._get_jwk_client") as m_client,
        ):
            m_hdr.return_value = {"alg": "RS256", "kid": "kid-1"}
            # First call is unverified decode in _resolve_jwks_url
            # Second call is the actual verified decode
            m_decode.side_effect = [
                {"iss": "https://proj.supabase.co/auth/v1"},
                _valid_payload(),
            ]
            m_client.return_value.get_signing_key.return_value = mock_key

            verify_jwt("rs256-token")

            # _get_jwk_client should have been called with issuer URL
            m_client.assert_called_once_with(
                "https://proj.supabase.co/auth/v1/.well-known/jwks.json",
            )

    @patch("app.core.auth.settings")
    def test_rs256_placeholder_url_rejected_in_production(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://your-project.supabase.co"
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True

        with patch("app.core.auth.jwt.get_unverified_header") as m_hdr:
            m_hdr.return_value = {"alg": "RS256", "kid": "kid-1"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("rs256-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_hs256_rejected_in_production(self, mock_settings):
        """HS256 tokens must be rejected in production."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "production"
        mock_settings.is_production = True
        mock_settings.LEGACY_HS256_ENABLED = False
        token = _make_token(_valid_payload())
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_none_algorithm_rejected(self, mock_settings):
        """Tokens with alg=none must always be rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m_hdr:
            m_hdr.return_value = {"alg": "none"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("none-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_none_algorithm_case_insensitive(self, mock_settings):
        """Tokens with alg=None/NONE must be rejected."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m_hdr:
            m_hdr.return_value = {"alg": "None"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("none-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_eddsa_algorithm_accepted(self, mock_settings):
        """EdDSA tokens should be accepted (asymmetric)."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.SUPABASE_URL = "https://example.supabase.co"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        mock_key = MagicMock()
        mock_key.key = "fake-eddsa-key"

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_hdr,
            patch("app.core.auth._get_jwk_client") as m_client,
            patch("app.core.auth.jwt.decode") as m_decode,
        ):
            m_hdr.return_value = {"alg": "EdDSA", "kid": "kid-1"}
            m_client.return_value.get_signing_key.return_value = mock_key
            m_decode.return_value = _valid_payload()

            result = verify_jwt("eddsa-token")
            assert result.organization_id == TEST_ORG_ID


class TestExtractToken:
    """Test extract_token function."""

    def test_valid_bearer_token(self):
        request = MagicMock()
        request.headers.get.return_value = "Bearer abc123"
        assert extract_token(request) == "abc123"

    def test_missing_authorization_header(self):
        request = MagicMock()
        request.headers.get.return_value = None
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401
        assert "WWW-Authenticate" in exc_info.value.headers

    def test_invalid_format_no_bearer_prefix(self):
        request = MagicMock()
        request.headers.get.return_value = "Token abc123"
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401

    def test_empty_token_after_bearer(self):
        request = MagicMock()
        request.headers.get.return_value = "Bearer "
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401

    def test_bearer_lowercase_rejected(self):
        request = MagicMock()
        request.headers.get.return_value = "bearer abc123"
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401

    def test_empty_header(self):
        request = MagicMock()
        request.headers.get.return_value = ""
        with pytest.raises(HTTPException) as exc_info:
            extract_token(request)
        assert exc_info.value.status_code == 401


class TestJWTPayloadFrozen:
    """Test JWTPayload dataclass properties."""

    def test_frozen(self):
        payload = JWTPayload(
            user_id="u1",
            email="e@x.com",
            organization_id="o1",
            role="viewer",
        )
        with pytest.raises(AttributeError):
            payload.user_id = "u2"  # type: ignore[misc]

    def test_fields_accessible(self):
        payload = JWTPayload(
            user_id="u1",
            email="e@x.com",
            organization_id="o1",
            role="admin",
        )
        assert payload.user_id == "u1"
        assert payload.email == "e@x.com"
        assert payload.organization_id == "o1"
        assert payload.role == "admin"


class TestIsAllowedJwksHost:
    """Test _is_allowed_jwks_host helper."""

    def test_none_hostname(self):
        assert _is_allowed_jwks_host(None) is False

    def test_empty_hostname(self):
        assert _is_allowed_jwks_host("") is False

    def test_supabase_co(self):
        assert _is_allowed_jwks_host("example.supabase.co") is True

    def test_localhost(self):
        assert _is_allowed_jwks_host("localhost") is True

    def test_ipv4_loopback(self):
        assert _is_allowed_jwks_host("127.0.0.1") is True

    def test_ipv6_loopback(self):
        assert _is_allowed_jwks_host("::1") is True

    def test_evil_host(self):
        assert _is_allowed_jwks_host("evil.com") is False


class TestJwksUrlFromIssuer:
    """Test _jwks_url_from_issuer helper."""

    def test_valid_issuer(self):
        url = _jwks_url_from_issuer(
            "https://proj.supabase.co/auth/v1",
        )
        assert url == ("https://proj.supabase.co/auth/v1/.well-known/jwks.json")

    def test_bad_scheme(self):
        assert (
            _jwks_url_from_issuer(
                "ftp://proj.supabase.co/auth/v1",
            )
            is None
        )

    def test_bad_host(self):
        assert _jwks_url_from_issuer("https://evil.com/auth/v1") is None

    def test_bad_path(self):
        assert (
            _jwks_url_from_issuer(
                "https://proj.supabase.co/other",
            )
            is None
        )

    def test_trailing_slash(self):
        url = _jwks_url_from_issuer(
            "https://proj.supabase.co/auth/v1/",
        )
        assert url == ("https://proj.supabase.co/auth/v1/.well-known/jwks.json")


class TestJwksUrlFromBase:
    """Test _jwks_url_from_base helper."""

    def test_base_url_no_path(self):
        url = _jwks_url_from_base("https://proj.supabase.co")
        assert url == ("https://proj.supabase.co/auth/v1/.well-known/jwks.json")

    def test_base_url_with_auth_path(self):
        url = _jwks_url_from_base(
            "https://proj.supabase.co/auth/v1",
        )
        assert url == ("https://proj.supabase.co/auth/v1/.well-known/jwks.json")

    def test_bad_scheme(self):
        assert _jwks_url_from_base("ftp://proj.supabase.co") is None

    def test_bad_host(self):
        assert _jwks_url_from_base("https://evil.com") is None

    def test_unrecognized_path(self):
        assert (
            _jwks_url_from_base(
                "https://proj.supabase.co/other/path",
            )
            is None
        )


class TestDecodeToken:
    """Test _decode_token internal paths."""

    @patch("app.core.auth.settings")
    def test_missing_alg_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("some-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_non_string_alg_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": 123}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("some-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_unknown_algorithm_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "PS256"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("some-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_hs256_non_dict_decoded_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_h,
            patch("app.core.auth.jwt.decode") as m_d,
        ):
            m_h.return_value = {"alg": "HS256"}
            m_d.return_value = "not-a-dict"
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("some-token")
            assert exc_info.value.status_code == 401


class TestDecodeWithJwks:
    """Test asymmetric decode paths."""

    @patch("app.core.auth.settings")
    def test_jwt_decode_error_raises_401(self, mock_settings):
        mock_settings.SUPABASE_URL = "https://proj.supabase.co"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        mock_key = MagicMock()
        mock_key.key = "fake-key"

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_h,
            patch("app.core.auth._get_jwk_client") as m_client,
            patch("app.core.auth.jwt.decode") as m_decode,
        ):
            m_h.return_value = {"alg": "RS256", "kid": "kid-1"}
            m_client.return_value.get_signing_key.return_value = mock_key
            m_decode.side_effect = pyjwt.InvalidTokenError(
                "sig invalid",
            )
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("rs256-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_non_dict_decoded_raises_401(self, mock_settings):
        mock_settings.SUPABASE_URL = "https://proj.supabase.co"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        mock_key = MagicMock()
        mock_key.key = "fake-key"

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_h,
            patch("app.core.auth._get_jwk_client") as m_client,
            patch("app.core.auth.jwt.decode") as m_decode,
        ):
            m_h.return_value = {"alg": "RS256", "kid": "kid-1"}
            m_client.return_value.get_signing_key.return_value = mock_key
            m_decode.return_value = "not-a-dict"
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("rs256-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_jwks_key_resolution_failure_raises_401(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_URL = "https://proj.supabase.co"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_h,
            patch("app.core.auth._get_jwk_client") as m_client,
        ):
            m_h.return_value = {"alg": "RS256", "kid": "bad-kid"}
            m_client.return_value.get_signing_key.side_effect = Exception(
                "key not found"
            )
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("rs256-token")
            assert exc_info.value.status_code == 401


class TestResolveJwksUrl:
    """Test _resolve_jwks_url internal paths."""

    @patch("app.core.auth.settings")
    def test_bad_configured_url_raises_401(self, mock_settings):
        mock_settings.SUPABASE_URL = "https://evil.com/bad"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False

        with patch("app.core.auth.jwt.get_unverified_header") as m:
            m.return_value = {"alg": "RS256", "kid": "kid-1"}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("rs256-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_placeholder_dev_bad_claims_raises_401(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_URL = ""
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.ALLOW_DEV_ISSUER_FALLBACK = True

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_h,
            patch("app.core.auth.jwt.decode") as m_decode,
        ):
            m_h.return_value = {"alg": "RS256", "kid": "kid-1"}
            # The unverified decode call in _resolve_jwks_url
            m_decode.side_effect = pyjwt.InvalidTokenError(
                "bad claims",
            )
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("rs256-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_placeholder_dev_non_string_issuer_raises_401(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_URL = ""
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.ALLOW_DEV_ISSUER_FALLBACK = True

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_h,
            patch("app.core.auth.jwt.decode") as m_decode,
        ):
            m_h.return_value = {"alg": "RS256", "kid": "kid-1"}
            m_decode.return_value = {"iss": 12345}
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("rs256-token")
            assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_placeholder_dev_bad_issuer_url_raises_401(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_URL = ""
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.ALLOW_DEV_ISSUER_FALLBACK = True

        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_h,
            patch("app.core.auth.jwt.decode") as m_decode,
        ):
            m_h.return_value = {"alg": "RS256", "kid": "kid-1"}
            m_decode.return_value = {
                "iss": "https://evil.com/auth/v1",
            }
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("rs256-token")
            assert exc_info.value.status_code == 401


class TestVerifyJwtSecurityValidations:
    """Test security validations added to verify_jwt."""

    @patch("app.core.auth.settings")
    def test_non_uuid_sub_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        token = _make_token(_valid_payload(sub="not-a-uuid"))
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_email_without_at_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        token = _make_token(_valid_payload(email="noatsign"))
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_email_too_long_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        token = _make_token(
            _valid_payload(email="a" * 315 + "@b.com"),
        )
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_unknown_role_downgraded_to_viewer(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        payload = _valid_payload()
        payload["app_metadata"]["role"] = "hacker_admin"
        token = _make_token(payload)
        result = verify_jwt(token)
        assert result.role == "viewer"

    @patch("app.core.auth.settings")
    def test_non_dict_app_metadata_treated_as_empty(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        payload = _valid_payload()
        payload["app_metadata"] = "not-a-dict"
        payload["organization_id"] = TEST_ORG_ID
        token = _make_token(payload)
        result = verify_jwt(token)
        assert result.organization_id == TEST_ORG_ID
        assert result.role == "viewer"

    @patch("app.core.auth.settings")
    def test_non_string_org_id_raises_401(self, mock_settings):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        payload = _valid_payload()
        del payload["app_metadata"]["organization_id"]
        payload["organization_id"] = 12345
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401

    @patch("app.core.auth.settings")
    def test_non_dict_user_metadata_treated_as_empty(
        self,
        mock_settings,
    ):
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        payload = _valid_payload()
        del payload["app_metadata"]["organization_id"]
        payload["user_metadata"] = "not-a-dict"
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt(token)
        assert exc_info.value.status_code == 401


class TestAllowDevUserMetadataOrgId:
    """Test _allow_dev_user_metadata_org_id helper."""

    def test_returns_false_when_not_local_development(self):
        """Line 88: when _is_local_development() returns False, returns False."""
        from app.core.auth import _allow_dev_user_metadata_org_id

        with patch("app.core.auth._is_local_development", return_value=False):
            assert _allow_dev_user_metadata_org_id() is False

    def test_returns_true_when_local_dev_and_flag_set(self):
        from app.core.auth import _allow_dev_user_metadata_org_id

        with (
            patch("app.core.auth._is_local_development", return_value=True),
            patch(
                "app.core.auth.settings",
                ALLOW_DEV_USER_METADATA_ORG_ID=True,
            ),
        ):
            assert _allow_dev_user_metadata_org_id() is True


class TestHs256PayloadNotDict:
    """Test HS256 decoded payload not-a-dict branch (lines 235-236)."""

    @patch("app.core.auth.settings")
    def test_hs256_list_payload_raises_401(self, mock_settings):
        """When jwt.decode returns a list instead of dict, raise 401."""
        mock_settings.SUPABASE_JWT_SECRET = TEST_SECRET
        mock_settings.ENVIRONMENT = "development"
        mock_settings.is_production = False
        mock_settings.LEGACY_HS256_ENABLED = True
        with (
            patch("app.core.auth.jwt.get_unverified_header") as m_h,
            patch("app.core.auth.jwt.decode") as m_d,
        ):
            m_h.return_value = {"alg": "HS256"}
            m_d.return_value = ["not", "a", "dict"]
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt("some-token")
            assert exc_info.value.status_code == 401
