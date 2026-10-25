"""
Generate YOLO data.yaml files for Ultralytics training.

Produces:
  - data/yolo_14class.yaml  (14 fruit/veg classes)
  - data/yolo_objectness.yaml (1 class: "object")

Can also generate from a custom dataset path.
"""

import argparse
from pathlib import Path

import yaml

from config import CLASSES


def generate_14class_yaml(dataset_path: str, output_path: str = "data/yolo_14class.yaml"):
    """Generate 14-class YOLO data config."""
    data = {
        "path": dataset_path,
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "nc": len(CLASSES),
        "names": {i: name for i, name in enumerate(CLASSES)},
    }

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    print(f"Written: {out}  (nc={len(CLASSES)})")
    return str(out)


def generate_objectness_yaml(dataset_path: str, output_path: str = "data/yolo_objectness.yaml"):
    """Generate 1-class objectness YOLO data config."""
    data = {
        "path": dataset_path,
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "nc": 1,
        "names": {0: "object"},
    }

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    print(f"Written: {out}  (nc=1)")
    return str(out)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate YOLO data.yaml files")
    parser.add_argument("--dataset", default="../dataset",
                        help="Path to 14-class dataset root")
    parser.add_argument("--dataset-obj", default="../dataset_objectness",
                        help="Path to objectness dataset root")
    args = parser.parse_args()

    generate_14class_yaml(args.dataset)
    generate_objectness_yaml(args.dataset_obj)
