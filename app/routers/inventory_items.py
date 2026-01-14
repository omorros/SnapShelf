from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.inventory_item import InventoryItem
from app.schemas.inventory_item import (
    InventoryItemResponse,
    InventoryItemUpdateQuantity,
    InventoryItemUpdate
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=List[InventoryItemResponse])
def list_inventory_items(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
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
    user_id: UUID = Depends(get_current_user)
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
    user_id: UUID = Depends(get_current_user)
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


@router.put("/{item_id}", response_model=InventoryItemResponse)
def update_inventory_item(
    item_id: UUID,
    update: InventoryItemUpdate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """
    Update an inventory item's fields.
    Only provided fields will be updated.
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == user_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # Update only provided fields
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/{item_id}", status_code=204)
def delete_inventory_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
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
