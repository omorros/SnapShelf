"""
Tests for which model the vision client calls.

The research selected GPT-5.2, so it is the default; OPENAI_VISION_MODEL overrides it.
GPT-5.x rejects max_tokens, so the request must use max_completion_tokens.
"""
import json
from unittest.mock import MagicMock

from app.services.ingestion.vision_client import VisionClient

JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 10


def _client_with_mocked_openai():
    client = VisionClient()
    openai = MagicMock()
    message = MagicMock(content=json.dumps({"items": []}))
    openai.chat.completions.create.return_value.choices = [MagicMock(message=message)]
    client._client = openai
    return client, openai


def test_uses_default_model(monkeypatch):
    monkeypatch.delenv("OPENAI_VISION_MODEL", raising=False)
    client, openai = _client_with_mocked_openai()

    client.detect_food_items(JPEG_BYTES)

    kwargs = openai.chat.completions.create.call_args.kwargs
    assert kwargs["model"] == "gpt-5.2"
    assert kwargs["max_completion_tokens"] == 800
    assert "max_tokens" not in kwargs


def test_model_overridable_by_env(monkeypatch):
    monkeypatch.setenv("OPENAI_VISION_MODEL", "gpt-4o-mini")
    client, openai = _client_with_mocked_openai()

    client.detect_food_items(JPEG_BYTES)

    assert openai.chat.completions.create.call_args.kwargs["model"] == "gpt-4o-mini"
