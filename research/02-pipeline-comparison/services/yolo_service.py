"""
YOLO-based object detection service.
Detects objects in images and returns cropped regions for food identification.
"""

import os

# Fix for PyTorch 2.6+ weights_only default change
# Set environment variable before importing torch to allow legacy model loading
# This is safe for trusted models like official YOLOv8 weights from ultralytics
os.environ['TORCH_FORCE_WEIGHTS_ONLY_LOAD'] = '0'

import torch
from ultralytics import YOLO
from PIL import Image
from io import BytesIO
from pathlib import Path
from typing import List


class YOLOService:
    """
    Object detection service using YOLOv8.

    Attributes:
        model: Loaded YOLO model instance
    """

    def __init__(self, model_path: str = "yolov8s.pt"):
        """
        Initialize YOLO service with model.

        Args:
            model_path: Path to YOLO model weights file
        """
        self.model = YOLO(model_path)

    def detect(self, image_path: str, confidence: float = 0.3) -> List[dict]:
        """
        Detect objects in image and return cropped regions.

        Args:
            image_path: Path to the image file
            confidence: Minimum confidence threshold for detections

        Returns:
            List of dictionaries containing 'bbox' and 'image_bytes' for each detection
        """
        # Load image
        image = Image.open(image_path)

        # Run YOLO detection
        results = self.model(image, conf=confidence, verbose=False)

        detections = []

        # Process each detection
        for result in results:
            for box in result.boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # Add padding (10%) to capture full object
                width, height = x2 - x1, y2 - y1
                pad_x, pad_y = int(width * 0.1), int(height * 0.1)
                x1 = max(0, x1 - pad_x)
                y1 = max(0, y1 - pad_y)
                x2 = min(image.width, x2 + pad_x)
                y2 = min(image.height, y2 + pad_y)

                # Crop the detected region
                crop = image.crop((x1, y1, x2, y2))

                # Convert crop to bytes for LLM processing
                buffer = BytesIO()
                crop.save(buffer, format="PNG")

                detections.append({
                    "bbox": {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
                    "image_bytes": buffer.getvalue()
                })

        # If no detections found, use entire image
        if not detections:
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            detections.append({
                "bbox": {"x": 0, "y": 0, "width": image.width, "height": image.height},
                "image_bytes": buffer.getvalue()
            })

        return detections
