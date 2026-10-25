from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class ExpiryPredictionRequest(BaseModel):
    """Request schema for expiry prediction"""
    name: str = Field(..., min_length=1, max_length=255, description="Food item name")
    category: Optional[str] = Field(None, description="Food category (e.g., dairy, meat, produce)")
    storage_location: Optional[str] = Field(None, description="Storage location (e.g., fridge, freezer, pantry)")
    purchase_date: Optional[date] = Field(None, description="Purchase date (defaults to today)")


class ExpiryPredictionResponse(BaseModel):
    """Response schema for expiry prediction"""
    expiry_date: date
    confidence: float = Field(..., ge=0.0, le=1.0)
    strategy_name: str
    reasoning: str

    class Config:
        from_attributes = True
