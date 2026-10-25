from sqlalchemy import Column, String, DateTime, Numeric, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class InventoryItem(Base):
    """
    Represents trusted, user-confirmed food data.
    Created ONLY via explicit confirmation of DraftItems.
    Used for alerts, analytics, and recipe recommendations.
    """
    __tablename__ = "inventory_items"

    # Identity
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Core food data - all required (user has confirmed these)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String, nullable=False)
    storage_location = Column(String, nullable=False)  # e.g., "fridge", "pantry", "freezer"
    expiry_date = Column(Date, nullable=False)  # User-confirmed or accepted prediction

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # Note: No updated_at - core fields are immutable after creation (except quantity)
