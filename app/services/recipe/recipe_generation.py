"""
Recipe generation service using OpenAI LLM.

Generates recipe suggestions based on available ingredients,
prioritizing items near expiration to reduce food waste.
"""
import json
from typing import List, Optional

from openai import OpenAI

from app.core.config import get_openai_api_key
from app.schemas.recipe import (
    IngredientInput,
    RecipeResponse,
    RecipeIngredient,
    RecipeGenerationResponse
)


RECIPE_GENERATION_PROMPT = """You are a helpful chef assistant for SnapShelf, a food waste reduction app.

Generate recipe suggestions based on the user's available ingredients.
PRIORITIZE ingredients that are expiring soon to help reduce food waste.

User's available ingredients:
{ingredients_json}

Generate {max_recipes} recipe suggestions.

For each recipe, provide:
- title: Creative but descriptive name
- description: 1-2 sentence appetizing description
- cooking_time_minutes: Realistic total time (number only)
- servings: Number of portions (number only)
- difficulty: "easy", "medium", or "hard"
- ingredients: List with name, quantity (include unit), and from_inventory (true if from user's list)
- instructions: Clear, numbered steps as a list
- tips: Optional cooking tips or variations (can be null)

Return a JSON object with this exact structure:
{{
  "recipes": [
    {{
      "title": "Recipe Name",
      "description": "Short description",
      "cooking_time_minutes": 30,
      "servings": 4,
      "difficulty": "easy",
      "ingredients": [
        {{"name": "ingredient", "quantity": "2 cups", "from_inventory": true}}
      ],
      "instructions": ["Step 1...", "Step 2..."],
      "tips": "Optional tip or null"
    }}
  ],
  "ingredients_used": ["list of input ingredient names used"],
  "ingredients_missing": ["common pantry items user might need"]
}}

Rules:
- Use as many of the user's ingredients as possible
- Prioritize ingredients marked as expiring soon (check expiry dates)
- Keep additional required ingredients minimal (common pantry staples only)
- Instructions should be clear for home cooks
- Be creative but practical
- All recipes should be realistic and delicious"""


class RecipeGenerationService:
    """
    Service for generating recipe suggestions using OpenAI.

    Follows the established pattern from gpt4o_vision.py.
    """

    def __init__(self):
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        """Lazy initialization of OpenAI client."""
        if self._client is None:
            self._client = OpenAI(api_key=get_openai_api_key())
        return self._client

    def generate_recipes(
        self,
        ingredients: List[IngredientInput],
        max_recipes: int = 3
    ) -> RecipeGenerationResponse:
        """
        Generate recipe suggestions based on available ingredients.

        Args:
            ingredients: List of available ingredients with optional expiry info
            max_recipes: Number of recipes to generate (1-5)

        Returns:
            RecipeGenerationResponse with recipe suggestions

        Raises:
            RuntimeError: If API call fails
        """
        # Format ingredients for prompt
        ingredients_data = []
        for ing in ingredients:
            item = {"name": ing.name}
            if ing.quantity and ing.unit:
                item["quantity"] = f"{ing.quantity} {ing.unit}"
            elif ing.quantity:
                item["quantity"] = str(ing.quantity)
            else:
                item["quantity"] = "available"

            if ing.expiry_date:
                item["expiry"] = ing.expiry_date

            ingredients_data.append(item)

        prompt = RECIPE_GENERATION_PROMPT.format(
            ingredients_json=json.dumps(ingredients_data, indent=2),
            max_recipes=max_recipes
        )

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=4000,
                temperature=0.7  # Some creativity for recipe suggestions
            )
        except Exception as e:
            raise RuntimeError(f"OpenAI API error: {str(e)}")

        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("Empty response from OpenAI")

        try:
            result = json.loads(content)
            return self._parse_response(result)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse response: {str(e)}")

    def _parse_response(self, data: dict) -> RecipeGenerationResponse:
        """Parse raw LLM response into typed response object."""
        recipes = []
        for recipe_data in data.get("recipes", []):
            ingredients = []
            for ing in recipe_data.get("ingredients", []):
                ingredients.append(RecipeIngredient(
                    name=ing.get("name", ""),
                    quantity=ing.get("quantity", ""),
                    from_inventory=ing.get("from_inventory", False)
                ))

            recipes.append(RecipeResponse(
                title=recipe_data.get("title", "Untitled Recipe"),
                description=recipe_data.get("description", ""),
                cooking_time_minutes=recipe_data.get("cooking_time_minutes", 30),
                servings=recipe_data.get("servings", 4),
                difficulty=recipe_data.get("difficulty", "medium"),
                ingredients=ingredients,
                instructions=recipe_data.get("instructions", []),
                tips=recipe_data.get("tips")
            ))

        return RecipeGenerationResponse(
            recipes=recipes,
            ingredients_used=data.get("ingredients_used", []),
            ingredients_missing=data.get("ingredients_missing", [])
        )


# Singleton instance
recipe_generation_service = RecipeGenerationService()
