from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.models.draft_item import DraftItem
from app.schemas.draft_item import DraftItemResponse
from app.services.ingestion.barcode_ingestion import barcode_ingestion_service


router = APIRouter(prefix="/ingest", tags=["ingestion"])


def get_current_user_id(x_user_id: str = Header(...)) -> UUID:
    """Stub authentication - extracts user_id from header"""
    try:
        return UUID(x_user_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid user ID")


@router.post("/barcode", response_model=DraftItemResponse, status_code=201)
async def ingest_barcode(
    image: UploadFile = File(..., description="Image file containing barcode"),
    storage_location: str = Form("fridge", description="Where the item will be stored"),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Scan barcode from image and create draft item.

    Workflow:
    1. Detect barcode from uploaded image (pyzxing)
    2. Look up product in Open Food Facts database
    3. Predict expiry date based on category and storage
    4. Create DraftItem for user review/confirmation

    This is the fastest way for users to add products - just snap a photo!
    """
    # Validate file type
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an image (JPEG, PNG, etc.)"
        )

    # Read image bytes
    try:
        image_bytes = await image.read()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read image file: {str(e)}"
        )

    # Process barcode
    result = barcode_ingestion_service.ingest_from_image(
        image_bytes=image_bytes,
        storage_location=storage_location
    )

    if not result.success:
        raise HTTPException(
            status_code=400,
            detail=result.error_message or "Failed to process barcode"
        )

    # Create draft item
    draft_data = {
        "name": result.name,
        "category": result.category,
        "location": storage_location,
        "source": "barcode",
        "confidence_score": result.confidence_score,
    }

    # Add optional fields if available
    if result.predicted_expiry:
        draft_data["expiration_date"] = result.predicted_expiry

    if result.reasoning:
        draft_data["notes"] = f"[Barcode: {result.barcode}]\n[{result.reasoning}]"
        if result.brand:
            draft_data["notes"] += f"\nBrand: {result.brand}"
        if result.product_info and result.product_info.quantity:
            draft_data["notes"] += f"\nQuantity: {result.product_info.quantity}"
    else:
        draft_data["notes"] = f"[Barcode: {result.barcode}]"

    # Save to database
    db_draft = DraftItem(
        user_id=user_id,
        **draft_data
    )
    db.add(db_draft)
    db.commit()
    db.refresh(db_draft)

    return db_draft
