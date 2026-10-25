"""
1-class objectness YOLO inference client for Pipeline C.

Loads a YOLOv8 model trained to detect any fruit/vegetable as a single "object" class.
Returns bounding boxes only (no class labels) — classification is deferred to the CNN.

Singleton pattern: model loads once, reused across runs.
"""

from pathlib import Path
from typing import List, Dict

from PIL import Image
from ultralytics import YOLO

from config import CONFIG

# Singleton instance
_model: YOLO | None = None


def _get_model() -> YOLO:
    """Get or load the objectness YOLO model (singleton)."""
    global _model
    if _model is None:
        weights = Path(CONFIG.yolo_objectness_weights)
        if not weights.exists():
            raise FileNotFoundError(
                f"Objectness YOLO weights not found at {weights}. "
                "Train first: python -m training.train_yolo_objectness"
            )
        _model = YOLO(str(weights))
    return _model


def detect(image_path: str) -> List[Dict]:
    """
    Run objectness detection on an image.

    Args:
        image_path: Path to input image.

    Returns:
        List of detections, each with keys:
            - confidence (float)
            - bbox (tuple): (x1, y1, x2, y2) in pixels
    """
    model = _get_model()

    results = model.predict(
        source=image_path,
        conf=CONFIG.yolo_conf_threshold,
        iou=CONFIG.yolo_iou_threshold,
        max_det=CONFIG.yolo_max_detections,
        imgsz=CONFIG.yolo_img_size,
        verbose=False,
    )

    detections = []
    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue
        for i in range(len(boxes)):
            conf = float(boxes.conf[i].item())
            x1, y1, x2, y2 = boxes.xyxy[i].tolist()
            detections.append({
                "confidence": round(conf, 4),
                "bbox": (round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)),
            })

    return detections


def crop_detections(image_path: str, detections: List[Dict], padding: float | None = None) -> List[Image.Image]:
    """
    Crop detected regions from the image with optional padding.

    Args:
        image_path: Path to input image.
        detections: List of detection dicts from detect().
        padding: Fractional padding around each box (default: CONFIG.cnn_crop_padding).

    Returns:
        List of PIL Image crops, same order as detections.
    """
    padding = padding if padding is not None else CONFIG.cnn_crop_padding
    img = Image.open(image_path).convert("RGB")
    w, h = img.size
    crops = []

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        bw = x2 - x1
        bh = y2 - y1
        pad_x = bw * padding
        pad_y = bh * padding

        cx1 = max(0, x1 - pad_x)
        cy1 = max(0, y1 - pad_y)
        cx2 = min(w, x2 + pad_x)
        cy2 = min(h, y2 + pad_y)

        crop = img.crop((cx1, cy1, cx2, cy2))
        crops.append(crop)

    return crops


def warmup():
    """Pre-load the model for timing fairness."""
    _get_model()
