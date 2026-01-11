"""
YOLO-LLM hybrid pipeline for food detection.
Uses YOLO for region proposals, then LLM for per-crop labeling.
"""

from pathlib import Path
from typing import List

from clients.yolo_detector import YOLODetector
from clients.llm_client import LLMClient
from pipelines.output import PipelineResult, ItemResult, make_result


def run_yolo_llm_pipeline(
    image_path: str,
    model_path: str = "yolov8s.pt"
) -> PipelineResult:
    """
    Execute YOLO-LLM hybrid food detection pipeline.

    Pipeline steps:
        1. Run YOLO -> bounding boxes
        2. Crop boxes (with configurable padding)
        3. Call LLM per crop
        4. Aggregate results with basic deduplication

    Args:
        image_path: Path to the image file
        model_path: Path to YOLO weights (default: yolov8s.pt)

    Returns:
        PipelineResult with items list and metadata
    """
    # Step 1 & 2: Run YOLO detection and crop boxes
    detector = YOLODetector(model_path=model_path)
    detections = detector.detect_with_fallback(image_path)

    # Step 3: Call LLM per crop
    llm = LLMClient()
    raw_items: List[ItemResult] = []

    for detection in detections:
        image_bytes = detection["image_bytes"]
        result = llm.identify_single(image_bytes)

        if result is not None:
            raw_items.append({
                "name": result["name"],
                "quantity": result.get("quantity"),
                "packaged": result.get("packaged")
            })

    # Step 4: Basic deduplication by name
    items = _deduplicate_items(raw_items)

    return make_result(
        items=items,
        pipeline="yolo-llm",
        image=Path(image_path).name
    )


def _deduplicate_items(items: List[ItemResult]) -> List[ItemResult]:
    """
    Basic deduplication by item name (case-insensitive).

    When duplicates are found:
        - Keeps first occurrence's name spelling
        - Sums quantities if both have numeric values
        - Keeps packaged=True if any instance is packaged

    Args:
        items: Raw list of detected items

    Returns:
        Deduplicated list of items
    """
    seen: dict = {}  # name_lower -> ItemResult

    for item in items:
        name_lower = item["name"].lower()

        if name_lower not in seen:
            seen[name_lower] = {
                "name": item["name"],
                "quantity": item.get("quantity"),
                "packaged": item.get("packaged")
            }
        else:
            existing = seen[name_lower]

            # Sum quantities if both are numeric
            if existing["quantity"] is not None and item.get("quantity") is not None:
                existing["quantity"] = existing["quantity"] + item["quantity"]
            elif item.get("quantity") is not None:
                existing["quantity"] = item["quantity"]

            # Keep packaged=True if any instance is packaged
            if item.get("packaged") is True:
                existing["packaged"] = True

    return list(seen.values())
