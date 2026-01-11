"""
Shared output schema for pipeline results.
Frozen schema for research comparison.
"""

from typing import List, Optional, TypedDict


class ItemResult(TypedDict):
    """Single detected food item."""
    name: str  # Generic name (not brand)
    state: str  # fresh | packaged | cooked | unknown


class PipelineMeta(TypedDict):
    """Pipeline execution metadata."""
    pipeline: str  # "llm" or "yolo-llm"
    image: str


class PipelineResult(TypedDict):
    """Standard output schema for both systems."""
    items: List[ItemResult]
    meta: PipelineMeta


def make_result(items: List[ItemResult], pipeline: str, image: str) -> PipelineResult:
    """Create standardized pipeline result."""
    return {
        "items": items,
        "meta": {
            "pipeline": pipeline,
            "image": image
        }
    }
