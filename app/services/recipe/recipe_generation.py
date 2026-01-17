"""
Recipe generation service using OpenAI LLM.

Generates recipe suggestions based on available ingredients,
prioritizing items near expiration to reduce food waste.

Core value: "What should I cook right now so food doesn't go to waste?"
"""
import json
from datetime import date, datetime
from typing import List, Optional, Literal

from openai import OpenAI

from app.core.config import get_openai_api_key
from app.schemas.recipe import (
    IngredientInput,
    RecipeResponse,
    RecipeIngredient,
    RecipeGenerationResponse
)


RECIPE_GENERATION_PROMPT = """You are the recipe recommendation engine for SnapShelf, a fridge-tracking app focused on reducing food waste.

Your primary goal is NOT creativity or variety.
Your primary goal is to recommend practical recipes that USE FOOD BEFORE IT EXPIRES.

MODE: {mode}
{mode_instructions}

TIME PREFERENCE: {time_preference}
TARGET SERVINGS: {servings}

USER'S INVENTORY:
{ingredients_json}

Generate EXACTLY {max_recipes} recipes. You MUST return exactly {max_recipes} recipes, no more, no less.

RANKING PRIORITY:
1. Waste reduction impact (recipes using most expiring items rank higher)
2. Convenience (fewer additional ingredients needed)

RULES (NON-NEGOTIABLE):
- Assume basic pantry staples are available (salt, pepper, oil, butter, garlic, onion, common spices)
- Do NOT ask follow-up questions
- Prioritize ingredients closest to expiration
- Prefer recipes that use MULTIPLE expiring items together
- Keep additional required ingredients minimal
- If time_preference is "quick", recipes should be under 30 minutes
- If time_preference is "normal", recipes should be 30-60 minutes
- All recipes must serve approximately {servings} portions

OUTPUT FORMAT - Return a JSON object with this exact structure:
{{
  "recipes": [
    {{
      "title": "Recipe Name",
      "description": "1-2 sentence appetizing description",
      "cooking_time_minutes": 30,
      "servings": {servings},
      "difficulty": "easy|medium|hard",
      "recommendation_reason": "Uses 3 items expiring in the next 2 days",
      "ingredients": [
        {{
          "name": "ingredient name",
          "quantity": "2 cups",
          "from_inventory": true,
          "is_expiring_soon": true,
          "days_until_expiry": 2
        }}
      ],
      "instructions": ["Step 1...", "Step 2..."],
      "tips": "Optional tip or null"
    }}
  ],
  "ingredients_used": ["list of inventory ingredient names used"],
  "ingredients_missing": ["pantry staples needed that weren't in inventory"]
}}

For each ingredient:
- from_inventory: true if from user's inventory
- is_expiring_soon: true if expiring within 3 days
- days_until_expiry: number of days until expiry (only for inventory items)

The recommendation_reason MUST explain WHY this recipe was recommended, focusing on waste reduction.
Examples: "Uses chicken expiring tomorrow and spinach expiring in 2 days", "Clears 4 items expiring this week"
"""

MODE_AUTO_INSTRUCTIONS = """AUTO MODE - "What should I cook?"
- Automatically prioritize ingredients closest to expiration
- Prefer recipes that use multiple expiring items together
- Reduce total waste risk by maximizing use of soon-to-expire items"""

MODE_MANUAL_INSTRUCTIONS = """MANUAL MODE - "User selected specific ingredients"
- ONLY use these ingredients from the user's inventory: {selected_names}
- DO NOT use any other ingredients from the inventory - the user specifically chose these items
- You may assume basic pantry staples (salt, pepper, oil, butter, garlic, onion, common spices)
- All recipes MUST be based around the selected ingredients only
- This is a strict requirement - if user selected chicken, do NOT add beef or other meats"""


