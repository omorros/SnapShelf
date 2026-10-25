"""
Unit tests for expiry prediction service.

Tests the core academic requirement: deterministic, transparent predictions.
"""
import pytest
from datetime import date, timedelta

from app.services.expiry_prediction.strategies.rule_based import RuleBasedStrategy
from app.services.expiry_prediction import ExpiryPredictionService


class TestRuleBasedStrategy:
    """Test rule-based prediction strategy"""

    def setup_method(self):
        self.strategy = RuleBasedStrategy()

    def test_dairy_in_fridge(self):
        """Test common case: dairy product in fridge"""
        prediction = self.strategy.predict(
            name="Milk",
            category="dairy",
            storage_location="fridge"
        )

        assert prediction.expiry_date == date.today() + timedelta(days=7)
        assert prediction.confidence == 0.85
        assert prediction.strategy_name == "rule_based"
        assert "dairy" in prediction.reasoning.lower()
        assert "fridge" in prediction.reasoning.lower()

    def test_meat_in_freezer(self):
        """Test long shelf life: meat in freezer"""
        prediction = self.strategy.predict(
            name="Chicken breast",
            category="meat",
            storage_location="freezer"
        )

        assert prediction.expiry_date == date.today() + timedelta(days=90)
        assert prediction.confidence == 0.90
        assert "freezer" in prediction.reasoning.lower()

    def test_bread_in_pantry(self):
        """Test bakery in pantry"""
        prediction = self.strategy.predict(
            name="Whole wheat bread",
            category="bread",
            storage_location="pantry"
        )

        assert prediction.expiry_date == date.today() + timedelta(days=5)
        assert prediction.confidence == 0.85

    def test_missing_category_fallback(self):
        """Test fallback when category is missing"""
        prediction = self.strategy.predict(
            name="Unknown item",
            category=None,
            storage_location="fridge"
        )

        # Should fall back to storage-only default
        assert prediction.expiry_date == date.today() + timedelta(days=7)
        assert prediction.confidence == 0.50  # Lower confidence
        assert "category unknown" in prediction.reasoning.lower()

    def test_missing_storage_fallback(self):
        """Test fallback when storage is missing"""
        prediction = self.strategy.predict(
            name="Milk",
            category="dairy",
            storage_location=None
        )

        # Should fall back to absolute default
        assert prediction.expiry_date == date.today() + timedelta(days=7)
        assert prediction.confidence == 0.30  # Very low confidence
        assert "no category or storage" in prediction.reasoning.lower()

    def test_determinism(self):
        """Test that same inputs produce same outputs (academic requirement)"""
        prediction1 = self.strategy.predict(
            name="Eggs",
            category="eggs",
            storage_location="fridge"
        )

        prediction2 = self.strategy.predict(
            name="Eggs",
            category="eggs",
            storage_location="fridge"
        )

        assert prediction1.expiry_date == prediction2.expiry_date
        assert prediction1.confidence == prediction2.confidence
        assert prediction1.reasoning == prediction2.reasoning

    def test_custom_purchase_date(self):
        """Test prediction with custom purchase date"""
        purchase = date(2024, 1, 1)
        prediction = self.strategy.predict(
            name="Milk",
            category="dairy",
            storage_location="fridge",
            purchase_date=purchase
        )

        expected_expiry = purchase + timedelta(days=7)
        assert prediction.expiry_date == expected_expiry

    def test_case_insensitive(self):
        """Test that category/storage matching is case-insensitive"""
        prediction1 = self.strategy.predict(
            name="Milk",
            category="DAIRY",
            storage_location="FRIDGE"
        )

        prediction2 = self.strategy.predict(
            name="Milk",
            category="dairy",
            storage_location="fridge"
        )

        assert prediction1.expiry_date == prediction2.expiry_date
        assert prediction1.confidence == prediction2.confidence


class TestExpiryPredictionService:
    """Test the service orchestrator"""

    def setup_method(self):
        self.service = ExpiryPredictionService()

    def test_predict_expiry(self):
        """Test main prediction method"""
        prediction = self.service.predict_expiry(
            name="Yogurt",
            category="dairy",
            storage_location="fridge"
        )

        assert isinstance(prediction.expiry_date, date)
        assert 0.0 <= prediction.confidence <= 1.0
        assert len(prediction.reasoning) > 0

    def test_predict_multiple_strategies(self):
        """Test running all strategies (future-proofing for ML models)"""
        predictions = self.service.predict_multiple_strategies(
            name="Milk",
            category="dairy",
            storage_location="fridge"
        )

        # Currently only one strategy, but should return list
        assert len(predictions) >= 1
        assert all(isinstance(p.expiry_date, date) for p in predictions)

    def test_get_best_prediction(self):
        """Test selecting highest confidence prediction"""
        best = self.service.get_best_prediction(
            name="Milk",
            category="dairy",
            storage_location="fridge"
        )

        # Should return highest confidence (currently only one strategy)
        assert isinstance(best.expiry_date, date)
        assert best.confidence > 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
