"""
LLM client module for OpenAI Vision API.
Frozen prompt for research comparison.
"""

import base64
import json
from typing import List, Optional
from openai import OpenAI
from config import OPENAI_API_KEY


# =============================================================================
# FROZEN PROMPT - Same prompt used for both System A and System B
# =============================================================================

FROZEN_PROMPT_SINGLE = """Analyze this image. Identify the food item visible.

Respond with ONLY this JSON (no markdown, no explanation):
{
  "is_food": true,
  "name": "<generic name, not brand>",
  "state": "<fresh|packaged|cooked|unknown>"
}

If NOT food: {"is_food": false}

Rules:
- name: Use generic names (e.g., "apple" not "Granny Smith", "chips" not "Lay's")
- state: fresh (raw produce), packaged (in container/wrapper), cooked (prepared), unknown
"""

FROZEN_PROMPT_MULTI = """Analyze this image. Identify ALL food items visible.

Respond with ONLY this JSON (no markdown, no explanation):
{
  "items": [
    {"name": "<generic name>", "state": "<fresh|packaged|cooked|unknown>"}
  ]
}

If no food visible: {"items": []}

Rules:
- name: Use generic names (e.g., "apple" not "Granny Smith", "milk" not "Lactaid")
- state: fresh (raw produce), packaged (in container/wrapper), cooked (prepared), unknown
- Include ALL distinct food items
"""

# =============================================================================


class LLMClient:
    """OpenAI Vision API client with frozen prompts."""

    def __init__(self):
        """Initialize with API key from environment."""
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.model = "gpt-4o-mini"

    def identify_single(self, image_bytes: bytes) -> Optional[dict]:
        """
        Identify single food item from cropped image.
        Used by System B (YOLO-LLM) for per-crop analysis.

        Returns:
            Dict with name, state if food detected, None otherwise
        """
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": FROZEN_PROMPT_SINGLE},
                        {"type": "image_url", "image_url": {
                            "url": f"data:image/png;base64,{image_b64}",
                            "detail": "low"
                        }}
                    ]
                }],
                max_tokens=150,
                temperature=0
            )

            content = response.choices[0].message.content.strip()
            content = self._clean_json(content)
            result = json.loads(content)

            if result.get("is_food"):
                return {
                    "name": result.get("name", "unknown"),
                    "state": result.get("state", "unknown")
                }
            return None

        except Exception as e:
            print(f"LLM Error: {e}")
            return None

    def identify_all(self, image_bytes: bytes) -> List[dict]:
        """
        Identify ALL food items in full image.
        Used by System A (LLM-only).

        Returns:
            List of dicts with name, state for each item
        """
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": FROZEN_PROMPT_MULTI},
                        {"type": "image_url", "image_url": {
                            "url": f"data:image/png;base64,{image_b64}",
                            "detail": "high"
                        }}
                    ]
                }],
                max_tokens=500,
                temperature=0
            )

            content = response.choices[0].message.content.strip()
            content = self._clean_json(content)
            result = json.loads(content)

            return [
                {
                    "name": item.get("name", "unknown"),
                    "state": item.get("state", "unknown")
                }
                for item in result.get("items", [])
            ]

        except Exception as e:
            print(f"LLM Error: {e}")
            return []

    def _clean_json(self, content: str) -> str:
        """Remove markdown formatting if present."""
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return content.strip()
