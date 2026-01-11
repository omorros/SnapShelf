"""
LLM client module for OpenAI Vision API calls.
Handles image encoding, API requests, and JSON parsing.
"""

import base64
import json
from typing import List, Optional
from openai import OpenAI
from config import OPENAI_API_KEY


class LLMClient:
    """
    OpenAI Vision API client for food identification.

    Attributes:
        client: OpenAI API client
        model: Model identifier (gpt-4o-mini)
    """

    def __init__(self):
        """Initialize LLM client with OpenAI credentials from environment."""
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.model = "gpt-4o-mini"

    def identify_single(self, image_bytes: bytes) -> Optional[dict]:
        """
        Identify a single food item from a cropped image.

        Used by YOLO-LLM pipeline for per-crop analysis.

        Args:
            image_bytes: Binary image data (PNG format)

        Returns:
            Dict with name, quantity, packaged if food detected, None otherwise
        """
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        prompt = """Analyze this image. If it contains a food item, respond with ONLY this JSON:
{
  "is_food": true,
  "name": "Specific name (e.g., 'Granny Smith Apple')",
  "quantity": <number or null if unclear>,
  "packaged": <true if in package/container, false if loose, null if unclear>
}

If NOT a food item, respond: {"is_food": false}

Return ONLY valid JSON."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {
                            "url": f"data:image/png;base64,{image_b64}",
                            "detail": "low"
                        }}
                    ]
                }],
                max_tokens=300,
                temperature=0.1
            )

            content = response.choices[0].message.content.strip()
            content = self._clean_json(content)
            result = json.loads(content)

            if result.get("is_food"):
                return {
                    "name": result.get("name", "Unknown"),
                    "quantity": result.get("quantity"),
                    "packaged": result.get("packaged")
                }
            return None

        except Exception as e:
            print(f"LLM Error: {e}")
            return None

    def identify_all(self, image_bytes: bytes) -> List[dict]:
        """
        Identify ALL food items visible in a full image.

        Used by LLM-only pipeline.

        Args:
            image_bytes: Binary image data (PNG/JPEG format)

        Returns:
            List of dicts with name, quantity, packaged for each item
        """
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        prompt = """Analyze this image and identify ALL food items visible.
For EACH food item, provide details in a JSON array.

Respond with ONLY this JSON format:
{
  "foods": [
    {
      "name": "Specific name (e.g., 'Blueberries', 'Gnocchi')",
      "quantity": <number or null if unclear>,
      "packaged": <true if in package/container, false if loose, null if unclear>
    }
  ]
}

Important:
- Include ALL distinct food items you can see
- Packaged foods count (gnocchi, yogurt, etc.)
- If no food items visible, return {"foods": []}

Return ONLY valid JSON."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {
                            "url": f"data:image/png;base64,{image_b64}",
                            "detail": "high"
                        }}
                    ]
                }],
                max_tokens=1000,
                temperature=0.1
            )

            content = response.choices[0].message.content.strip()
            content = self._clean_json(content)
            result = json.loads(content)

            foods = result.get("foods", [])
            return [
                {
                    "name": f.get("name", "Unknown"),
                    "quantity": f.get("quantity"),
                    "packaged": f.get("packaged")
                }
                for f in foods
            ]

        except Exception as e:
            print(f"LLM Error: {e}")
            return []

    def _clean_json(self, content: str) -> str:
        """Remove markdown formatting from JSON response."""
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return content.strip()
