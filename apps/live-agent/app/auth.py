"""API key authentication for WebSocket connections."""

from config import settings


def verify_api_key(api_key: str | None) -> bool:
    """Check if the provided API key matches the configured secret."""
    return api_key is not None and api_key == settings.API_SECRET_KEY
