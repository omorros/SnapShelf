"""
Barcode ingestion orchestration.

Combines barcode scanning, product lookup, and expiry prediction
to create DraftItems from barcode images.
"""
from typing import Optional
from dataclasses import dataclass

from app.services.ingestion.barcode_scanner import barcode_scanner
from app.services.ingestion.product_lookup import openfoodfacts_client, ProductInfo
from app.services.expiry_prediction import expiry_prediction_service


@dataclass
class BarcodeIngestionResult:
    """Result of barcode ingestion process"""
    success: bool
    barcode: Optional[str] = None
    product_info: Optional[ProductInfo] = None
    error_message: Optional[str] = None

    # Draft item data (if successful)
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    predicted_expiry: Optional[str] = None
    confidence_score: Optional[float] = None
    reasoning: Optional[str] = None


class BarcodeIngestionService:
    """
    Orchestrates the full barcode ingestion flow:
    1. Scan barcode from image
    2. Look up product in Open Food Facts
    3. Predict expiry date
    4. Return draft item data
    """

    def ingest_from_image(self, image_bytes: bytes, storage_location: str = "fridge") -> BarcodeIngestionResult:
        """
        Process barcode image and return draft item data.

        Args:
            image_bytes: Image file bytes containing barcode
            storage_location: Where user will store the item (for expiry prediction)

        Returns:
            BarcodeIngestionResult with product info and predictions
        """
        # Step 1: Scan barcode from image
        try:
            barcode = barcode_scanner.scan_image(image_bytes)
        except Exception as e:
            return BarcodeIngestionResult(
                success=False,
                error_message=f"Failed to scan image: {str(e)}"
            )

        if not barcode:
            return BarcodeIngestionResult(
                success=False,
                error_message="No barcode detected in image. Please ensure the barcode is clearly visible."
            )

        # Step 2: Look up product in Open Food Facts
        product_info = openfoodfacts_client.lookup_product(barcode)

        if not product_info:
            # Barcode scanned but not in database
            # Return partial success - user can manually enter details
            return BarcodeIngestionResult(
                success=True,
                barcode=barcode,
                product_info=None,
                name=f"Product {barcode}",
                error_message=f"Barcode {barcode} not found in database. Please enter product details manually."
            )

        # Step 3: Predict expiry date
        prediction = expiry_prediction_service.predict_expiry(
            name=product_info.name,
            category=product_info.category,
            storage_location=storage_location
        )

        # Step 4: Return complete draft item data
        return BarcodeIngestionResult(
            success=True,
            barcode=barcode,
            product_info=product_info,
            name=product_info.name,
            category=product_info.category,
            brand=product_info.brand,
            image_url=product_info.image_url,
            predicted_expiry=prediction.expiry_date.isoformat(),
            confidence_score=prediction.confidence,
            reasoning=prediction.reasoning
        )


# Singleton instance
barcode_ingestion_service = BarcodeIngestionService()
