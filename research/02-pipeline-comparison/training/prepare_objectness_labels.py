"""
Prepare objectness labels by remapping all YOLO class IDs to 0.

Reads 14-class YOLO label .txt files and writes new files where every
class_id is replaced with 0, preserving bounding box coordinates.

Usage:
    python -m training.prepare_objectness_labels \
        --src dataset/train/labels \
        --dst dataset_objectness/train/labels
"""

import argparse
import shutil
from pathlib import Path


def remap_labels(src_dir: str | Path, dst_dir: str | Path):
    """
    Remap all class IDs in YOLO .txt label files to 0.

    Args:
        src_dir: Source directory with 14-class label .txt files.
        dst_dir: Destination directory for objectness (class 0) labels.
    """
    src_dir = Path(src_dir)
    dst_dir = Path(dst_dir)
    dst_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for txt_file in sorted(src_dir.glob("*.txt")):
        lines = txt_file.read_text().strip().splitlines()
        new_lines = []
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 5:
                # Replace class_id (parts[0]) with "0", keep bbox coords
                parts[0] = "0"
                new_lines.append(" ".join(parts))

        out_file = dst_dir / txt_file.name
        out_file.write_text("\n".join(new_lines) + "\n" if new_lines else "")
        count += 1

    print(f"Remapped {count} label files: {src_dir} -> {dst_dir}")


def prepare_full_dataset(src_dataset: str | Path, dst_dataset: str | Path):
    """
    Prepare the full objectness dataset from a 14-class dataset.
    Remaps labels for train/val/test splits. Images are symlinked.

    Args:
        src_dataset: Root of 14-class dataset (with train/val/test subdirs).
        dst_dataset: Root of objectness dataset to create.
    """
    src_dataset = Path(src_dataset)
    dst_dataset = Path(dst_dataset)

    for split in ("train", "val", "test"):
        src_labels = src_dataset / split / "labels"
        dst_labels = dst_dataset / split / "labels"
        src_images = src_dataset / split / "images"
        dst_images = dst_dataset / split / "images"

        if src_labels.exists():
            remap_labels(src_labels, dst_labels)

        # Symlink images directory to avoid duplication
        if src_images.exists() and not dst_images.exists():
            dst_images.parent.mkdir(parents=True, exist_ok=True)
            try:
                dst_images.symlink_to(src_images.resolve())
                print(f"Symlinked images: {dst_images} -> {src_images.resolve()}")
            except OSError:
                # Fallback: copy on systems without symlink support
                shutil.copytree(src_images, dst_images)
                print(f"Copied images: {src_images} -> {dst_images}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Remap YOLO class IDs to 0 for objectness training"
    )
    parser.add_argument("--src", default="dataset",
                        help="Source 14-class dataset root")
    parser.add_argument("--dst", default="dataset_objectness",
                        help="Destination objectness dataset root")
    args = parser.parse_args()

    prepare_full_dataset(args.src, args.dst)
