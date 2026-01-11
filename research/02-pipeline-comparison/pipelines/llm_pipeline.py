"""
System A: LLM-only pipeline.
One image in, one structured JSON out.
"""

from pathlib import Path
from PIL import Image
from io import BytesIO

from clients.llm_client import LLMClient
from pipelines.output import PipelineResult, make_result


def run(image_path: str) -> PipelineResult:
    """
    Execute LLM-only pipeline (System A).

    Pipeline: Full image -> LLM identifies all items -> JSON output

    Args:
        image_path: Path to image file

    Returns:
        PipelineResult with detected items
    """
    # Load image
    image = Image.open(image_path)
    if image.mode != "RGB":
        image = image.convert("RGB")

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    image_bytes = buffer.getvalue()

    # Single LLM call for all items
    llm = LLMClient()
    items = llm.identify_all(image_bytes)

    return make_result(
        items=items,
        pipeline="llm",
        image=Path(image_path).name
    )
