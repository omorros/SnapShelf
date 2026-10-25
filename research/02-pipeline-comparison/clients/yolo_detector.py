"""
14-class YOLO inference client for Pipeline B.

Loads a fine-tuned YOLOv8 model trained on the 14 fruit/vegetable classes.
Returns detections as class labels + bounding boxes, converted directly to inventory.

Singleton pattern: model loads once, reused across runs.
"""

from pathlib import Path
from typing import Dict, List

from ultralytics import YOLO

from config import CONFIG, ID_TO_CLASS

# Singleton instance
_model: YOLO | None = None


def _get_model() -> YOLO:
    """Get or load the 14-class YOLO model (singleton)."""
    global _model
    if _model is None:
        weights = Path(CONFIG.yolo_14class_weights)
        if not weights.exists():
            raise FileNotFoundError(
                f"14-class YOLO weights not found at {weights}. "
                "Train first: python -m training.train_yolo_14class"
            )
        _model = YOLO(str(weights))
    return _model


def detect(image_path: str) -> List[Dict]:
    """
    Run 14-class YOLO detection on an image.

    Args:
        image_path: Path to input image.

    Returns:
        List of detections, each with keys:
            - class_id (int)
            - class_name (str)
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
            cls_id = int(boxes.cls[i].item())
            class_name = ID_TO_CLASS.get(cls_id)
            if class_name is None:
                continue
            conf = float(boxes.conf[i].item())
            x1, y1, x2, y2 = boxes.xyxy[i].tolist()
            detections.append({
                "class_id": cls_id,
                "class_name": class_name,
                "confidence": round(conf, 4),
                "bbox": (round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)),
            })

    return detections


def detections_to_inventory(detections: List[Dict]) -> Dict[str, int]:
    """
    Convert detection list to inventory (class -> count).

    Args:
        detections: List of detection dicts from detect().

    Returns:
        Inventory dict.
    """
    inventory: Dict[str, int] = {}
    for det in detections:
        name = det["class_name"]
        inventory[name] = inventory.get(name, 0) + 1
    return inventory


def warmup():
    """Pre-load the model for timing fairness."""
    _get_model()
