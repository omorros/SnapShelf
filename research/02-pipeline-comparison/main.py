"""
Food Detection Pipeline Comparison CLI

Usage:
    python main.py llm <image_path>        System A: LLM-only
    python main.py yolo-llm <image_path>   System B: YOLO + LLM hybrid
"""

import sys
import json
from pathlib import Path


def main():
    # Check arguments
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(1)

    pipeline = sys.argv[1].lower()
    image_path = sys.argv[2]

    # Validate pipeline choice
    if pipeline not in ("llm", "yolo-llm"):
        print(f"Error: Unknown pipeline '{pipeline}'", file=sys.stderr)
        print("Use 'llm' or 'yolo-llm'", file=sys.stderr)
        sys.exit(1)

    # Validate image exists
    if not Path(image_path).exists():
        print(f"Error: File not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    # Run selected pipeline
    if pipeline == "llm":
        from pipelines import llm_pipeline
        result = llm_pipeline.run(image_path)
    else:
        from pipelines import yolo_llm_pipeline
        result = yolo_llm_pipeline.run(image_path)

    # Output JSON
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
