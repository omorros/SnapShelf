from sqlalchemy import Column, String, DateTime, Numeric, Date, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class DraftItem(Base):
    """
    Represents untrusted, AI- or user-generated food data.
    Must be explicitly promoted to InventoryItem by user confirmation.
    """
    __tablename__ = "draft_items"

    # Identity
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Core food data - name is required, rest may be uncertain
    name = Column(String, nullable=False)
    quantity = Column(Numeric(10, 2), nullable=True)  # Nullable: AI may not detect quantity
    unit = Column(String, nullable=True)  # e.g., "kg", "g", "ml", "pieces"

    # Optional metadata
    expiration_date = Column(Date, nullable=True)  # Nullable: may not be visible or detected
    category = Column(String, nullable=True)  # e.g., "dairy", "produce", "meat"
    location = Column(String, nullable=True)  # e.g., "fridge", "pantry", "freezer"
    notes = Column(Text, nullable=True)  # Additional user or AI notes

    # Provenance tracking
    source = Column(String, nullable=True)  # "ai" or "manual" - tracks origin
    confidence_score = Column(Float, nullable=True)  # AI confidence [0.0-1.0], null if manual

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
