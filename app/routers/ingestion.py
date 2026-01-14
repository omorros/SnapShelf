from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.draft_item import DraftItem
from app.schemas.draft_item import DraftItemResponse
from app.services.ingestion.barcode_ingestion import barcode_ingestion_service
from app.services.ingestion.image_ingestion import image_ingestion_service


router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.get("/barcode/{barcode}")
async def lookup_barcode(
    barcode: str,
    storage_location: str = "fridge",
    user_id: UUID = Depends(get_current_user)
):
    """
    Look up product info by barcode string.

    This is for real-time barcode scanning - the mobile app detects the barcode
    and sends just the string. Returns product info without creating a draft.

    Args:
        barcode: The barcode string (EAN-13, UPC-A, etc.)
        storage_location: Where the item will be stored (for expiry prediction)

    Returns:
        Product info with predicted expiry date
    """
    result = barcode_ingestion_service.ingest_from_barcode(
        barcode=barcode,
        storage_location=storage_location
    )

    if not result.success:
        raise HTTPException(
            status_code=400,
            detail=result.error_message or "Failed to process barcode"
        )

    return {
        "barcode": result.barcode,
        "name": result.name,
        "category": result.category,
        "brand": result.brand,
        "image_url": result.image_url,
        "predicted_expiry": result.predicted_expiry,
        "confidence_score": result.confidence_score,
        "reasoning": result.reasoning,
        "found_in_database": result.product_info is not None,
    }


@router.post("/barcode", response_model=DraftItemResponse, status_code=201)
async def ingest_barcode(
    image: UploadFile = File(..., description="Image file containing barcode"),
    storage_location: str = Form("fridge", description="Where the item will be stored"),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
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


@router.post("/image", response_model=List[DraftItemResponse], status_code=201)
async def ingest_image(
    image: UploadFile = File(..., description="Image of fridge or groceries"),
    storage_location: str = Form("fridge", description="Where items will be stored"),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    """
    Detect food items from image and create draft items.

    Uses GPT-4o Vision to analyze the image and identify food items.
    Creates a DraftItem for each detected item with predicted expiry dates.

    Workflow:
    1. Send image to GPT-4o Vision API
    2. Detect food items and their categories
    3. Predict expiry dates for each item
    4. Create DraftItems for user review/confirmation

    Returns a list of DraftItems (one per detected food item).
    User must confirm each draft to promote to inventory.
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

    # Process image
    result = image_ingestion_service.ingest_from_image(
        image_bytes=image_bytes,
        storage_location=storage_location
    )

    if not result.success:
        raise HTTPException(
            status_code=400,
            detail=result.error_message or "Failed to process image"
        )

    # Create a DraftItem for each detected food item
    created_drafts = []
    for item in result.detected_items:
        draft_data = {
            "name": item.name,
            "category": item.category,
            "location": storage_location,
            "source": "image",
            "confidence_score": item.confidence_score,
        }

        # Add expiry prediction if available
        if item.predicted_expiry:
            draft_data["expiration_date"] = item.predicted_expiry

        # Add reasoning as notes
        if item.reasoning:
            draft_data["notes"] = f"[Image detection - GPT-4o]\n[{item.reasoning}]"
        else:
            draft_data["notes"] = "[Image detection - GPT-4o]"

        # Save to database
        db_draft = DraftItem(
            user_id=user_id,
            **draft_data
        )
        db.add(db_draft)
        db.commit()
        db.refresh(db_draft)
        created_drafts.append(db_draft)

    return created_drafts
