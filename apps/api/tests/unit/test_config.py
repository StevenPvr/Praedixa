"""Tests for app.core.config — Settings and validation."""

from unittest.mock import patch

import pytest


class TestSettingsDefaults:
    """Test default values for Settings."""

    def test_default_database_url(self):
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

    def test_default_environment(self):
        s = self._make_settings()
        assert s.ENVIRONMENT == "development"

    def test_default_debug(self):
        s = self._make_settings()
        assert s.DEBUG is True

    def test_default_log_level(self):
        s = self._make_settings()
        assert s.LOG_LEVEL == "debug"

    def test_default_api_prefix(self):
        s = self._make_settings()
        assert s.API_V1_PREFIX == "/api/v1"

    def test_default_cors_origins(self):
        s = self._make_settings()
        assert s.CORS_ORIGINS == [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://[::1]:3000",
            "http://[::1]:3001",
        ]

    def test_default_app_version(self):
        s = self._make_settings()
        assert s.APP_VERSION == "0.1.0"

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

    def test_production_true(self):
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="a" * 40,
            SUPABASE_URL="",
        )
        assert s.is_production is True

    def test_development_false(self):
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="development",
            SUPABASE_JWT_SECRET="",
            SUPABASE_URL="",
        )
        assert s.is_production is False

    def test_staging_false(self):
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="staging",
            SUPABASE_JWT_SECRET="",
            SUPABASE_URL="",
        )
        assert s.is_production is False


class TestValidateSecrets:
    """Test _validate_secrets model validator."""

    def test_production_short_secret_raises(self):
        from app.core.config import Settings

        with pytest.raises(ValueError, match="at least 32 characters"):
            Settings(
                _env_file=None,
                ENVIRONMENT="production",
                SUPABASE_JWT_SECRET="short",
                SUPABASE_URL="",
            )

    def test_production_empty_secret_raises(self):
        from app.core.config import Settings

        with pytest.raises(ValueError, match="at least 32 characters"):
            Settings(
                _env_file=None,
                ENVIRONMENT="production",
                SUPABASE_JWT_SECRET="",
                SUPABASE_URL="",
            )

    def test_production_valid_secret_ok(self):
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="x" * 32,
            SUPABASE_URL="",
        )
        assert len(s.SUPABASE_JWT_SECRET) == 32

    def test_production_long_secret_ok(self):
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="x" * 64,
            SUPABASE_URL="",
        )
        assert len(s.SUPABASE_JWT_SECRET) == 64

    def test_dev_short_secret_ok(self):
        """Development mode allows short secrets."""
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="development",
            SUPABASE_JWT_SECRET="dev",
            SUPABASE_URL="",
        )
        assert s.SUPABASE_JWT_SECRET == "dev"

    def test_dev_empty_secret_ok(self):
        """Development mode allows empty secrets."""
        from app.core.config import Settings

        s = Settings(
            _env_file=None,
            ENVIRONMENT="development",
            SUPABASE_JWT_SECRET="",
            SUPABASE_URL="",
        )
        assert s.SUPABASE_JWT_SECRET == ""
