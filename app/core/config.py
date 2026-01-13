"""
Application configuration management.

Centralizes environment variables and configuration settings.
"""
import os
from dotenv import load_dotenv

load_dotenv()


def get_openai_api_key() -> str:
    """
    Get OpenAI API key from environment.

    Returns:
        API key string

    Raises:
        RuntimeError: If OPENAI_API_KEY is not set
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. "
            "Please add it to your .env file."
        )
    return api_key


def get_database_url() -> str:
    """
    Get database URL from environment.

    Returns:
        Database connection string

    Raises:
        RuntimeError: If DATABASE_URL is not set
    """
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url
