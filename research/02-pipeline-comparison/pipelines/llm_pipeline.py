"""
LLM-only pipeline for food detection.
Sends the full image to the LLM for multi-item identification.
"""

from pathlib import Path
from PIL import Image
from io import BytesIO

from clients.llm_client import LLMClient
from pipelines.output import PipelineResult, make_result


def run_llm_pipeline(image_path: str) -> PipelineResult:
    """
    Execute LLM-only food detection pipeline.

    Pipeline: Load image -> Send to LLM -> Return all detected items

    Args:
        image_path: Path to the image file

    Returns:
        PipelineResult with items list and metadata
    """
    # Load and encode image
    image = Image.open(image_path)
    if image.mode != "RGB":
        image = image.convert("RGB")

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    image_bytes = buffer.getvalue()

    # Run LLM identification
    llm = LLMClient()
    foods = llm.identify_all(image_bytes)

    # Convert to standard output format
    items = [
        {
            "name": f["name"],
            "quantity": f.get("quantity"),
            "packaged": f.get("packaged")
        }
        for f in foods
    ]

    return make_result(
        items=items,
        pipeline="llm",
        image=Path(image_path).name
    )
