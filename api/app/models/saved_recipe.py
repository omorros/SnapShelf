from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class SavedRecipe(Base):
    """
    Stores user's saved/favorited recipes.

    Users can save recipes they like for quick access later.
    """
    __tablename__ = "saved_recipes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Recipe data stored as JSON
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    cooking_time_minutes = Column(Integer, nullable=False)
    servings = Column(Integer, nullable=False)
    difficulty = Column(String, nullable=False)
    ingredients = Column(JSONB, nullable=False)  # List of RecipeIngredient
    instructions = Column(JSONB, nullable=False)  # List of strings
    tips = Column(String, nullable=True)
    recommendation_reason = Column(String, nullable=True)

    saved_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
