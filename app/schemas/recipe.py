from pydantic import BaseModel, Field
from typing import List, Optional


class IngredientInput(BaseModel):
    """Ingredient provided by user for recipe generation"""
    name: str = Field(..., min_length=1)
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expiry_date: Optional[str] = None  # ISO format


class RecipeGenerationRequest(BaseModel):
    """Request payload for recipe generation"""
    ingredients: List[IngredientInput] = Field(..., min_length=1)
    max_recipes: int = Field(default=3, ge=1, le=5)


class RecipeIngredient(BaseModel):
    """Single ingredient in a recipe"""
    name: str
    quantity: str
    from_inventory: bool = False


class RecipeResponse(BaseModel):
    """Single recipe suggestion"""
    title: str
    description: str
    cooking_time_minutes: int
    servings: int
    difficulty: str  # "easy", "medium", "hard"
    ingredients: List[RecipeIngredient]
    instructions: List[str]
    tips: Optional[str] = None


class RecipeGenerationResponse(BaseModel):
    """Response containing multiple recipe suggestions"""
    recipes: List[RecipeResponse]
    ingredients_used: List[str]
    ingredients_missing: List[str]
