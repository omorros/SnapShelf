from datetime import date, timedelta
from typing import Optional

from app.services.expiry_prediction.strategies.base import (
    ExpiryPredictionStrategy,
    ExpiryPrediction
)


class RuleBasedStrategy(ExpiryPredictionStrategy):
    """
    Rule-based expiry prediction using lookup tables.

    Based on empirical shelf-life data by category and storage location.
    Deterministic and transparent - perfect for academic baseline.
    """

    # Shelf life in days: (category, storage_location) -> (days, confidence)
    SHELF_LIFE_RULES = {
        # Dairy products
        ("dairy", "fridge"): (7, 0.85),
        ("dairy", "freezer"): (60, 0.80),
        ("dairy", "pantry"): (1, 0.60),  # Most dairy needs refrigeration

        # Meat & Poultry
        ("meat", "fridge"): (3, 0.85),
        ("meat", "freezer"): (90, 0.90),
        ("meat", "pantry"): (1, 0.30),  # Unsafe

        ("poultry", "fridge"): (2, 0.85),
        ("poultry", "freezer"): (90, 0.90),
        ("poultry", "pantry"): (1, 0.30),

        # Fish & Seafood
        ("fish", "fridge"): (2, 0.80),
        ("fish", "freezer"): (60, 0.85),
        ("fish", "pantry"): (1, 0.20),

        # Produce
        ("produce", "fridge"): (7, 0.70),
        ("produce", "pantry"): (5, 0.65),
        ("produce", "freezer"): (180, 0.75),

        ("vegetables", "fridge"): (7, 0.75),
        ("vegetables", "pantry"): (5, 0.70),
        ("vegetables", "freezer"): (240, 0.80),

        ("fruits", "fridge"): (10, 0.70),
        ("fruits", "pantry"): (5, 0.65),
        ("fruits", "freezer"): (180, 0.75),

        # Bakery
        ("bakery", "pantry"): (5, 0.80),
        ("bakery", "fridge"): (7, 0.75),
        ("bakery", "freezer"): (90, 0.85),

        ("bread", "pantry"): (5, 0.85),
        ("bread", "fridge"): (10, 0.80),
        ("bread", "freezer"): (90, 0.90),

        # Eggs
        ("eggs", "fridge"): (21, 0.90),
        ("eggs", "pantry"): (7, 0.60),
        ("eggs", "freezer"): (180, 0.70),

        # Condiments & Sauces
        ("condiments", "fridge"): (90, 0.75),
        ("condiments", "pantry"): (180, 0.80),
        ("condiments", "freezer"): (365, 0.70),

        # Canned goods
        ("canned", "pantry"): (730, 0.90),  # 2 years
        ("canned", "fridge"): (730, 0.85),
        ("canned", "freezer"): (730, 0.70),

        # Frozen foods (already frozen when purchased)
        ("frozen", "freezer"): (180, 0.85),
        ("frozen", "fridge"): (3, 0.70),  # Thawing
        ("frozen", "pantry"): (1, 0.30),
    }

    # Default fallbacks by storage location only
    STORAGE_DEFAULTS = {
        "fridge": (7, 0.50),
        "freezer": (90, 0.55),
        "pantry": (30, 0.45),
    }

    # Absolute fallback
    DEFAULT_PREDICTION = (7, 0.30)  # 1 week, low confidence

    def predict(
        self,
        name: str,
        category: Optional[str] = None,
        storage_location: Optional[str] = None,
        purchase_date: Optional[date] = None
    ) -> ExpiryPrediction:
        """
        Predict expiry using rule-based lookup.
        Falls back gracefully if data is missing.
        """
        if purchase_date is None:
            purchase_date = date.today()

        # Normalize inputs
        category_normalized = category.lower().strip() if category else None
        storage_normalized = storage_location.lower().strip() if storage_location else None

        # Try exact match first
        days, confidence = self._lookup_shelf_life(category_normalized, storage_normalized)

        # Calculate expiry date
        expiry_date = purchase_date + timedelta(days=days)

        # Generate reasoning
        reasoning = self._generate_reasoning(
            name, category_normalized, storage_normalized, days, confidence
        )

        return ExpiryPrediction(
            expiry_date=expiry_date,
            confidence=confidence,
            strategy_name=self.name,
            reasoning=reasoning
        )

    def _lookup_shelf_life(
        self,
        category: Optional[str],
        storage: Optional[str]
    ) -> tuple[int, float]:
        """
        Lookup shelf life with graceful fallbacks:
        1. Try (category, storage) exact match
        2. Try storage-only default
        3. Use absolute default
        """
        # Try exact match
        if category and storage:
            key = (category, storage)
            if key in self.SHELF_LIFE_RULES:
                return self.SHELF_LIFE_RULES[key]

        # Fallback to storage location only
        if storage and storage in self.STORAGE_DEFAULTS:
            return self.STORAGE_DEFAULTS[storage]

        # Absolute fallback
        return self.DEFAULT_PREDICTION

    def _generate_reasoning(
        self,
        name: str,
        category: Optional[str],
        storage: Optional[str],
        days: int,
        confidence: float
    ) -> str:
        """Generate human-readable explanation"""
        if category and storage:
            return (
                f"Based on category '{category}' stored in '{storage}': "
                f"typical shelf life is {days} days"
            )
        elif storage:
            return (
                f"Based on storage in '{storage}' (category unknown): "
                f"estimated {days} days"
            )
        else:
            return (
                f"No category or storage provided: using conservative default of {days} days"
            )

    @property
    def name(self) -> str:
        return "rule_based"
