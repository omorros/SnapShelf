"""
YOLO-World detector module for open-vocabulary object detection.
Uses YOLO-World for region proposals to be classified by LLM.
"""

import os
os.environ['TORCH_FORCE_WEIGHTS_ONLY_LOAD'] = '0'

from pathlib import Path
from typing import List, Optional
from PIL import Image
from io import BytesIO
from ultralytics import YOLOWorld


# =============================================================================
# YOLO-WORLD CONFIGURATION
# Optimized for maximum recall in food detection scenarios
# =============================================================================

# Confidence threshold (lower = more detections, higher recall)
# 0.15 is aggressive to catch all potential food regions
CONF_THRESHOLD = 0.15

# IoU threshold for Non-Maximum Suppression
IOU_THRESHOLD = 0.45

# Maximum detections per image (reduced to limit noise)
MAX_DETECTIONS = 8

# Crop padding as percentage (captures context around objects)
CROP_PADDING_PCT = 0.10

# Open-vocabulary prompts for food detection
# FIXED LIST - identical for all images, no dynamic changes
# Semantic food categories only (no generic "object"/"item" to maintain
# clear distinction from class-agnostic Pipeline B)
DETECTION_PROMPTS = [
    "food",
    "fruit",
    "vegetable",
    "packaged food",
]

# =============================================================================
# GEOMETRIC FILTERS (identical to Pipeline B for fair comparison)
# =============================================================================

# Minimum bounding box area as percentage of image area
MIN_BBOX_AREA_PCT = 0.02  # 2% of image area

# Aspect ratio constraints (width/height)
MIN_ASPECT_RATIO = 0.2   # Not too tall/narrow
MAX_ASPECT_RATIO = 5.0   # Not too wide/flat

# =============================================================================


class YOLODetector:
    """
    YOLO-World open-vocabulary detector for region proposals.

    Uses text prompts to detect any object type without fine-tuning.
    Returns cropped regions for LLM classification.
    Applies geometric filtering identical to Pipeline B for fair comparison.
    """

    def __init__(
        self,
        model_path: str = "yolov8s-worldv2.pt",
        prompts: Optional[List[str]] = None,
        conf_threshold: float = CONF_THRESHOLD,
        iou_threshold: float = IOU_THRESHOLD,
        max_detections: int = MAX_DETECTIONS,
        crop_padding: float = CROP_PADDING_PCT,
        min_bbox_area_pct: float = MIN_BBOX_AREA_PCT,
        min_aspect_ratio: float = MIN_ASPECT_RATIO,
        max_aspect_ratio: float = MAX_ASPECT_RATIO
    ):
        """
        Initialize YOLO-World detector.

        Args:
            model_path: YOLO-World model weights (auto-downloads if missing)
            prompts: Custom detection prompts (defaults to DETECTION_PROMPTS)
            conf_threshold: Detection confidence threshold (default 0.15)
            iou_threshold: NMS IoU threshold (default 0.45)
            max_detections: Max detections to return (default 8)
            crop_padding: Padding percentage for crops (default 0.10)
            min_bbox_area_pct: Minimum bbox area as % of image (default 0.02)
            min_aspect_ratio: Minimum width/height ratio (default 0.2)
            max_aspect_ratio: Maximum width/height ratio (default 5.0)
        """
        # Resolve model path
        if Path(model_path).exists():
            resolved_path = model_path
        else:
            repo_root = Path(__file__).parent.parent
            repo_path = repo_root / model_path
            if repo_path.exists():
                resolved_path = str(repo_path)
            else:
                # Let Ultralytics auto-download
                resolved_path = model_path

        # Load YOLO-World model
        self.model = YOLOWorld(resolved_path)

        # Set detection prompts (open-vocabulary magic)
        self.prompts = prompts or DETECTION_PROMPTS
        self.model.set_classes(self.prompts)

        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.max_detections = max_detections
        self.crop_padding = crop_padding

        # Geometric filter parameters (identical to Pipeline B for fairness)
        self.min_bbox_area_pct = min_bbox_area_pct
        self.min_aspect_ratio = min_aspect_ratio
        self.max_aspect_ratio = max_aspect_ratio

    def _passes_geometric_filter(
        self, width: int, height: int, image_area: int
    ) -> bool:
        """
        Check if detection passes geometric filters.
        Identical to Pipeline B for fair comparison.

        Args:
            width: Bounding box width
            height: Bounding box height
            image_area: Total image area (width * height)

        Returns:
            True if detection passes all geometric constraints
        """
        # Filter 1: Minimum area (removes tiny/noise detections)
        bbox_area = width * height
        area_pct = bbox_area / image_area
        if area_pct < self.min_bbox_area_pct:
            return False

        # Filter 2: Aspect ratio (removes elongated/edge detections)
        if height == 0:
            return False
        aspect_ratio = width / height
        if aspect_ratio < self.min_aspect_ratio or aspect_ratio > self.max_aspect_ratio:
            return False

        return True

    def detect(self, image_path: str) -> List[dict]:
        """
        Detect objects and return cropped regions.

        Applies geometric filtering identical to Pipeline B for fair comparison.

        Args:
            image_path: Path to the image file

        Returns:
            List of dicts containing:
                - bbox: {x, y, width, height}
                - image_bytes: PNG bytes of cropped region
                - confidence: Detection confidence
                - prompt_match: Which prompt triggered detection
        """
        image = Image.open(image_path)
        if image.mode != "RGB":
            image = image.convert("RGB")

        image_area = image.width * image.height

        # Run YOLO-World detection
        results = self.model(
            image,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            max_det=self.max_detections,
            verbose=False
        )

        detections = []

        for result in results:
            for box in result.boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])

                # Get which prompt matched
                prompt_match = self.prompts[cls_id] if cls_id < len(self.prompts) else "unknown"

                width, height = x2 - x1, y2 - y1

                # Apply geometric filter (identical to Pipeline B for fairness)
                if not self._passes_geometric_filter(width, height, image_area):
                    continue

                # Add padding to capture full object
                pad_x = int(width * self.crop_padding)
                pad_y = int(height * self.crop_padding)
                x1 = max(0, x1 - pad_x)
                y1 = max(0, y1 - pad_y)
                x2 = min(image.width, x2 + pad_x)
                y2 = min(image.height, y2 + pad_y)

                # Crop the region
                crop = image.crop((x1, y1, x2, y2))

                # Convert to bytes
                buffer = BytesIO()
                crop.save(buffer, format="PNG")

                detections.append({
                    "bbox": {
                        "x": x1,
                        "y": y1,
                        "width": x2 - x1,
                        "height": y2 - y1
                    },
                    "image_bytes": buffer.getvalue(),
                    "confidence": conf,
                    "prompt_match": prompt_match
                })

        return detections
