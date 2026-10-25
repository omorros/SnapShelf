from pydantic import BaseModel, Field
from typing import List, Optional, Literal


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
    mode: Literal["auto", "manual"] = "auto"
    selected_ingredient_names: Optional[List[str]] = None  # For manual mode
    time_preference: Literal["quick", "normal", "any"] = "any"
    servings: int = Field(default=2, ge=1, le=6)


class RecipeIngredient(BaseModel):
    """Single ingredient in a recipe"""
    name: str
    quantity: str
    from_inventory: bool = False
    is_expiring_soon: bool = False  # True if within 3 days of expiry
    days_until_expiry: Optional[int] = None  # For highlighting urgency


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
    recommendation_reason: str = ""  # e.g., "Uses 3 items expiring in the next 2 days"


class RecipeGenerationResponse(BaseModel):
    """Response containing multiple recipe suggestions"""
    recipes: List[RecipeResponse]
    ingredients_used: List[str]
    ingredients_missing: List[str]


class SaveRecipeRequest(BaseModel):
    """Request to save a recipe to favorites"""
    title: str
    description: str
    cooking_time_minutes: int
    servings: int
    difficulty: str
    ingredients: List[RecipeIngredient]
    instructions: List[str]
    tips: Optional[str] = None
    recommendation_reason: str = ""


class SavedRecipeResponse(BaseModel):
    """A saved/favorited recipe"""
    id: str
    title: str
    description: str
    cooking_time_minutes: int
    servings: int
    difficulty: str
    ingredients: List[RecipeIngredient]
    instructions: List[str]
    tips: Optional[str] = None
    recommendation_reason: str = ""
    saved_at: str  # ISO format

    class Config:
        from_attributes = True
