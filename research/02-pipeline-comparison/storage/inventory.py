"""
Inventory storage management using local JSON file.
Handles CRUD operations for food items in the inventory.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from models.food_item import FoodItem

# Default data file location
DATA_FILE = Path("data/inventory.json")


class InventoryStorage:
    """
    Manages persistent storage of food inventory using JSON file.

    Attributes:
        filepath: Path to the JSON inventory file
    """

    def __init__(self, filepath: Path = DATA_FILE):
        """
        Initialize inventory storage.

        Args:
            filepath: Path to inventory JSON file
        """
        self.filepath = filepath
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Create data directory and file if they don't exist."""
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        if not self.filepath.exists():
            self._save_data({"version": "1.0", "updated_at": None, "items": []})

    def _load_data(self) -> dict:
        """
        Load inventory data from JSON file.

        Returns:
            Dictionary containing inventory data
        """
        with open(self.filepath, "r") as f:
            return json.load(f)

    def _save_data(self, data: dict):
        """
        Save inventory data to JSON file.

        Args:
            data: Dictionary containing inventory data
        """
        data["updated_at"] = datetime.now().isoformat()
        with open(self.filepath, "w") as f:
            json.dump(data, f, indent=2)

    def get_all(self, status: str = "active") -> List[FoodItem]:
        """
        Retrieve all items from inventory.

        Args:
            status: Filter by status (active, consumed, discarded, or None for all)

        Returns:
            List of FoodItem objects
        """
        data = self._load_data()
        items = [FoodItem.from_dict(item) for item in data["items"]]
        if status:
            items = [item for item in items if item.status == status]
        return items

    def get_by_id(self, item_id: str) -> Optional[FoodItem]:
        """
        Retrieve a specific item by ID.

        Args:
            item_id: Unique identifier of the item

        Returns:
            FoodItem if found, None otherwise
        """
        items = self.get_all(status=None)
        for item in items:
            if item.id == item_id:
                return item
        return None

    def add(self, item: FoodItem) -> FoodItem:
        """
        Add a single item to inventory, consolidating if duplicate exists.

        Args:
            item: FoodItem to add

        Returns:
            The added/updated FoodItem
        """
        data = self._load_data()

        # Look for existing item with same name, category, and expiry
        for i, existing in enumerate(data["items"]):
            same_name = existing["name"].lower() == item.name.lower()
            same_category = existing["category"].lower() == item.category.lower()
            same_expiry = existing.get("expiry_date") == (item.expiry_date.isoformat() if item.expiry_date else None)
            is_active = existing.get("status", "active") == "active"

            if same_name and same_category and same_expiry and is_active:
                # Consolidate: add quantities together
                data["items"][i]["quantity"] = existing.get("quantity", 1) + item.quantity
                self._save_data(data)
                return FoodItem.from_dict(data["items"][i])

        # No match found, add as new item
        data["items"].append(item.to_dict())
        self._save_data(data)
        return item

    def add_many(self, items: List[FoodItem]) -> List[FoodItem]:
        """
        Add multiple items to inventory, consolidating duplicates.

        Items with the same name, category, and expiry date will have
        their quantities combined instead of creating separate entries.

        Args:
            items: List of FoodItems to add

        Returns:
            List of added/updated FoodItems
        """
        data = self._load_data()

        for new_item in items:
            # Look for existing item with same name, category, and expiry
            found = False
            for i, existing in enumerate(data["items"]):
                same_name = existing["name"].lower() == new_item.name.lower()
                same_category = existing["category"].lower() == new_item.category.lower()
                same_expiry = existing.get("expiry_date") == (new_item.expiry_date.isoformat() if new_item.expiry_date else None)
                is_active = existing.get("status", "active") == "active"

                if same_name and same_category and same_expiry and is_active:
                    # Consolidate: add quantities together
                    data["items"][i]["quantity"] = existing.get("quantity", 1) + new_item.quantity
                    found = True
                    break

            if not found:
                # No match found, add as new item
                data["items"].append(new_item.to_dict())

        self._save_data(data)
        return items

    def update(self, item_id: str, updates: dict) -> Optional[FoodItem]:
        """
        Update an existing item.

        Args:
            item_id: ID of item to update
            updates: Dictionary of fields to update

        Returns:
            Updated FoodItem if found, None otherwise
        """
        data = self._load_data()
        for i, item in enumerate(data["items"]):
            if item["id"] == item_id:
                data["items"][i].update(updates)
                self._save_data(data)
                return FoodItem.from_dict(data["items"][i])
        return None

    def remove(self, item_id: str) -> bool:
        """
        Remove an item from inventory.

        Args:
            item_id: ID of item to remove

        Returns:
            True if item was removed, False if not found
        """
        data = self._load_data()
        original_len = len(data["items"])
        data["items"] = [item for item in data["items"] if item["id"] != item_id]
        if len(data["items"]) < original_len:
            self._save_data(data)
            return True
        return False

    def clear(self):
        """Remove all items from inventory."""
        self._save_data({"version": "1.0", "updated_at": None, "items": []})

    def get_expiring(self, days: int = 7) -> List[FoodItem]:
        """
        Get items expiring within specified days.

        Args:
            days: Number of days to look ahead

        Returns:
            List of FoodItems expiring within the timeframe
        """
        items = self.get_all(status="active")
        return [item for item in items if item.days_until_expiry() <= days]

    def consolidate(self) -> int:
        """
        Merge duplicate items in inventory.

        Items with the same name, category, and expiry date will be
        combined into a single entry with summed quantities.

        Returns:
            Number of items merged
        """
        data = self._load_data()
        items = data["items"]
        consolidated = []
        merged_count = 0

        for item in items:
            # Skip non-active items (keep them as-is)
            if item.get("status", "active") != "active":
                consolidated.append(item)
                continue

            # Look for matching item in consolidated list
            found = False
            for existing in consolidated:
                if existing.get("status", "active") != "active":
                    continue

                same_name = existing["name"].lower() == item["name"].lower()
                same_category = existing["category"].lower() == item["category"].lower()
                same_expiry = existing.get("expiry_date") == item.get("expiry_date")

                if same_name and same_category and same_expiry:
                    # Merge quantities
                    existing["quantity"] = existing.get("quantity", 1) + item.get("quantity", 1)
                    found = True
                    merged_count += 1
                    break

            if not found:
                consolidated.append(item)

        data["items"] = consolidated
        self._save_data(data)
        return merged_count
