from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Server
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./galaxypulse.db"

    # OpenRouter (free LLM access)
    OPENROUTER_API_KEY: str = ""
    LLM_PRIMARY_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"
    LLM_FALLBACK_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"  # same model as fallback

    # JWT
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # OpenClaw
    OPENCLAW_WEBHOOK_SECRET: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)


settings = Settings()
