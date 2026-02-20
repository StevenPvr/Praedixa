"""Application configuration via environment variables.

Security notes:
- Secrets are loaded from environment variables, never hardcoded.
- CORS_ORIGINS uses an explicit allowlist, never wildcards in production.
- Staging/production startup is fail-closed for unsafe dev settings.
- Supports both legacy Supabase JWT config and explicit OIDC/JWKS config.
"""

from ipaddress import ip_address, ip_network
from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings

_MIN_JWT_SECRET_LENGTH = 32
_MIN_CONTACT_INGEST_TOKEN_LENGTH = 32
_VALID_ENVIRONMENTS = {"development", "staging", "production"}
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
_PLACEHOLDER_SUPABASE_URLS = {"", "https://your-project.supabase.co"}


def _is_valid_absolute_http_url(value: str) -> bool:
    parsed = urlparse(value.strip())
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _is_valid_proxy_entry(value: str) -> bool:
    """Validate one TRUSTED_PROXY_IPS entry as IP or CIDR network."""
    raw = value.strip()
    if not raw:
        return False
    try:
        if "/" in raw:
            ip_network(raw, strict=False)
        else:
            ip_address(raw)
    except ValueError:
        return False
    return True


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://praedixa:changeme@localhost:5433/praedixa"

    # Legacy Supabase Auth (kept for compatibility during transition).
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_URL: str = ""

    # OIDC Auth — JWT verification (preferred).
    AUTH_JWKS_URL: str = ""
    AUTH_ISSUER_URL: str = ""
    AUTH_AUDIENCE: str = "authenticated"
    AUTH_ALLOWED_JWKS_HOSTS: list[str] = []

    # CORS — explicit origin allowlist
    # Include common local origins used by Safari/Chrome/Firefox in dev.
    CORS_ORIGINS: list[str] = [
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

    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "debug"
    API_V1_PREFIX: str = "/api/v1"
    APP_VERSION: str = "0.1.0"

    # JWT — Legacy HS256 support for dev transition.
    # Disabled by default. Enable only for short-lived local migration windows.
    LEGACY_HS256_ENABLED: bool = False
    # Development-only fallbacks: OFF by default (defense in depth).
    ALLOW_DEV_ISSUER_FALLBACK: bool = False
    ALLOW_DEV_USER_METADATA_ORG_ID: bool = False

    # ── Rate Limiting ────────────────────────────────
    # Optional Redis backend for distributed rate limiting.
    # Required in staging/production.
    RATE_LIMIT_STORAGE_URI: str = ""
    CONTACT_API_INGEST_TOKEN: str = ""
    # Forwarded headers are trusted only when request.client.host
    # belongs to this allowlist (IP or CIDR notation).
    TRUSTED_PROXY_IPS: list[str] = ["127.0.0.1", "::1"]

    # ── Key Management ────────────────────────────────
    # "local" (dev — derives from LOCAL_KEY_SEED) or
    # "scaleway" (production — Scaleway Secrets Manager)
    KEY_PROVIDER: str = "local"
    LOCAL_KEY_SEED: str = ""

    # ── Scaleway Secrets Manager (production only) ──
    SCW_SECRET_KEY: str = ""
    SCW_DEFAULT_PROJECT_ID: str = ""
    SCW_REGION: str = "fr-par"

    # ── Data Foundation ──────────────────────────────
    # Platform schema name (contains data catalog tables)
    PLATFORM_SCHEMA: str = "platform"
    # Suffix for per-client data schema: {org_slug}_{suffix}
    DATA_SCHEMA_SUFFIX: str = "data"
    # Safety limits — enforced at YAML validation and Schema Manager level
    MAX_DATASETS_PER_ORG: int = 50
    MAX_COLUMNS_PER_TABLE: int = 200
    MAX_WINDOWS_PER_DATASET: int = 10
    # Transform Engine — lag/rolling window bounds (days)
    MIN_WINDOW_SIZE: int = 1
    MAX_WINDOW_SIZE: int = 365
    # Lookback context for incremental transforms (days)
    DEFAULT_LOOKBACK_DAYS: int = 60
    # ── File Upload Ingestion ─────────────────────────
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    MAX_ROWS_PER_INGESTION: int = 500_000
    UPLOAD_COOLDOWN_SECONDS: int = 10
    # Mock forecast router gate (production disabled by default).
    ENABLE_MOCK_FORECAST_ROUTER: bool = False

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @staticmethod
    def _validate_dev_toggles_off(settings: "Settings") -> None:
        """Reject unsafe development toggles in staging/production."""
        _toggle_checks: list[tuple[str, str]] = [
            ("DEBUG", "DEBUG must be false in staging/production"),
            (
                "LEGACY_HS256_ENABLED",
                "LEGACY_HS256_ENABLED must be false in staging/production",
            ),
            (
                "ALLOW_DEV_ISSUER_FALLBACK",
                "ALLOW_DEV_ISSUER_FALLBACK must be false in staging/production",
            ),
            (
                "ALLOW_DEV_USER_METADATA_ORG_ID",
                "ALLOW_DEV_USER_METADATA_ORG_ID must be false in staging/production",
            ),
        ]
        for attr, msg in _toggle_checks:
            if getattr(settings, attr):
                raise ValueError(msg)

    @staticmethod
    def _validate_cors_origins(origins: list[str]) -> None:
        """Validate CORS origins for staging/production."""
        if not origins:
            raise ValueError("CORS_ORIGINS cannot be empty in staging/production")
        for origin in origins:
            parsed = urlparse(origin)
            host = parsed.hostname
            if parsed.scheme != "https":
                raise ValueError("CORS_ORIGINS must use https in staging/production")
            if host in _LOCAL_HOSTS or (host and host.endswith(".local")):
                msg = "CORS_ORIGINS cannot include localhost in staging/production"
                raise ValueError(msg)

    @staticmethod
    def _has_oidc_provider_configured(settings: "Settings") -> bool:
        return bool(settings.AUTH_JWKS_URL.strip() or settings.AUTH_ISSUER_URL.strip())

    @staticmethod
    def _validate_oidc_provider_settings(settings: "Settings") -> None:
        """Validate OIDC/JWKS authentication settings."""
        jwks_url = settings.AUTH_JWKS_URL.strip()
        issuer = settings.AUTH_ISSUER_URL.strip()
        audience = settings.AUTH_AUDIENCE.strip()

        if not audience:
            raise ValueError("AUTH_AUDIENCE cannot be empty")

        if not jwks_url and not issuer:
            raise ValueError(
                "AUTH_JWKS_URL or AUTH_ISSUER_URL must be configured in staging/production"
            )

        allowed_jwks_hosts = {
            host.strip().lower()
            for host in settings.AUTH_ALLOWED_JWKS_HOSTS
            if host.strip()
        }

        if jwks_url:
            if not _is_valid_absolute_http_url(jwks_url):
                raise ValueError("AUTH_JWKS_URL must be an absolute http(s) URL")
            if not allowed_jwks_hosts:
                raise ValueError(
                    "AUTH_ALLOWED_JWKS_HOSTS cannot be empty in staging/production"
                )
            jwks_host = (urlparse(jwks_url).hostname or "").lower()
            if not jwks_host or jwks_host not in allowed_jwks_hosts:
                raise ValueError(
                    "AUTH_JWKS_URL host must be present in AUTH_ALLOWED_JWKS_HOSTS"
                )
            if jwks_host in _LOCAL_HOSTS:
                raise ValueError(
                    "AUTH_JWKS_URL cannot target localhost in staging/production"
                )

        if issuer:
            if not _is_valid_absolute_http_url(issuer):
                raise ValueError("AUTH_ISSUER_URL must be an absolute http(s) URL")
            if allowed_jwks_hosts:
                issuer_host = (urlparse(issuer).hostname or "").lower()
                if issuer_host not in allowed_jwks_hosts:
                    raise ValueError(
                        "AUTH_ISSUER_URL host must be present in AUTH_ALLOWED_JWKS_HOSTS"
                    )

    @staticmethod
    def _validate_legacy_supabase_settings(settings: "Settings") -> None:
        secret_len = len(settings.SUPABASE_JWT_SECRET)
        if secret_len < _MIN_JWT_SECRET_LENGTH:
            msg = (
                f"SUPABASE_JWT_SECRET must be at least {_MIN_JWT_SECRET_LENGTH} "
                "characters in staging/production to prevent brute-force attacks"
            )
            raise ValueError(msg)

        if settings.SUPABASE_URL.strip() in _PLACEHOLDER_SUPABASE_URLS:
            msg = "SUPABASE_URL must be explicitly configured in staging/production"
            raise ValueError(msg)

    @model_validator(mode="after")
    def _validate_secrets(self) -> "Settings":
        """Enforce production safety constraints.

        Staging/production is fail-closed: unsafe development toggles are
        rejected at startup instead of being silently overridden.
        """
        normalized_env = self.ENVIRONMENT.strip().lower()
        if normalized_env not in _VALID_ENVIRONMENTS:
            msg = (
                f"ENVIRONMENT must be one of: {', '.join(sorted(_VALID_ENVIRONMENTS))}"
            )
            raise ValueError(msg)
        self.ENVIRONMENT = normalized_env

        if not self.TRUSTED_PROXY_IPS:
            raise ValueError("TRUSTED_PROXY_IPS cannot be empty")
        for proxy in self.TRUSTED_PROXY_IPS:
            if not _is_valid_proxy_entry(proxy):
                raise ValueError("TRUSTED_PROXY_IPS must contain valid IP/CIDR entries")

        if normalized_env in {"staging", "production"}:
            Settings._validate_dev_toggles_off(self)

            if Settings._has_oidc_provider_configured(self):
                Settings._validate_oidc_provider_settings(self)
            else:
                Settings._validate_legacy_supabase_settings(self)

            # Force Scaleway key provider in staging/production — LocalKeyProvider
            # cannot perform real crypto-shredding.
            if self.KEY_PROVIDER != "scaleway":  # pragma: no cover
                msg = (
                    "KEY_PROVIDER must be 'scaleway' in staging/production. "
                    "LocalKeyProvider cannot guarantee crypto-shredding."
                )
                raise ValueError(msg)

            if not self.RATE_LIMIT_STORAGE_URI.strip():
                raise ValueError(
                    "RATE_LIMIT_STORAGE_URI must be configured in staging/production"
                )

            token = self.CONTACT_API_INGEST_TOKEN.strip()
            if token and len(token) < _MIN_CONTACT_INGEST_TOKEN_LENGTH:
                raise ValueError(
                    "CONTACT_API_INGEST_TOKEN must be at least "
                    f"{_MIN_CONTACT_INGEST_TOKEN_LENGTH} characters "
                    "when configured"
                )

            Settings._validate_cors_origins(self.CORS_ORIGINS)
        return self

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
