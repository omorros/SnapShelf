from pydantic import BaseModel, Field
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal


class InventoryItemBase(BaseModel):
    """Base schema for InventoryItem - all fields required (user-confirmed)"""
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1)
    storage_location: str = Field(..., min_length=1)
    expiry_date: date


class InventoryItemCreate(InventoryItemBase):
    """Schema for creating InventoryItem from confirmed DraftItem"""
    pass


class InventoryItemUpdateQuantity(BaseModel):
    """Schema for updating quantity only (immutable design)"""
    quantity: float = Field(..., gt=0)


class InventoryItemResponse(InventoryItemBase):
    """Schema for InventoryItem response"""
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
