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
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "vitallink"
    s3_secret_key: SecretStr = SecretStr("vitallink-development-secret")
    s3_quarantine_bucket: str = "vitallink-quarantine"
    s3_approved_bucket: str = "vitallink-approved"
    clamav_host: str = "localhost"
    clamav_port: int = 3310
    document_max_bytes: int = 20 * 1024 * 1024
    patient_document_quota_bytes: int = 200 * 1024 * 1024
    transcription_model: str = "Systran/faster-whisper-small"
    transcription_revision: str = "536b0662742c02347bc0e980a01041f333bce120"
    transcription_device: str = "cpu"
    transcription_compute_type: str = "int8"
    transcription_cache_dir: str = "/tmp/vitallink-whisper-models"
    transcription_temp_dir: str = "/tmp/vitallink-transcriptions"
    transcription_max_bytes: int = 10 * 1024 * 1024
    transcription_max_seconds: int = 120
    transcription_timeout_seconds: int = 180
    secret_key: SecretStr


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide validated settings.

    Returns:
        The cached application settings.
    """
    return Settings()  # type: ignore[call-arg]
