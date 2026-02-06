"""Application configuration via environment variables.

Security notes:
- Secrets are loaded from environment variables, never hardcoded.
- CORS_ORIGINS uses an explicit allowlist, never wildcards in production.
- DEBUG and docs endpoints are disabled in production by default.
- JWT secret minimum length is enforced to prevent weak-key attacks.
"""

from pydantic import model_validator
from pydantic_settings import BaseSettings

# Minimum JWT secret length to prevent brute-force attacks.
# Supabase default JWT secrets are 40+ chars, so 32 is a safe minimum.
_MIN_JWT_SECRET_LENGTH = 32


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
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://[::1]:3000",
        "http://[::1]:3001",
    ]

    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "debug"
    API_V1_PREFIX: str = "/api/v1"
    APP_VERSION: str = "0.1.0"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @model_validator(mode="after")
    def _validate_secrets(self) -> "Settings":
        """Enforce minimum security for JWT secret and production safety.

        In production, a missing or weak JWT secret would allow trivial
        token forgery. We enforce a minimum length at startup to fail-fast.

        DEBUG is forced off in production to prevent stack trace leakage
        even if the environment variable is misconfigured.
        """
        if self.is_production:
            # Force DEBUG off in production — defense against misconfiguration
            if self.DEBUG:
                self.DEBUG = False

            secret_len = len(self.SUPABASE_JWT_SECRET)
            if secret_len < _MIN_JWT_SECRET_LENGTH:
                msg = (
                    f"SUPABASE_JWT_SECRET must be at least {_MIN_JWT_SECRET_LENGTH} "
                    "characters in production to prevent brute-force attacks"
                )
                raise ValueError(msg)
        return self

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
