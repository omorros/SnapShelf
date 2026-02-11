"""
Fine-tune YOLOv8s as a 1-class objectness detector.

Same bounding boxes as the 14-class dataset, but all class IDs = 0.
This isolates detection from classification — YOLO finds regions, CNN classifies them.

Usage:
    python -m training.train_yolo_objectness
    python -m training.train_yolo_objectness --epochs 50 --batch 32
"""

import argparse
from pathlib import Path

from ultralytics import YOLO

from config import CONFIG, set_reproducibility_seed


def train(
    data_yaml: str = "data/yolo_objectness.yaml",
    epochs: int | None = None,
    batch: int | None = None,
    img_size: int | None = None,
    patience: int | None = None,
    resume: bool = False,
    project: str = "runs/yolo_objectness",
    name: str = "train",
):
    """
    Train YOLOv8s as a 1-class objectness detector.

    Args:
        data_yaml: Path to data.yaml.
        epochs: Number of training epochs.
        batch: Batch size.
        img_size: Image size for training.
        patience: Early stopping patience.
        resume: Resume from last checkpoint.
        project: Output project directory.
        name: Experiment name.
    """
    set_reproducibility_seed()

    epochs = epochs or CONFIG.train_epochs
    batch = batch or CONFIG.train_batch_size
    img_size = img_size or CONFIG.yolo_img_size
    patience = patience or CONFIG.train_patience

    model = YOLO("yolov8s.pt")

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch,
        imgsz=img_size,
        patience=patience,
        lr0=CONFIG.train_lr,
        project=project,
        name=name,
        exist_ok=True,
        resume=resume,
        seed=CONFIG.random_seed,
        verbose=True,
    )

    # Copy best weights to standard location
    best_pt = Path(project) / name / "weights" / "best.pt"
    dst = Path(CONFIG.yolo_objectness_weights)
    dst.parent.mkdir(parents=True, exist_ok=True)
    if best_pt.exists():
        import shutil
        shutil.copy2(best_pt, dst)
        print(f"\nBest weights saved to: {dst}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8s as objectness detector")
    parser.add_argument("--data", default="data/yolo_objectness.yaml", help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=None, help="Number of epochs")
    parser.add_argument("--batch", type=int, default=None, help="Batch size")
    parser.add_argument("--img-size", type=int, default=None, help="Image size")
    parser.add_argument("--patience", type=int, default=None, help="Early stopping patience")
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
    parser.add_argument("--project", default="runs/yolo_objectness", help="Output project dir")
    parser.add_argument("--name", default="train", help="Experiment name")
    args = parser.parse_args()

    train(
        data_yaml=args.data,
        epochs=args.epochs,
        batch=args.batch,
        img_size=args.img_size,
        patience=args.patience,
        resume=args.resume,
        project=args.project,
        name=args.name,
    )
