"""Tests for app.core.config — Settings and validation."""

from unittest.mock import patch

import pytest


class TestSettingsDefaults:
    """Test default values for Settings."""

    def test_default_database_url(self) -> None:
        with patch.dict(
            "os.environ",
            {"SUPABASE_JWT_SECRET": "", "SUPABASE_URL": ""},
            clear=False,
        ):
            from app.core.config import Settings

            s = Settings(
                _env_file=None,
                DATABASE_URL="postgresql+asyncpg://localhost:5432/praedixa",
            )
            assert s.DATABASE_URL == "postgresql+asyncpg://localhost:5432/praedixa"

    def test_default_environment(self) -> None:
        s = self._make_settings()
        assert s.ENVIRONMENT == "development"

    def test_default_debug(self) -> None:
        s = self._make_settings()
        assert s.DEBUG is True

    def test_default_log_level(self) -> None:
        s = self._make_settings()
        assert s.LOG_LEVEL == "debug"

    def test_default_api_prefix(self) -> None:
        s = self._make_settings()
        assert s.API_V1_PREFIX == "/api/v1"

    def test_default_cors_origins(self) -> None:
        s = self._make_settings()
        assert s.CORS_ORIGINS == [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:3002",
            "http://[::1]:3000",
            "http://[::1]:3001",
            "http://[::1]:3002",
        ]

    def test_default_app_version(self) -> None:
        s = self._make_settings()
        assert s.APP_VERSION == "0.1.0"

    def test_default_legacy_hs256_disabled(self) -> None:
        s = self._make_settings()
        assert s.LEGACY_HS256_ENABLED is False

    @staticmethod
    def _make_settings(**overrides):
        from app.core.config import Settings

        defaults = {
            "SUPABASE_JWT_SECRET": "",
            "SUPABASE_URL": "",
            "ENVIRONMENT": "development",
        }
        defaults.update(overrides)
        return Settings(_env_file=None, **defaults)


class TestIsProduction:
    """Test is_production property."""

    def test_production_true(self) -> None:
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="production",
            DEBUG=False,
            SUPABASE_JWT_SECRET="a" * 40,
            SUPABASE_URL="https://proj.supabase.co",
            KEY_PROVIDER="scaleway",
            RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
            CORS_ORIGINS=["https://app.praedixa.com"],
        )
        assert s.is_production is True

    def test_development_false(self) -> None:
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="development",
            SUPABASE_JWT_SECRET="",
            SUPABASE_URL="",
        )
        assert s.is_production is False

    def test_staging_false(self) -> None:
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="staging",
            DEBUG=False,
            SUPABASE_JWT_SECRET="x" * 40,
            SUPABASE_URL="https://proj.supabase.co",
            KEY_PROVIDER="scaleway",
            RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
            CORS_ORIGINS=["https://staging.praedixa.com"],
        )
        assert s.is_production is False


