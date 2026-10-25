from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class ExpiryPrediction:
    """
    Result of an expiry prediction.
    Includes the predicted date, confidence, and explanation for transparency.
    """
    expiry_date: date
    confidence: float  # 0.0 to 1.0
    strategy_name: str
    reasoning: str  # Human-readable explanation


class ExpiryPredictionStrategy(ABC):
    """
    Abstract base class for expiry prediction strategies.

    Each strategy must be:
    - Deterministic (same inputs → same outputs)
    - Transparent (provide reasoning)
    - Non-blocking (never raise exceptions, return low confidence if uncertain)
    """

    @abstractmethod
    def predict(
        self,
        name: str,
        category: Optional[str] = None,
        storage_location: Optional[str] = None,
        purchase_date: Optional[date] = None
    ) -> ExpiryPrediction:
        """
        Predict expiry date for a food item.

        Args:
            name: Food item name (e.g., "Milk", "Chicken breast")
            category: Food category (e.g., "dairy", "meat", "produce")
            storage_location: Where it's stored (e.g., "fridge", "freezer", "pantry")
            purchase_date: When it was purchased (defaults to today)

        Returns:
            ExpiryPrediction with date, confidence, and reasoning
        """
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Strategy identifier for logging/comparison"""
        pass
