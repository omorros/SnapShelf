from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID


class DraftItemBase(BaseModel):
    """Base schema for DraftItem - fields that can be set by user/AI"""
    name: str = Field(..., min_length=1, max_length=255)
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expiration_date: Optional[date] = None
    category: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None  # "ai" | "manual" | "barcode" | "image" | "receipt"
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class DraftItemCreate(DraftItemBase):
    """Schema for creating a new DraftItem"""
    pass


class DraftItemUpdate(BaseModel):
    """Schema for updating a DraftItem - all fields optional"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expiration_date: Optional[date] = None
    category: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class DraftItemResponse(DraftItemBase):
    """Schema for DraftItem response"""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
