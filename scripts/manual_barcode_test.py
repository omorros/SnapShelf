"""
Test the barcode ingestion endpoint manually.
Make sure the server is running first: uvicorn app.main:app --reload
"""
import requests

BASE_URL = "http://localhost:8000/api"
TEST_USER_ID = "f41baa67-34ec-4d02-a9b2-31fc4a81fae6"

# Path to your barcode image
IMAGE_PATH = input("Enter path to barcode image: ").strip()

# Storage location
storage = input("Storage location (fridge/freezer/pantry) [fridge]: ").strip() or "fridge"

print("\nUploading barcode image...")
print("=" * 60)

# Upload the barcode image
with open(IMAGE_PATH, 'rb') as image_file:
    response = requests.post(
        f"{BASE_URL}/ingest/barcode",
        headers={"X-User-Id": TEST_USER_ID},
        files={"image": image_file},
        data={"storage_location": storage}
    )

print(f"Status: {response.status_code}")
print()

if response.status_code == 201:
    draft = response.json()
    print("[SUCCESS] Draft item created!")
    print("=" * 60)
    print(f"ID: {draft['id']}")
    print(f"Name: {draft['name']}")
    print(f"Category: {draft['category']}")
    print(f"Location: {draft['location']}")
    print(f"Predicted Expiry: {draft['expiration_date']}")
    print(f"Confidence: {draft['confidence_score']}")
    print(f"Source: {draft['source']}")
    print(f"\nNotes:\n{draft['notes']}")
    print("=" * 60)
    print("\nThis draft is now ready for user review and confirmation!")
else:
    print(f"[ERROR] {response.status_code}")
    print(response.text)