class TestValidateSecrets:
    """Test _validate_secrets model validator."""

    def test_production_short_secret_raises(self) -> None:
        from app.core.config import Settings

        with pytest.raises(ValueError, match="at least 32 characters"):
            Settings(
                _env_file=None,
                ENVIRONMENT="production",
                DEBUG=False,
                SUPABASE_JWT_SECRET="short",
                SUPABASE_URL="",
                RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
            )

    def test_production_empty_secret_raises(self) -> None:
        from app.core.config import Settings

        with pytest.raises(ValueError, match="at least 32 characters"):
            Settings(
                _env_file=None,
                ENVIRONMENT="production",
                DEBUG=False,
                SUPABASE_JWT_SECRET="",
                SUPABASE_URL="",
                RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
            )

    def test_production_valid_secret_ok(self) -> None:
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="production",
            DEBUG=False,
            SUPABASE_JWT_SECRET="x" * 32,
            SUPABASE_URL="https://proj.supabase.co",
            KEY_PROVIDER="scaleway",
            RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
            CORS_ORIGINS=["https://app.praedixa.com"],
        )
        assert len(s.SUPABASE_JWT_SECRET) == 32

    def test_production_long_secret_ok(self) -> None:
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="production",
            DEBUG=False,
            SUPABASE_JWT_SECRET="x" * 64,
            SUPABASE_URL="https://proj.supabase.co",
            KEY_PROVIDER="scaleway",
            RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
            CORS_ORIGINS=["https://app.praedixa.com"],
        )
        assert len(s.SUPABASE_JWT_SECRET) == 64

    def test_dev_short_secret_ok(self) -> None:
        """Development mode allows short secrets."""
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="development",
            SUPABASE_JWT_SECRET="dev",
            SUPABASE_URL="",
        )
        assert s.SUPABASE_JWT_SECRET == "dev"

    def test_dev_empty_secret_ok(self) -> None:
        """Development mode allows empty secrets."""
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="development",
            SUPABASE_JWT_SECRET="",
            SUPABASE_URL="",
        )
        assert s.SUPABASE_JWT_SECRET == ""

    def test_invalid_environment_raises(self) -> None:
        from app.core.config import Settings

        with pytest.raises(ValueError, match="ENVIRONMENT must be one of"):
            Settings(
                _env_file=None,
                ENVIRONMENT="qa",
                SUPABASE_JWT_SECRET="",
                SUPABASE_URL="",
            )

    def test_staging_rejects_localhost_cors(self) -> None:
        from app.core.config import Settings

        with pytest.raises(ValueError, match="cannot include localhost"):
            Settings(
                _env_file=None,
                ENVIRONMENT="staging",
                DEBUG=False,
                SUPABASE_JWT_SECRET="x" * 40,
                SUPABASE_URL="https://proj.supabase.co",
                KEY_PROVIDER="scaleway",
                RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
                CORS_ORIGINS=["https://localhost:3001"],
            )

    def test_staging_placeholder_supabase_url_raises(self) -> None:
        """Lines 132-135: placeholder SUPABASE_URL rejected in staging."""
        from app.core.config import Settings

        with pytest.raises(
            ValueError, match="SUPABASE_URL must be explicitly configured"
        ):
            Settings(
                _env_file=None,
                ENVIRONMENT="staging",
                DEBUG=False,
                SUPABASE_JWT_SECRET="x" * 40,
                SUPABASE_URL="https://your-project.supabase.co",
                KEY_PROVIDER="scaleway",
                RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
                CORS_ORIGINS=["https://staging.praedixa.com"],
            )

    def test_staging_empty_supabase_url_raises(self) -> None:
        """Lines 132-135: empty SUPABASE_URL rejected in staging."""
        from app.core.config import Settings

        with pytest.raises(
            ValueError, match="SUPABASE_URL must be explicitly configured"
        ):
            Settings(
                _env_file=None,
                ENVIRONMENT="staging",
                DEBUG=False,
                SUPABASE_JWT_SECRET="x" * 40,
                SUPABASE_URL="",
                KEY_PROVIDER="scaleway",
                RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
                CORS_ORIGINS=["https://staging.praedixa.com"],
            )

    def test_staging_empty_cors_origins_raises(self) -> None:
        """Line 147: empty CORS_ORIGINS rejected in staging."""
        from app.core.config import Settings

        with pytest.raises(ValueError, match="CORS_ORIGINS cannot be empty"):
            Settings(
                _env_file=None,
                ENVIRONMENT="staging",
                DEBUG=False,
                SUPABASE_JWT_SECRET="x" * 40,
                SUPABASE_URL="https://proj.supabase.co",
                KEY_PROVIDER="scaleway",
                RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
                CORS_ORIGINS=[],
            )

    def test_staging_http_cors_origin_raises(self) -> None:
        """Line 153: non-https CORS_ORIGINS rejected in staging."""
        from app.core.config import Settings

        with pytest.raises(ValueError, match="CORS_ORIGINS must use https"):
            Settings(
                _env_file=None,
                ENVIRONMENT="staging",
                DEBUG=False,
                SUPABASE_JWT_SECRET="x" * 40,
                SUPABASE_URL="https://proj.supabase.co",
                KEY_PROVIDER="scaleway",
                RATE_LIMIT_STORAGE_URI="redis://localhost:6379/0",
                CORS_ORIGINS=["http://staging.praedixa.com"],
            )
