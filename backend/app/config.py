"""Application configuration using pydantic-settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Workspace configuration
    workspace_path: Path = Path.home() / "projects"

    # API configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Docker configuration
    docker_socket: str = "/var/run/docker.sock"


def get_settings() -> Settings:
    """Get application settings instance."""
    return Settings()


settings = get_settings()
