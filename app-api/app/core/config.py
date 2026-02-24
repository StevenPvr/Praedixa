"""Data/ML engine configuration via environment variables."""

from pydantic import model_validator
from pydantic_settings import BaseSettings

_VALID_ENVIRONMENTS = {"development", "staging", "production"}
_VALID_KEY_PROVIDERS = {"local", "scaleway"}
_MIN_LOCAL_KEY_SEED_LENGTH = 16


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://praedixa:changeme@localhost:5433/praedixa"

    # Runtime
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "debug"
    APP_VERSION: str = "0.1.0"

    # Key management
    KEY_PROVIDER: str = "local"
    LOCAL_KEY_SEED: str = "praedixa-dev-seed-change-me"
    SCW_SECRET_KEY: str = ""
    SCW_DEFAULT_PROJECT_ID: str = ""
    SCW_REGION: str = "fr-par"

    # Data foundation
    PLATFORM_SCHEMA: str = "platform"
    DATA_SCHEMA_SUFFIX: str = "data"
    MAX_DATASETS_PER_ORG: int = 50
    MAX_COLUMNS_PER_TABLE: int = 200
    MAX_WINDOWS_PER_DATASET: int = 10
    MIN_WINDOW_SIZE: int = 1
    MAX_WINDOW_SIZE: int = 365
    DEFAULT_LOOKBACK_DAYS: int = 60

    # File ingestion
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024
    MAX_ROWS_PER_INGESTION: int = 500_000
    UPLOAD_COOLDOWN_SECONDS: int = 10

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @model_validator(mode="after")
    def _validate_settings(self) -> "Settings":
        normalized_env = self.ENVIRONMENT.strip().lower()
        if normalized_env not in _VALID_ENVIRONMENTS:
            msg = (
                f"ENVIRONMENT must be one of: {', '.join(sorted(_VALID_ENVIRONMENTS))}"
            )
            raise ValueError(msg)
        self.ENVIRONMENT = normalized_env

        key_provider = self.KEY_PROVIDER.strip().lower()
        if key_provider not in _VALID_KEY_PROVIDERS:
            msg = (
                "KEY_PROVIDER must be one of: "
                f"{', '.join(sorted(_VALID_KEY_PROVIDERS))}"
            )
            raise ValueError(msg)
        self.KEY_PROVIDER = key_provider

        if normalized_env in {"staging", "production"} and self.DEBUG:
            raise ValueError("DEBUG must be false in staging/production")

        if normalized_env in {"staging", "production"} and key_provider != "scaleway":
            msg = "KEY_PROVIDER must be 'scaleway' in staging/production"
            raise ValueError(msg)

        if key_provider == "local":
            seed = self.LOCAL_KEY_SEED.strip()
            if len(seed) < _MIN_LOCAL_KEY_SEED_LENGTH:
                msg = (
                    "LOCAL_KEY_SEED must be configured when KEY_PROVIDER=local "
                    f"(minimum {_MIN_LOCAL_KEY_SEED_LENGTH} characters)"
                )
                raise ValueError(msg)
        else:
            if not self.SCW_SECRET_KEY.strip():
                raise ValueError(
                    "SCW_SECRET_KEY must be configured when KEY_PROVIDER=scaleway"
                )
            if not self.SCW_DEFAULT_PROJECT_ID.strip():
                raise ValueError(
                    "SCW_DEFAULT_PROJECT_ID must be configured when "
                    "KEY_PROVIDER=scaleway"
                )

        return self

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
