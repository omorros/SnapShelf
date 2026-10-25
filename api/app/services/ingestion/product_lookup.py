"""
Product lookup via Open Food Facts API.

Open Food Facts is a free, open, crowdsourced database of food products
from around the world. Perfect for looking up product info by barcode.
"""
from typing import Optional
from dataclasses import dataclass
import requests
from datetime import date, timedelta


@dataclass
class ProductInfo:
    """Product information retrieved from Open Food Facts"""
    barcode: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    quantity: Optional[str] = None  # e.g., "1L", "500g"
    packaging: Optional[str] = None  # e.g., "plastic", "glass"


class OpenFoodFactsClient:
    """
    Client for Open Food Facts API.

    API Docs: https://world.openfoodfacts.org/data
    No API key required - free and open.
    """

    BASE_URL = "https://world.openfoodfacts.org/api/v2/product"

    def __init__(self, user_agent: str = "SnapShelf/0.1"):
        """
        Initialize client.

        Args:
            user_agent: Custom user agent (polite API usage)
        """
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": user_agent
        })

    def lookup_product(self, barcode: str) -> Optional[ProductInfo]:
        """
        Look up product by barcode.

        Args:
            barcode: Product barcode (EAN-13, UPC-A, etc.)

        Returns:
            ProductInfo if found, None if not in database

        Raises:
            requests.RequestException: If API request fails
        """
        url = f"{self.BASE_URL}/{barcode}.json"

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()

            # Check if product was found
            if data.get("status") != 1:
                return None

            product = data.get("product", {})

            # Extract relevant fields
            return ProductInfo(
                barcode=barcode,
                name=self._get_product_name(product),
                brand=product.get("brands"),
                category=self._get_category(product),
                image_url=product.get("image_url"),
                quantity=product.get("quantity"),
                packaging=product.get("packaging")
            )

        except requests.RequestException as e:
            # Log error but don't crash - barcode lookup is not critical
            print(f"Open Food Facts API error: {e}")
            return None

    def _get_product_name(self, product: dict) -> str:
        """
        Extract best product name from API response.
        Tries multiple fields in order of preference.
        """
        # Try different name fields in order
        for field in ["product_name", "generic_name", "abbreviated_product_name"]:
            name = product.get(field)
            if name and name.strip():
                return name.strip()

        # Fallback to "Unknown Product"
        return "Unknown Product"

    def _get_category(self, product: dict) -> Optional[str]:
        """
        Extract and normalize category from API response.

        Open Food Facts has detailed category hierarchies.
        We extract the most specific category and normalize it.
        """
        # Try categories_tags (most specific first)
        categories_tags = product.get("categories_tags", [])
        if categories_tags:
            # Take first (most specific) category
            category = categories_tags[0]
            # Clean up (remove "en:" prefix, replace dashes)
            category = category.replace("en:", "").replace("-", " ")
            return self._normalize_category(category)

        # Fallback to categories field
        categories = product.get("categories")
        if categories:
            # Take first category
            category = categories.split(",")[0].strip()
            return self._normalize_category(category)

        return None

    def _normalize_category(self, category: str) -> str:
        """
        Normalize Open Food Facts category to SnapShelf category.

        Maps detailed OFF categories to our simpler category system
        used by expiry prediction.
        """
        category_lower = category.lower()

        # Mapping rules (can be expanded)
        if any(word in category_lower for word in ["milk", "yogurt", "cheese", "dairy", "butter"]):
            return "dairy"
        elif any(word in category_lower for word in ["meat", "beef", "pork", "chicken", "poultry"]):
            return "meat"
        elif any(word in category_lower for word in ["fish", "seafood", "salmon", "tuna"]):
            return "fish"
        elif any(word in category_lower for word in ["fruit", "apple", "banana", "orange"]):
            return "fruits"
        elif any(word in category_lower for word in ["vegetable", "carrot", "lettuce", "tomato"]):
            return "vegetables"
        elif any(word in category_lower for word in ["bread", "bakery", "pastry"]):
            return "bakery"
        elif any(word in category_lower for word in ["egg"]):
            return "eggs"
        elif any(word in category_lower for word in ["frozen"]):
            return "frozen"
        elif any(word in category_lower for word in ["canned", "preserved"]):
            return "canned"
        elif any(word in category_lower for word in ["sauce", "condiment", "ketchup", "mustard"]):
            return "condiments"
        else:
            # Return original if no match
            return category


# Singleton instance
openfoodfacts_client = OpenFoodFactsClient()
