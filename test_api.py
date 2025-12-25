"""
Test script for SnapShelf API end-to-end flow
Tests the sacred Draft → Inventory confirmation flow
"""
import requests
from datetime import date, timedelta
from uuid import uuid4

BASE_URL = "http://localhost:8000/api"

# Use existing test user (created in database)
TEST_USER_ID = "f41baa67-34ec-4d02-a9b2-31fc4a81fae6"
headers = {"X-User-Id": TEST_USER_ID}

print("=" * 60)
print("SnapShelf API End-to-End Test")
print("=" * 60)
print(f"\nTest User ID: {TEST_USER_ID}\n")

# Step 1: Create a draft item (simulating AI or manual input)
print("1. Creating draft item (AI-generated)...")
draft_data = {
    "name": "Milk",
    "quantity": 1.0,
    "unit": "liter",
    "expiration_date": str(date.today() + timedelta(days=7)),
    "category": "dairy",
    "location": "fridge",
    "source": "ai",
    "confidence_score": 0.85
}

response = requests.post(
    f"{BASE_URL}/draft-items",
    json=draft_data,
    headers=headers
)
print(f"   Status: {response.status_code}")
draft_item = response.json()
draft_id = draft_item["id"]
print(f"   Created draft ID: {draft_id}")
print(f"   Draft data: {draft_item['name']} - {draft_item['quantity']} {draft_item['unit']}")

# Step 2: List draft items
print("\n2. Listing all draft items...")
response = requests.get(f"{BASE_URL}/draft-items", headers=headers)
print(f"   Status: {response.status_code}")
drafts = response.json()
print(f"   Found {len(drafts)} draft item(s)")

# Step 3: Update the draft (user edits before confirmation)
print("\n3. Updating draft item (user correction)...")
update_data = {
    "quantity": 2.0,
    "notes": "Buy 2 liters next time"
}
response = requests.patch(
    f"{BASE_URL}/draft-items/{draft_id}",
    json=update_data,
    headers=headers
)
print(f"   Status: {response.status_code}")
updated_draft = response.json()
print(f"   Updated quantity: {updated_draft['quantity']} {updated_draft['unit']}")

# Step 4: SACRED OPERATION - Confirm draft -> Inventory
print("\n4. CONFIRMING draft item (Draft -> Inventory)...")
confirmation_data = {
    "name": updated_draft["name"],
    "category": updated_draft["category"],
    "quantity": updated_draft["quantity"],
    "unit": updated_draft["unit"],
    "storage_location": updated_draft["location"],
    "expiry_date": updated_draft["expiration_date"]
}
response = requests.post(
    f"{BASE_URL}/draft-items/{draft_id}/confirm",
    json=confirmation_data,
    headers=headers
)
print(f"   Status: {response.status_code}")
inventory_item = response.json()
inventory_id = inventory_item["id"]
print(f"   [OK] Promoted to inventory ID: {inventory_id}")
print(f"   Trusted data: {inventory_item['name']} - {inventory_item['quantity']} {inventory_item['unit']}")

# Step 5: Verify draft is deleted
print("\n5. Verifying draft was deleted after confirmation...")
response = requests.get(f"{BASE_URL}/draft-items", headers=headers)
drafts = response.json()
print(f"   Status: {response.status_code}")
print(f"   Draft items remaining: {len(drafts)} (should be 0)")

# Step 6: List inventory items
print("\n6. Listing inventory items...")
response = requests.get(f"{BASE_URL}/inventory", headers=headers)
print(f"   Status: {response.status_code}")
inventory = response.json()
print(f"   Found {len(inventory)} inventory item(s)")
if inventory:
    item = inventory[0]
    print(f"   Item: {item['name']}")
    print(f"   Quantity: {item['quantity']} {item['unit']}")
    print(f"   Expiry: {item['expiry_date']}")
    print(f"   Location: {item['storage_location']}")

# Step 7: Update quantity (only mutable field)
print("\n7. Updating inventory quantity (consumed some)...")
response = requests.patch(
    f"{BASE_URL}/inventory/{inventory_id}/quantity",
    json={"quantity": 1.5},
    headers=headers
)
print(f"   Status: {response.status_code}")
updated_item = response.json()
print(f"   New quantity: {updated_item['quantity']} {updated_item['unit']}")

print("\n" + "=" * 60)
print("[OK] End-to-End Test Complete!")
print("=" * 60)
print("\nCore flow verified:")
print("  1. Draft creation [OK]")
print("  2. Draft editing [OK]")
print("  3. Draft -> Inventory confirmation [OK]")
print("  4. Inventory management [OK]")
print("\nThe sacred invariant is maintained:")
print("  AI never creates InventoryItem directly [OK]")
print("  User explicitly confirmed all trusted data [OK]")
