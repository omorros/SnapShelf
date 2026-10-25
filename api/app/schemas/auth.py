"""
Authentication schemas for user registration and login.
"""
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime


class UserRegister(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for decoded token data."""
    user_id: UUID


class UserResponse(BaseModel):
    """Schema for user response (without password)."""
    id: UUID
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
