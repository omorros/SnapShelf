"""
YOLO-World based region proposal service.
Uses YOLO-World as a learned proposal generator with open vocabulary.
Class labels are ignored - LLM does semantic filtering.
"""

import os
os.environ['TORCH_FORCE_WEIGHTS_ONLY_LOAD'] = '0'

import torch
from ultralytics import YOLOWorld
from PIL import Image
from io import BytesIO
from typing import List


class YOLOService:
    """
    Region proposal service using YOLO-World.

    Uses open vocabulary detection to find potential food items.
    LLM does final identification and filters non-food.

    Attributes:
        model: Loaded YOLO-World model instance
    """

    # Broad classes for proposal generation (not classification)
    PROPOSAL_CLASSES = [
        "food", "fruit", "vegetable", "package", "container",
        "bottle", "box", "bag", "produce", "grocery item"
    ]

    # Detection settings
    CONF_THRESHOLD = 0.15      # Lower = more proposals
    IOU_THRESHOLD = 0.4        # NMS - merge overlapping boxes
    MIN_AREA_RATIO = 0.02      # Min 2% of image area
    MAX_ASPECT_RATIO = 6.0     # Filter extreme aspect ratios

    def __init__(self, model_path: str = "yolov8s-worldv2.pt"):
        """
        Initialize YOLO-World service with model.

        Args:
            model_path: Path to YOLO-World model weights
        """
        self.model = YOLOWorld(model_path)
        self.model.set_classes(self.PROPOSAL_CLASSES)

    def detect(self, image_path: str) -> List[dict]:
        """
        Generate region proposals from image.

        Uses YOLO for over-generation, then filters by size/aspect ratio.
        Class labels are ignored - LLM does semantic identification.

        Args:
            image_path: Path to the image file

        Returns:
            List of dictionaries containing 'bbox' and 'image_bytes' for each proposal
        """
        image = Image.open(image_path)
        image_area = image.width * image.height

        # Run YOLO with high recall settings
        results = self.model(
            image,
            conf=self.CONF_THRESHOLD,
            iou=self.IOU_THRESHOLD,
            verbose=False
        )

        detections = []

        for result in results:
            for box in result.boxes:
                # Get bounding box coordinates (ignore class label)
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                width, height = x2 - x1, y2 - y1

                # Filter: minimum area (2-3% of image)
                box_area = width * height
                if box_area / image_area < self.MIN_AREA_RATIO:
                    continue

                # Filter: extreme aspect ratios
                aspect_ratio = max(width, height) / max(min(width, height), 1)
                if aspect_ratio > self.MAX_ASPECT_RATIO:
                    continue

                # Add padding (10%) to capture full object
                pad_x, pad_y = int(width * 0.1), int(height * 0.1)
                x1 = max(0, x1 - pad_x)
                y1 = max(0, y1 - pad_y)
                x2 = min(image.width, x2 + pad_x)
                y2 = min(image.height, y2 + pad_y)

                # Crop the region
                crop = image.crop((x1, y1, x2, y2))

                # Convert to bytes for LLM
                buffer = BytesIO()
                crop.save(buffer, format="PNG")

                detections.append({
                    "bbox": {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
                    "image_bytes": buffer.getvalue()
                })

        # Fallback: if no proposals, use entire image
        if not detections:
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            detections.append({
                "bbox": {"x": 0, "y": 0, "width": image.width, "height": image.height},
                "image_bytes": buffer.getvalue()
            })

        return detections
