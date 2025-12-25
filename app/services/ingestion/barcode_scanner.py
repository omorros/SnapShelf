"""
Barcode detection from images using pyzxing.

Extracts barcode numbers from uploaded images to enable
quick product entry via camera/photo upload.
"""
from typing import Optional
from pathlib import Path
from pyzxing import BarCodeReader
from PIL import Image
import tempfile
import os


class BarcodeScanner:
    """
    Scans barcodes from images using pyzxing (ZXing library).

    Supports common barcode formats:
    - EAN-13 (most groceries in Europe)
    - UPC-A (most groceries in North America)
    - Code 128, QR codes, etc.
    """

    def __init__(self):
        """Initialize the barcode reader (may download Java deps on first run)"""
        self.reader = BarCodeReader()

    def scan_image(self, image_bytes: bytes) -> Optional[str]:
        """
        Extract barcode number from image bytes.

        Args:
            image_bytes: Raw image file bytes (JPEG, PNG, etc.)

        Returns:
            Barcode string if detected, None if no barcode found

        Raises:
            ValueError: If image is invalid or cannot be processed
        """
        # Save bytes to temporary file (pyzxing needs file path)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            # Decode barcode from image
            results = self.reader.decode(tmp_path)

            # Clean up temp file
            os.unlink(tmp_path)

            # Parse results
            if not results:
                return None

            # pyzxing returns list of dicts with 'parsed' field
            if isinstance(results, list) and len(results) > 0:
                barcode = results[0].get('parsed')
                if barcode:
                    return str(barcode).strip()

            return None

        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise ValueError(f"Failed to process image: {str(e)}")

    def scan_image_file(self, file_path: str) -> Optional[str]:
        """
        Extract barcode from image file path (useful for testing).

        Args:
            file_path: Path to image file

        Returns:
            Barcode string if detected, None if no barcode found
        """
        with open(file_path, 'rb') as f:
            return self.scan_image(f.read())


# Singleton instance
barcode_scanner = BarcodeScanner()
