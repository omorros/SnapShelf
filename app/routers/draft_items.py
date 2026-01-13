from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.draft_item import DraftItem
from app.models.inventory_item import InventoryItem
from app.schemas.draft_item import DraftItemCreate, DraftItemUpdate, DraftItemResponse
from app.schemas.inventory_item import InventoryItemCreate, InventoryItemResponse
from app.services.expiry_prediction import expiry_prediction_service

router = APIRouter(prefix="/draft-items", tags=["draft-items"])


@router.post("", response_model=DraftItemResponse, status_code=201)
def create_draft_item(
    draft: DraftItemCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
    predict_expiry: bool = True
):
    """
    Create a new draft item (manual or AI-generated).

    If expiration_date is not provided and predict_expiry=True,
    automatically predicts expiry date using the prediction service.
    """
    draft_data = draft.model_dump()

    # Auto-predict expiry if not provided
    if predict_expiry and draft_data.get("expiration_date") is None:
        prediction = expiry_prediction_service.predict_expiry(
            name=draft_data["name"],
            category=draft_data.get("category"),
            storage_location=draft_data.get("location")
        )

        # Enrich draft with prediction
        draft_data["expiration_date"] = prediction.expiry_date

        # Update confidence if not set or lower than prediction
        if draft_data.get("confidence_score") is None:
            draft_data["confidence_score"] = prediction.confidence

        # Add prediction source to notes if not already present
        if draft_data.get("notes"):
            draft_data["notes"] += f"\n[Auto-predicted: {prediction.reasoning}]"
        else:
            draft_data["notes"] = f"[Auto-predicted: {prediction.reasoning}]"

    db_draft = DraftItem(
        user_id=user_id,
        **draft_data
    )
    db.add(db_draft)
    db.commit()
    db.refresh(db_draft)
    return db_draft


@router.get("", response_model=List[DraftItemResponse])
def list_draft_items(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """List all draft items for the current user"""
    drafts = db.query(DraftItem).filter(DraftItem.user_id == user_id).all()
    return drafts


@router.get("/{draft_id}", response_model=DraftItemResponse)
def get_draft_item(
    draft_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """Get a specific draft item"""
    draft = db.query(DraftItem).filter(
        DraftItem.id == draft_id,
        DraftItem.user_id == user_id
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft item not found")

    return draft


@router.patch("/{draft_id}", response_model=DraftItemResponse)
def update_draft_item(
    draft_id: UUID,
    updates: DraftItemUpdate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """Update a draft item before confirmation"""
    draft = db.query(DraftItem).filter(
        DraftItem.id == draft_id,
        DraftItem.user_id == user_id
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft item not found")

    # Update only provided fields
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(draft, field, value)

    db.commit()
    db.refresh(draft)
    return draft


@router.delete("/{draft_id}", status_code=204)
def delete_draft_item(
    draft_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """Discard a draft item"""
    draft = db.query(DraftItem).filter(
        DraftItem.id == draft_id,
        DraftItem.user_id == user_id
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft item not found")

    db.delete(draft)
    db.commit()
    return None


@router.post("/{draft_id}/confirm", response_model=InventoryItemResponse, status_code=201)
def confirm_draft_item(
    draft_id: UUID,
    confirmation: InventoryItemCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """
    SACRED OPERATION: Confirm a draft item and promote it to inventory.
    This is the core invariant of SnapShelf.
    """
    # Verify draft exists and belongs to user
    draft = db.query(DraftItem).filter(
        DraftItem.id == draft_id,
        DraftItem.user_id == user_id
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft item not found")

    # Create trusted inventory item
    inventory_item = InventoryItem(
        user_id=user_id,
        **confirmation.model_dump()
    )

    db.add(inventory_item)

    # Delete the draft (it's been confirmed)
    db.delete(draft)

    db.commit()
    db.refresh(inventory_item)

    return inventory_item
