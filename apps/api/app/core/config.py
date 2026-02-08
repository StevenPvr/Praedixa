"""Application configuration via environment variables.

Security notes:
- Secrets are loaded from environment variables, never hardcoded.
- CORS_ORIGINS uses an explicit allowlist, never wildcards in production.
- DEBUG and docs endpoints are disabled in production by default.
- JWT secret minimum length is enforced to prevent weak-key attacks.
"""

from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings

# Minimum JWT secret length to prevent brute-force attacks.
# Supabase default JWT secrets are 40+ chars, so 32 is a safe minimum.
_MIN_JWT_SECRET_LENGTH = 32
_VALID_ENVIRONMENTS = {"development", "staging", "production"}
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
_PLACEHOLDER_SUPABASE_URLS = {"", "https://your-project.supabase.co"}


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://praedixa:changeme@localhost:5433/praedixa"

    # Supabase Auth — JWT verification
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_URL: str = ""

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
    # Empty => in-memory backend (local development only).
    RATE_LIMIT_STORAGE_URI: str = ""

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
    # Suffixes for per-client schemas: {org_slug}_{suffix}
    RAW_SCHEMA_SUFFIX: str = "raw"
    TRANSFORMED_SCHEMA_SUFFIX: str = "transformed"
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

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @model_validator(mode="after")
    def _validate_secrets(self) -> "Settings":
        """Enforce minimum security for JWT secret and production safety.

        In staging/production, a missing or weak JWT secret would allow
        trivial token forgery. We enforce strict validation at startup.

        DEBUG is forced off in staging/production to prevent stack trace leakage
        even if the environment variable is misconfigured.
        """
        normalized_env = self.ENVIRONMENT.strip().lower()
        if normalized_env not in _VALID_ENVIRONMENTS:
            msg = (
                f"ENVIRONMENT must be one of: {', '.join(sorted(_VALID_ENVIRONMENTS))}"
            )
            raise ValueError(msg)
        self.ENVIRONMENT = normalized_env

        if normalized_env in {"staging", "production"}:
            # Force DEBUG off in non-dev environments.
            self.DEBUG = False

            secret_len = len(self.SUPABASE_JWT_SECRET)
            if secret_len < _MIN_JWT_SECRET_LENGTH:
                msg = (
                    f"SUPABASE_JWT_SECRET must be at least {_MIN_JWT_SECRET_LENGTH} "
                    "characters in staging/production to prevent brute-force attacks"
                )
                raise ValueError(msg)

            if self.SUPABASE_URL.strip() in _PLACEHOLDER_SUPABASE_URLS:
                msg = "SUPABASE_URL must be explicitly configured in staging/production"
                raise ValueError(msg)

            # Force Scaleway key provider in staging/production — LocalKeyProvider
            # cannot perform real crypto-shredding.
            if self.KEY_PROVIDER != "scaleway":  # pragma: no cover
                msg = (
                    "KEY_PROVIDER must be 'scaleway' in staging/production. "
                    "LocalKeyProvider cannot guarantee crypto-shredding."
                )
                raise ValueError(msg)

            if not self.CORS_ORIGINS:
                raise ValueError("CORS_ORIGINS cannot be empty in staging/production")

            for origin in self.CORS_ORIGINS:
                parsed = urlparse(origin)
                host = parsed.hostname
                if parsed.scheme != "https":
                    raise ValueError(
                        "CORS_ORIGINS must use https in staging/production"
                    )
                if host in _LOCAL_HOSTS or (host and host.endswith(".local")):
                    msg = "CORS_ORIGINS cannot include localhost in staging/production"
                    raise ValueError(msg)
        return self

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
