"""Runtime configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated configuration for the VitaLink API."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="VITALINK_", extra="ignore")

    database_url: str = "postgresql+psycopg://vitallink:vitallink@localhost:5432/vitallink"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    public_origin: str = "https://localhost"
    secret_key: SecretStr


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide validated settings.

    Returns:
        The cached application settings.
    """
    return Settings()  # type: ignore[call-arg]
