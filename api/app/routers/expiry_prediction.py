from fastapi import APIRouter

from app.services.expiry_prediction import expiry_prediction_service
from app.schemas.expiry_prediction import (
    ExpiryPredictionRequest,
    ExpiryPredictionResponse
)

router = APIRouter(prefix="/expiry-prediction", tags=["expiry-prediction"])


@router.post("", response_model=ExpiryPredictionResponse)
def predict_expiry(request: ExpiryPredictionRequest):
    """
    Test endpoint for expiry prediction service.

    Useful for:
    - Testing the prediction logic directly
    - Academic comparison of strategies
    - Debugging prediction results

    Note: In production, predictions are typically auto-generated
    during draft item creation, not called directly.
    """
    prediction = expiry_prediction_service.predict_expiry(
        name=request.name,
        category=request.category,
        storage_location=request.storage_location,
        purchase_date=request.purchase_date
    )

    return ExpiryPredictionResponse(
        expiry_date=prediction.expiry_date,
        confidence=prediction.confidence,
        strategy_name=prediction.strategy_name,
        reasoning=prediction.reasoning
    )
