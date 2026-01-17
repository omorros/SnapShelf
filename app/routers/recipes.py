from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date, timedelta
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.inventory_item import InventoryItem
from app.models.saved_recipe import SavedRecipe
from app.schemas.recipe import (
    RecipeGenerationRequest,
    RecipeGenerationResponse,
    IngredientInput,
    SaveRecipeRequest,
    SavedRecipeResponse,
    RecipeIngredient
)
from app.services.recipe import recipe_generation_service


router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/generate", response_model=RecipeGenerationResponse)
async def generate_recipes(
    request: RecipeGenerationRequest,
    user_id: UUID = Depends(get_current_user)
):
    """
    Generate recipe suggestions based on provided ingredients.

    Supports two modes:
    - "auto" (default): Automatically prioritize expiring ingredients
    - "manual": User-selected ingredients are mandatory, still applies expiry logic

    Optional preferences:
    - time_preference: "quick" (<30min), "normal" (30-60min), "any" (default)
    - servings: Target portions (1-6, default 2)
    """
    if not request.ingredients:
        raise HTTPException(
            status_code=400,
            detail="At least one ingredient is required"
        )

    try:
        result = recipe_generation_service.generate_recipes(
            ingredients=request.ingredients,
            max_recipes=request.max_recipes,
            mode=request.mode,
            selected_ingredient_names=request.selected_ingredient_names,
            time_preference=request.time_preference,
            servings=request.servings
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expiring-ingredients", response_model=List[IngredientInput])
async def get_expiring_ingredients(
    days: int = 3,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """
    Get inventory items expiring within the specified number of days.

    Useful for the "Use Expiring" mode in the mobile app.
    Returns ingredients formatted for recipe generation.
    """
    cutoff_date = date.today() + timedelta(days=days)

    items = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.expiry_date <= cutoff_date,
        InventoryItem.expiry_date >= date.today()  # Not already expired
    ).order_by(InventoryItem.expiry_date).all()

    return [
        IngredientInput(
            name=item.name,
            quantity=float(item.quantity),
            unit=item.unit,
            expiry_date=item.expiry_date.isoformat()
        )
        for item in items
    ]


@router.post("/saved", response_model=SavedRecipeResponse)
async def save_recipe(
    request: SaveRecipeRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """
    Save a recipe to favorites.

    Users can save recipes they like for quick access later.
    """
    # Check if recipe with same title already saved
    existing = db.query(SavedRecipe).filter(
        SavedRecipe.user_id == user_id,
        SavedRecipe.title == request.title
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Recipe already saved"
        )

    saved = SavedRecipe(
        user_id=user_id,
        title=request.title,
        description=request.description,
        cooking_time_minutes=request.cooking_time_minutes,
        servings=request.servings,
        difficulty=request.difficulty,
        ingredients=[ing.model_dump() for ing in request.ingredients],
        instructions=request.instructions,
        tips=request.tips,
        recommendation_reason=request.recommendation_reason
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)

    return SavedRecipeResponse(
        id=str(saved.id),
        title=saved.title,
        description=saved.description,
        cooking_time_minutes=saved.cooking_time_minutes,
        servings=saved.servings,
        difficulty=saved.difficulty,
        ingredients=[RecipeIngredient(**ing) for ing in saved.ingredients],
        instructions=saved.instructions,
        tips=saved.tips,
        recommendation_reason=saved.recommendation_reason or "",
        saved_at=saved.saved_at.isoformat()
    )


@router.get("/saved", response_model=List[SavedRecipeResponse])
async def get_saved_recipes(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """
    Get all saved/favorited recipes.

    Returns recipes ordered by most recently saved.
    """
    saved = db.query(SavedRecipe).filter(
        SavedRecipe.user_id == user_id
    ).order_by(SavedRecipe.saved_at.desc()).all()

    return [
        SavedRecipeResponse(
            id=str(s.id),
            title=s.title,
            description=s.description,
            cooking_time_minutes=s.cooking_time_minutes,
            servings=s.servings,
            difficulty=s.difficulty,
            ingredients=[RecipeIngredient(**ing) for ing in s.ingredients],
            instructions=s.instructions,
            tips=s.tips,
            recommendation_reason=s.recommendation_reason or "",
            saved_at=s.saved_at.isoformat()
        )
        for s in saved
    ]


@router.delete("/saved/{recipe_id}")
async def unsave_recipe(
    recipe_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """
    Remove a recipe from favorites (unsave).
    """
    saved = db.query(SavedRecipe).filter(
        SavedRecipe.id == recipe_id,
        SavedRecipe.user_id == user_id
    ).first()

    if not saved:
        raise HTTPException(status_code=404, detail="Saved recipe not found")

    db.delete(saved)
    db.commit()
    return {"message": "Recipe removed from favorites"}
