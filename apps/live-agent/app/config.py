"""Environment configuration using Pydantic settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GOOGLE_CLOUD_PROJECT: str
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    API_SECRET_KEY: str = "reptrainer-secret-123"
    PORT: int = 5000

    # Model IDs — keep in sync with packages/shared/src/constants.ts
    LIVE_MODEL: str = "gemini-live-2.5-flash-native-audio"
    TEXT_MODEL: str = "gemini-2.5-flash"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"


settings = Settings()
