from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date, timedelta
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.inventory_item import InventoryItem
from app.schemas.recipe import (
    RecipeGenerationRequest,
    RecipeGenerationResponse,
    IngredientInput
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
