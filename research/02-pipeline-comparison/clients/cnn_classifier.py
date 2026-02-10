"""
CNN classifier factory for Pipeline C.

Provides a pluggable interface so the CNN architecture winner from Experiment 1
can be swapped in via config. Pipeline C code never changes.

Supported architectures:
    - efficientnet  (EfficientNet-B0, transfer learning)
    - resnet        (ResNet-18, transfer learning)
    - custom        (user-defined CNN)

Usage:
    classifier = create_cnn_classifier()
    label = classifier.predict(crop)
    labels = classifier.predict_batch([crop1, crop2, crop3])
"""

from abc import ABC, abstractmethod
from typing import List

import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image

from config import CONFIG, CLASSES, NUM_CLASSES


# =============================================================================
# Image transform (shared across all CNN architectures)
# =============================================================================

def get_inference_transform(img_size: int | None = None) -> transforms.Compose:
    """Standard inference transform for all CNN classifiers."""
    img_size = img_size or CONFIG.cnn_img_size
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])


# =============================================================================
# Abstract base
# =============================================================================

class BaseCNNClassifier(ABC):
    """Abstract base for CNN classifiers."""

    def __init__(self, weights_path: str, device: str | None = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.transform = get_inference_transform()
        self.model = self._build_model()
        self._load_weights(weights_path)
        self.model.to(self.device)
        self.model.eval()

    @abstractmethod
    def _build_model(self) -> nn.Module:
        """Build the model architecture (without weights)."""
        ...

    def _load_weights(self, weights_path: str):
        """Load trained weights from checkpoint."""
        state = torch.load(weights_path, map_location=self.device, weights_only=True)
        # Support both raw state_dict and checkpoint dict
        if isinstance(state, dict) and "model_state_dict" in state:
            state = state["model_state_dict"]
        self.model.load_state_dict(state)

    @torch.no_grad()
    def predict(self, crop: Image.Image) -> str:
        """
        Classify a single crop.

        Args:
            crop: PIL Image of a detected object.

        Returns:
            Class name string.
        """
        tensor = self.transform(crop.convert("RGB")).unsqueeze(0).to(self.device)
        logits = self.model(tensor)
        idx = logits.argmax(dim=1).item()
        return CLASSES[idx]

    @torch.no_grad()
    def predict_batch(self, crops: List[Image.Image]) -> List[str]:
        """
        Classify a batch of crops.

        Args:
            crops: List of PIL Images.

        Returns:
            List of class name strings.
        """
        if not crops:
            return []
        tensors = torch.stack([
            self.transform(c.convert("RGB")) for c in crops
        ]).to(self.device)
        logits = self.model(tensors)
        indices = logits.argmax(dim=1).tolist()
        return [CLASSES[i] for i in indices]


# =============================================================================
# Concrete implementations
# =============================================================================

class EfficientNetClassifier(BaseCNNClassifier):
    """EfficientNet-B0 with replaced head for 14 classes."""

    def _build_model(self) -> nn.Module:
        model = models.efficientnet_b0(weights=None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, NUM_CLASSES)
        return model


class ResNetClassifier(BaseCNNClassifier):
    """ResNet-18 with replaced head for 14 classes."""

    def _build_model(self) -> nn.Module:
        model = models.resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, NUM_CLASSES)
        return model


class CustomCNNClassifier(BaseCNNClassifier):
    """
    Lightweight custom CNN for 14 classes.
    3 conv blocks -> global avg pool -> FC.
    """

    def _build_model(self) -> nn.Module:
        return nn.Sequential(
            # Block 1
            nn.Conv2d(3, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(),
            nn.MaxPool2d(2),
            # Block 2
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(),
            nn.MaxPool2d(2),
            # Block 3
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
            # Classifier
            nn.Flatten(),
            nn.Linear(128, NUM_CLASSES),
        )


# =============================================================================
# Factory
# =============================================================================

_REGISTRY = {
    "efficientnet": EfficientNetClassifier,
    "resnet": ResNetClassifier,
    "custom": CustomCNNClassifier,
}

# Singleton
_classifier: BaseCNNClassifier | None = None


def create_cnn_classifier(
    model_name: str | None = None,
    weights_path: str | None = None,
) -> BaseCNNClassifier:
    """
    Factory: create or return a CNN classifier.

    Args:
        model_name: "efficientnet" | "resnet" | "custom" (default: CONFIG.cnn_model_name).
        weights_path: Path to .pth weights (default: CONFIG.cnn_weights).

    Returns:
        BaseCNNClassifier instance (singleton).
    """
    global _classifier
    if _classifier is not None:
        return _classifier

    model_name = model_name or CONFIG.cnn_model_name
    weights_path = weights_path or CONFIG.cnn_weights

    cls = _REGISTRY.get(model_name)
    if cls is None:
        raise ValueError(
            f"Unknown CNN model '{model_name}'. Available: {list(_REGISTRY.keys())}"
        )

    _classifier = cls(weights_path=weights_path)
    return _classifier


def warmup():
    """Pre-load the CNN model for timing fairness."""
    create_cnn_classifier()
