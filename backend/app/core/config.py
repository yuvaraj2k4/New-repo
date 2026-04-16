from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl
from typing import List
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "DevPilot"
    APP_ENV: str = "development"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ACCESS_COOKIE_NAME: str = "access_token"
    REFRESH_COOKIE_NAME: str = "refresh_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # AI Provider selector: "gemini" | "openrouter"
    # Set to "openrouter" in development to avoid Gemini free-tier token limits.
    AI_PROVIDER: str = "gemini"

    # OpenRouter (used when AI_PROVIDER=openrouter)
    OPENAI_API_KEY: str = "sk-placeholder"
    OPENAI_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENAI_MODEL: str = "google/gemma-3-12b-it:free"

    # Google Gemini (used when AI_PROVIDER=gemini)
    GEMINI_API_KEY: str | None = None

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    MINIO_BUCKET: str = "devpilot"
    MINIO_SECURE: bool = False

    # CORS
    BACKEND_CORS_ORIGINS: str = '["http://localhost:3000"]'

    # CSRF Protection
    CSRF_COOKIE_NAME: str = "csrf_token"
    CSRF_HEADER_NAME: str = "X-CSRF-Token"

    def get_cors_origins(self) -> List[str]:
        return json.loads(self.BACKEND_CORS_ORIGINS)


settings = Settings()
