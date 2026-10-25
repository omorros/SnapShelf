"""
Download the 120 test photos from Hugging Face into dataset_exp2/images/.

The photos are published at
https://huggingface.co/datasets/omorros/kitchen-fruit-vegetable-detection
so they stay out of git. The labels are already in dataset_exp2/labels/.

Usage, from research/02-pipeline-comparison:
    python scripts/download_dataset.py
"""
import shutil
from pathlib import Path

from huggingface_hub import snapshot_download

REPO_ID = "omorros/kitchen-fruit-vegetable-detection"
TARGET = Path(__file__).resolve().parents[1] / "dataset_exp2" / "images"


def main() -> None:
    snapshot = Path(snapshot_download(REPO_ID, repo_type="dataset", allow_patterns="data/test/*.jpg"))
    TARGET.mkdir(parents=True, exist_ok=True)
    photos = sorted((snapshot / "data" / "test").glob("IMG_*.jpg"))
    for photo in photos:
        shutil.copy2(photo, TARGET / photo.name)
    print(f"{len(photos)} photos in {TARGET}")


if __name__ == "__main__":
    main()
