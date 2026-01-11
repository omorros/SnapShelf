"""
System B: YOLO + LLM hybrid pipeline.
YOLO proposes regions, LLM identifies per crop, results aggregated.
"""

from pathlib import Path
from typing import List

from clients.yolo_detector import YOLODetector
from clients.llm_client import LLMClient
from pipelines.output import PipelineResult, ItemResult, make_result


def run(image_path: str) -> PipelineResult:
    """
    Execute YOLO-LLM hybrid pipeline (System B).

    Pipeline:
        1. YOLO proposes regions (class labels ignored)
        2. LLM identifies food in each crop
        3. Results aggregated (deduplicated by name)

    Args:
        image_path: Path to image file

    Returns:
        PipelineResult with detected items
    """
    # Step 1: YOLO region proposals
    detector = YOLODetector()
    detections = detector.detect_with_fallback(image_path)

    # Step 2: LLM per crop
    llm = LLMClient()
    raw_items: List[ItemResult] = []

    for detection in detections:
        result = llm.identify_single(detection["image_bytes"])
        if result is not None:
            raw_items.append(result)

    # Step 3: Aggregate (deduplicate by name)
    items = _deduplicate(raw_items)

    return make_result(
        items=items,
        pipeline="yolo-llm",
        image=Path(image_path).name
    )


def _deduplicate(items: List[ItemResult]) -> List[ItemResult]:
    """Deduplicate items by name (case-insensitive)."""
    seen = {}
    for item in items:
        key = item["name"].lower()
        if key not in seen:
            seen[key] = item
    return list(seen.values())
