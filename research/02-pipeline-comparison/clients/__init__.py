"""
Client modules for Experiment 2: End-to-End Pipeline Comparison.

Contains:
- vlm_client:       GPT-4o-mini constrained to 14 labels (Pipeline A)
- yolo_detector:    14-class YOLO inference (Pipeline B)
- yolo_objectness:  1-class objectness YOLO (Pipeline C)
- cnn_classifier:   CNN factory with pluggable architectures (Pipeline C)
"""
