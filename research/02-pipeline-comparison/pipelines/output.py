"""
Shared output model for pipeline results.
Both LLM and YOLO-LLM pipelines return this same structure.
"""

from typing import List, Optional, TypedDict


class ItemResult(TypedDict):
    """Single detected item."""
    name: str
    quantity: Optional[float]
    packaged: Optional[bool]


class PipelineMeta(TypedDict):
    """Pipeline execution metadata."""
    pipeline: str  # "llm" or "yolo-llm"
    image: str  # filename or path


class PipelineResult(TypedDict):
    """Standard output contract for all pipelines."""
    items: List[ItemResult]
    meta: PipelineMeta


def make_result(items: List[ItemResult], pipeline: str, image: str) -> PipelineResult:
    """
    Create a standardized pipeline result.

    Args:
        items: List of detected items
        pipeline: Pipeline identifier ("llm" or "yolo-llm")
        image: Image path or filename

    Returns:
        PipelineResult dict
    """
    return {
        "items": items,
        "meta": {
            "pipeline": pipeline,
            "image": image
        }
    }
