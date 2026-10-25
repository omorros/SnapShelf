from datetime import date
from typing import Optional

from app.services.expiry_prediction.strategies.base import ExpiryPrediction
from app.services.expiry_prediction.strategies.rule_based import RuleBasedStrategy


class ExpiryPredictionService:
    """
    Main service for predicting food expiry dates.

    Orchestrates multiple prediction strategies and selects the best result.
    Currently uses rule-based strategy; can be extended with ML models later.
    """

    def __init__(self):
        # Initialize available strategies
        self.strategies = [
            RuleBasedStrategy(),
            # Future: MLRegressionStrategy(),
            # Future: HybridStrategy(),
        ]
        self.default_strategy = self.strategies[0]

    def predict_expiry(
        self,
        name: str,
        category: Optional[str] = None,
        storage_location: Optional[str] = None,
        purchase_date: Optional[date] = None
    ) -> ExpiryPrediction:
        """
        Predict expiry date for a food item.

        Args:
            name: Food item name
            category: Food category (e.g., "dairy", "meat")
            storage_location: Storage location (e.g., "fridge", "freezer")
            purchase_date: Purchase date (defaults to today)

        Returns:
            ExpiryPrediction with date, confidence, and reasoning

        Note:
            This method is non-blocking and will always return a prediction,
            even if inputs are incomplete (with lower confidence).
        """
        # For now, use the rule-based strategy
        # Later: could run multiple strategies and select highest confidence
        prediction = self.default_strategy.predict(
            name=name,
            category=category,
            storage_location=storage_location,
            purchase_date=purchase_date
        )

        return prediction

    def predict_multiple_strategies(
        self,
        name: str,
        category: Optional[str] = None,
        storage_location: Optional[str] = None,
        purchase_date: Optional[date] = None
    ) -> list[ExpiryPrediction]:
        """
        Run all available strategies and return all predictions.
        Useful for comparison and academic analysis.

        Returns:
            List of predictions from each strategy
        """
        predictions = []
        for strategy in self.strategies:
            prediction = strategy.predict(
                name=name,
                category=category,
                storage_location=storage_location,
                purchase_date=purchase_date
            )
            predictions.append(prediction)

        return predictions

    def get_best_prediction(
        self,
        name: str,
        category: Optional[str] = None,
        storage_location: Optional[str] = None,
        purchase_date: Optional[date] = None
    ) -> ExpiryPrediction:
        """
        Run all strategies and return the one with highest confidence.
        Useful when multiple strategies are available.
        """
        predictions = self.predict_multiple_strategies(
            name=name,
            category=category,
            storage_location=storage_location,
            purchase_date=purchase_date
        )

        # Return prediction with highest confidence
        return max(predictions, key=lambda p: p.confidence)


# Singleton instance for dependency injection
expiry_prediction_service = ExpiryPredictionService()
