from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.models.inventory_item import InventoryItem
from app.schemas.inventory_item import (
    InventoryItemResponse,
    InventoryItemUpdateQuantity
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


def get_current_user_id(x_user_id: str = Header(...)) -> UUID:
    """Stub authentication - extracts user_id from header"""
    try:
        return UUID(x_user_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid user ID")


@router.get("", response_model=List[InventoryItemResponse])
def list_inventory_items(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """List all confirmed inventory items for the current user"""
    items = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id
    ).order_by(InventoryItem.expiry_date).all()
    return items


@router.get("/{item_id}", response_model=InventoryItemResponse)
def get_inventory_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get a specific inventory item"""
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == user_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    return item


@router.patch("/{item_id}/quantity", response_model=InventoryItemResponse)
def update_inventory_quantity(
    item_id: UUID,
    update: InventoryItemUpdateQuantity,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Update quantity of an inventory item.
    Note: Other fields are immutable (PRD requirement)
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == user_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    item.quantity = update.quantity
    db.commit()
    db.refresh(item)

    return item


@router.delete("/{item_id}", status_code=204)
def delete_inventory_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Delete an inventory item (e.g., when consumed or thrown away)
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == user_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    db.delete(item)
    db.commit()

    return None