class RecipeGenerationService:
    """
    Service for generating recipe suggestions using OpenAI.

    Core value: Recommend practical recipes that use food before it expires.
    """

    def __init__(self):
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        """Lazy initialization of OpenAI client."""
        if self._client is None:
            self._client = OpenAI(api_key=get_openai_api_key())
        return self._client

    def _calculate_days_until_expiry(self, expiry_date_str: Optional[str]) -> Optional[int]:
        """Calculate days until expiry from ISO date string."""
        if not expiry_date_str:
            return None
        try:
            expiry = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
            today = date.today()
            return (expiry - today).days
        except (ValueError, TypeError):
            return None

    def generate_recipes(
        self,
        ingredients: List[IngredientInput],
        max_recipes: int = 3,
        mode: Literal["auto", "manual"] = "auto",
        selected_ingredient_names: Optional[List[str]] = None,
        time_preference: Literal["quick", "normal", "any"] = "any",
        servings: int = 2
    ) -> RecipeGenerationResponse:
        """
        Generate recipe suggestions based on available ingredients.

        Args:
            ingredients: List of available ingredients with optional expiry info
            max_recipes: Number of recipes to generate (1-5)
            mode: "auto" for automatic prioritization, "manual" for user-selected
            selected_ingredient_names: Required ingredients for manual mode
            time_preference: "quick" (<30min), "normal" (30-60min), "any"
            servings: Target number of servings (1-6)

        Returns:
            RecipeGenerationResponse with recipe suggestions

        Raises:
            RuntimeError: If API call fails
        """
        # Calculate days until expiry and sort by urgency
        ingredients_data = []
        for ing in ingredients:
            days_until = self._calculate_days_until_expiry(ing.expiry_date)

            item = {
                "name": ing.name,
                "days_until_expiry": days_until,
                "is_expiring_soon": days_until is not None and days_until <= 3
            }

            if ing.quantity and ing.unit:
                item["quantity"] = f"{ing.quantity} {ing.unit}"
            elif ing.quantity:
                item["quantity"] = str(ing.quantity)
            else:
                item["quantity"] = "available"

            if ing.expiry_date:
                item["expiry_date"] = ing.expiry_date

            ingredients_data.append(item)

        # Sort by urgency (most urgent first, then items without expiry)
        ingredients_data.sort(
            key=lambda x: (
                x["days_until_expiry"] is None,  # Items with expiry first
                x["days_until_expiry"] if x["days_until_expiry"] is not None else 999
            )
        )

        # Build mode instructions
        if mode == "manual" and selected_ingredient_names:
            mode_instructions = MODE_MANUAL_INSTRUCTIONS.format(
                selected_names=", ".join(selected_ingredient_names)
            )
        else:
            mode_instructions = MODE_AUTO_INSTRUCTIONS

        prompt = RECIPE_GENERATION_PROMPT.format(
            mode=mode.upper(),
            mode_instructions=mode_instructions,
            time_preference=time_preference,
            servings=servings,
            ingredients_json=json.dumps(ingredients_data, indent=2),
            max_recipes=max_recipes
        )

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=2500,
                temperature=0.7
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
                    from_inventory=ing.get("from_inventory", False),
                    is_expiring_soon=ing.get("is_expiring_soon", False),
                    days_until_expiry=ing.get("days_until_expiry")
                ))

            recipes.append(RecipeResponse(
                title=recipe_data.get("title", "Untitled Recipe"),
                description=recipe_data.get("description", ""),
                cooking_time_minutes=recipe_data.get("cooking_time_minutes", 30),
                servings=recipe_data.get("servings", 2),
                difficulty=recipe_data.get("difficulty", "medium"),
                ingredients=ingredients,
                instructions=recipe_data.get("instructions", []),
                tips=recipe_data.get("tips"),
                recommendation_reason=recipe_data.get("recommendation_reason", "")
            ))

        return RecipeGenerationResponse(
            recipes=recipes,
            ingredients_used=data.get("ingredients_used", []),
            ingredients_missing=data.get("ingredients_missing", [])
        )


# Singleton instance
recipe_generation_service = RecipeGenerationService()
