"""Application configuration via environment variables.

Security notes:
- Secrets are loaded from environment variables, never hardcoded.
- CORS_ORIGINS uses an explicit allowlist, never wildcards in production.
- DEBUG and docs endpoints are disabled in production by default.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/praedixa"

    # Supabase Auth — JWT verification
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_URL: str = ""

    # CORS — explicit origin allowlist
    CORS_ORIGINS: list[str] = ["http://localhost:3001"]

    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "debug"
    API_V1_PREFIX: str = "/api/v1"
    APP_VERSION: str = "0.1.0"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
