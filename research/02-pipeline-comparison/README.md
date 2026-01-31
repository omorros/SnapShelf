# SnapShelf: A Comparative Study of Vision Pre-Processing Approaches for LLM-Based Food Recognition

> **BSc Dissertation Artefact**
> Investigating the impact of structural and semantic visual pre-processing on Large Language Model performance in multi-item food recognition tasks.

---

## Abstract

This repository contains the experimental framework for evaluating three distinct pipelines for food item recognition from images. The study isolates the effect of visual pre-processing strategies on LLM classification accuracy, comparing: (A) direct LLM inference on full images, (B) structurally-guided region proposals via class-agnostic object detection, and (C) semantically-guided region proposals via open-vocabulary detection.

---

## Table of Contents

1. [Research Context](#research-context)
2. [Pipeline Architecture](#pipeline-architecture)
3. [System Components](#system-components)
4. [Experimental Design](#experimental-design)
5. [Installation](#installation)
6. [Usage](#usage)
7. [Output Schema](#output-schema)
8. [Configuration Reference](#configuration-reference)
9. [Project Structure](#project-structure)
10. [Requirements](#requirements)

---

## Research Context

### Problem Statement

Vision-Language Models (VLMs) demonstrate strong performance on single-object classification tasks but face challenges with multi-item scenes common in food recognition applications (e.g., refrigerator contents, grocery receipts, meal composition). This study investigates whether visual pre-processing—decomposing scenes into isolated regions—improves recognition accuracy, and whether the nature of that decomposition (structural vs. semantic) affects outcomes.

### Research Questions

1. Does region-based pre-processing improve LLM food recognition accuracy compared to full-image inference?
2. Does semantic guidance in region proposal (YOLO-World) outperform class-agnostic structural detection (YOLOv8)?
3. What is the trade-off between detection coverage and classification noise across approaches?

---

## Pipeline Architecture

The framework implements three parallel pipelines, each processing identical input images through different visual conditioning strategies before LLM classification.

### Pipeline Overview

| Pipeline | Pre-Processing | Detection Model | Semantic Guidance |
|----------|----------------|-----------------|-------------------|
| **A** | None | — | None |
| **B** | Class-agnostic detection | YOLOv8 (COCO) | None (structural only) |
| **C** | Open-vocabulary detection | YOLO-World | Food-specific prompts |

### Pipeline A: LLM-Only Baseline

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Input      │ ───► │  GPT-4o     │ ───► │  Structured │
│  Image      │      │  Vision     │      │  Output     │
└─────────────┘      └─────────────┘      └─────────────┘
```

The baseline pipeline submits the complete image directly to the LLM with a structured prompt requesting food item identification. This approach relies entirely on the VLM's inherent multi-object recognition capabilities.

### Pipeline B: Structural Pre-Processing (Class-Agnostic YOLO)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Input      │ ───► │  YOLOv8     │ ───► │  Geometric  │ ───► │  Cropped    │
│  Image      │      │  Detection  │      │  Filtering  │      │  Regions    │
└─────────────┘      └─────────────┘      └─────────────┘      └──────┬──────┘
                                                                      │
                     ┌─────────────┐      ┌─────────────┐             │
                     │  Aggregated │ ◄─── │  GPT-4o     │ ◄───────────┘
                     │  Output     │      │  per Crop   │       (each region)
                     └─────────────┘      └─────────────┘
```

Pipeline B employs standard YOLOv8 (trained on COCO) for region proposal, deliberately ignoring class labels to isolate structural contribution. Geometric filters remove noise without semantic reasoning.

**Key Characteristics:**
- Class labels discarded (all detections treated as generic "object")
- Geometric filtering: ≥2% image area, aspect ratio 0.2–5.0
- No semantic bias in region selection

### Pipeline C: Semantic Pre-Processing (YOLO-World)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Input      │ ───► │  YOLO-World │ ───► │  Geometric  │ ───► │  Cropped    │
│  Image      │      │  (Prompted) │      │  Filtering  │      │  Regions    │
└─────────────┘      └─────────────┘      └─────────────┘      └──────┬──────┘
                                                                      │
                     ┌─────────────┐      ┌─────────────┐             │
                     │  Aggregated │ ◄─── │  GPT-4o     │ ◄───────────┘
                     │  Output     │      │  per Crop   │       (each region)
                     └─────────────┘      └─────────────┘
```

Pipeline C uses YOLO-World's open-vocabulary capabilities with fixed food-specific prompts, providing semantic guidance during region proposal. Identical geometric filtering is applied for fair comparison with Pipeline B.

**Fixed Prompt Set:**
```python
["food", "fruit", "vegetable", "packaged food"]
```

**Key Characteristics:**
- Semantic prompts guide detection toward food-relevant regions
- Prompts are fixed (identical across all images, no dynamic adjustment)
- No specific food names to avoid biasing LLM classification
- Geometric filtering identical to Pipeline B (fair comparison)

---

## System Components

### Detection Modules

| Module | File | Model | Purpose |
|--------|------|-------|---------|
| YOLO-World Detector | `clients/yolo_detector.py` | `yolov8s-worldv2.pt` | Open-vocabulary semantic detection |
| Class-Agnostic Detector | `clients/yolo_detector_agnostic.py` | `yolov8s.pt` | Structural region proposal |

### LLM Client

| Component | Specification |
|-----------|---------------|
| File | `clients/llm_client.py` |
| Model | `gpt-4o-mini` |
| Temperature | `0` (deterministic) |
| Image Detail | `high` |

The LLM client is **frozen** across all pipelines—identical prompts, parameters, and output parsing ensure the only experimental variable is visual pre-processing.

### Pipeline Modules

| Pipeline | File | Detector |
|----------|------|----------|
| A (LLM-only) | `pipelines/llm_pipeline.py` | None |
| B (Structural) | `pipelines/yolo_agnostic_pipeline.py` | `YOLODetectorAgnostic` |
| C (Semantic) | `pipelines/yolo_world_pipeline.py` | `YOLODetector` |

---

## Experimental Design

### Controlled Variables

To ensure experimental validity, the following parameters are held constant:

| Aspect | Specification | Rationale |
|--------|---------------|-----------|
| LLM Model | `gpt-4o-mini` | Identical classifier across pipelines |
| LLM Temperature | `0` | Deterministic outputs for reproducibility |
| LLM Prompts | Frozen | Eliminate prompt engineering as variable |
| Confidence Threshold | `0.15` | Identical sensitivity across YOLO variants |
| IoU Threshold | `0.45` | Identical NMS behaviour |
| Max Detections | `8` | Controlled region count |
| Crop Padding | `10%` | Identical context capture |
| Geometric Filters | Identical | Same area/aspect constraints on B and C |
| Output Schema | Frozen | Standardised comparison |

### Fallback Policy

**Fallback is strictly disabled** for experimental fairness. If a YOLO pipeline detects zero regions:

- Returns empty result: `{"items": [], "meta": {"detections_count": 0}}`
- Does **not** fall back to full-image LLM analysis
- Ensures pipeline independence (Pipeline B/C results never contaminated by Pipeline A behaviour)

### Deduplication Strategy

Pipelines B and C aggregate multiple LLM responses (one per detected region). Results are deduplicated by normalised food name (case-insensitive) to prevent double-counting overlapping detections.

---

## Installation

### Prerequisites

- Python 3.10 or higher
- OpenAI API key with GPT-4o access
- ~50MB disk space for YOLO models

### Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd SnapShelf-console

# 2. Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=sk-...

# 5. YOLO models (auto-downloaded on first run)
# Alternatively, pre-download:
# - yolov8s.pt (standard COCO)
# - yolov8s-worldv2.pt (YOLO-World)
```

---

## Usage

### Interactive Mode

Launch the menu-driven interface for exploratory testing:

```bash
python main.py
```

```
╔══════════════════════════════════════════════════╗
║       Food Detection Pipeline Comparison         ║
║    Research tool for comparing detection approaches    ║
╚══════════════════════════════════════════════════╝

  1.  Pipeline A — LLM-only (baseline)
  2.  Pipeline B — Class-agnostic YOLO + LLM
  3.  Pipeline C — YOLO-World + LLM
  4.  Warmup models (for timing fairness)
  5.  Validate environment
  6.  Exit

Select option (1-6):
```

### Command-Line Interface

For batch processing and scripted evaluation:

```bash
# Pipeline A: LLM-only baseline
python main.py llm <image_path>

# Pipeline B: Class-agnostic YOLO + LLM
python main.py yolo <image_path>

# Pipeline C: YOLO-World + LLM
python main.py yolo-world <image_path>

# Utility commands
python main.py --validate    # Check environment and display config
python main.py --warmup      # Pre-load all models for timing fairness
```

**Example:**

```bash
python main.py yolo-world ./test_images/refrigerator.jpg
```

Output is JSON to stdout, suitable for piping to evaluation scripts.

### Recommended Experiment Workflow

For valid timing measurements, always warm up models before running experiments:

```bash
# 1. Validate environment (check API key, display frozen config)
python main.py --validate

# 2. Pre-load all models (excludes loading time from measurements)
python main.py --warmup

# 3. Run experiments (models already in memory)
python main.py llm image.jpg
python main.py yolo image.jpg
python main.py yolo-world image.jpg
```

### Warmup Explanation

Without warmup, the **first run** of each pipeline includes model loading time:
- First run: ~5000ms (loading YOLOv8/YOLO-World from disk)
- Subsequent runs: ~500ms (model already in memory)

The `--warmup` command pre-loads all models so timing measurements reflect only inference time, ensuring fair comparison across pipelines.

---

## Output Schema

All pipelines produce identical JSON structure for standardised comparison:

```json
{
  "items": [
    {"name": "apple", "state": "fresh"},
    {"name": "milk", "state": "packaged"},
    {"name": "bread", "state": "packaged"}
  ],
  "meta": {
    "pipeline": "yolo-world",
    "image": "refrigerator.jpg",
    "runtime_ms": 2847.32,
    "fallback_used": false,
    "detections_count": 5,
    "timing_breakdown": {
      "detection_ms": 342.15,
      "llm_total_ms": 2505.17,
      "llm_avg_ms": 501.03,
      "llm_calls": 5
    }
  }
}
```

### Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Normalised food name (lowercase, singular) |
| `state` | enum | `fresh` \| `packaged` \| `cooked` \| `unknown` |

### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `pipeline` | string | `llm` \| `yolo` \| `yolo-world` |
| `image` | string | Source image filename |
| `runtime_ms` | float | Total execution time (milliseconds) |
| `fallback_used` | boolean | Always `false` (fallback disabled) |
| `detections_count` | integer | YOLO detections used (Pipelines B/C only) |
| `timing_breakdown` | object | Per-component timing for analysis |

### Timing Breakdown Fields

| Field | Type | Description |
|-------|------|-------------|
| `image_load_ms` | float | Image loading time (Pipeline A only) |
| `detection_ms` | float | YOLO inference time (Pipelines B/C) |
| `llm_inference_ms` | float | Single LLM call time (Pipeline A) |
| `llm_total_ms` | float | Total LLM time across all crops (Pipelines B/C) |
| `llm_avg_ms` | float | Average LLM time per crop (Pipelines B/C) |
| `llm_calls` | integer | Number of LLM API calls made |

---

## Configuration Reference

### Detection Parameters

Located in `clients/yolo_detector.py` and `clients/yolo_detector_agnostic.py`:

| Parameter | Value | Description |
|-----------|-------|-------------|
| `CONF_THRESHOLD` | `0.15` | Minimum detection confidence |
| `IOU_THRESHOLD` | `0.45` | Non-Maximum Suppression overlap threshold |
| `MAX_DETECTIONS` | `8` | Maximum regions per image |
| `CROP_PADDING_PCT` | `0.10` | Padding around detected regions (10%) |

### Geometric Filters (Pipelines B and C)

Applied identically to both YOLO pipelines for fair comparison.
Located in `clients/yolo_detector_agnostic.py` and `clients/yolo_detector.py`:

| Parameter | Value | Description |
|-----------|-------|-------------|
| `MIN_BBOX_AREA_PCT` | `0.02` | Minimum bounding box area (2% of image) |
| `MIN_ASPECT_RATIO` | `0.2` | Minimum width/height ratio |
| `MAX_ASPECT_RATIO` | `5.0` | Maximum width/height ratio |

### YOLO-World Prompts (Pipeline C Only)

Located in `config.py`:

```python
yolo_world_prompts = ("food", "fruit", "vegetable", "packaged food")
```

---

## Reproducibility

### Frozen Configuration

All experiment parameters are centralised in `config.py` as a frozen dataclass:

```python
@dataclass(frozen=True)
class ExperimentConfig:
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.0
    yolo_conf_threshold: float = 0.15
    yolo_max_detections: int = 8
    random_seed: int = 42
    # ... etc
```

### Random Seed Control

Reproducibility seeds are set automatically on experiment initialisation:
- Python `random` module
- NumPy random state
- PyTorch (if available)

### Structured Logging

Every experiment run generates detailed logs in `logs/experiment_{timestamp}.jsonl`:

```json
{"timestamp": "2024-01-31T15:30:45", "pipeline": "yolo", "step": "detection", "details": {"bbox": {...}, "confidence": 0.87}}
{"timestamp": "2024-01-31T15:30:46", "pipeline": "yolo", "step": "llm_call", "duration_ms": 523.4, "raw_response": "..."}
```

Logs include:
- Every YOLO detection (bbox, confidence, filter pass/fail)
- Every LLM call (raw response, parsed result, timing)
- Pipeline completion summaries

### Singleton Pattern

All ML clients use singleton pattern to ensure:
1. Models are loaded once (not per-pipeline-call)
2. Timing measurements exclude initialisation
3. Memory efficiency across multiple runs

---

## Project Structure

```
SnapShelf-console/
├── main.py                           # CLI and interactive entry point
├── config.py                         # Frozen experiment configuration & logging
├── requirements.txt                  # Python dependencies (pinned versions)
├── .env.example                      # Environment template
├── .gitignore
│
├── clients/
│   ├── __init__.py
│   ├── llm_client.py                 # OpenAI Vision client (singleton, frozen)
│   ├── yolo_detector.py              # YOLO-World detector (Pipeline C)
│   └── yolo_detector_agnostic.py     # Class-agnostic detector (Pipeline B)
│
├── pipelines/
│   ├── __init__.py
│   ├── output.py                     # Shared output schema (frozen)
│   ├── llm_pipeline.py               # Pipeline A implementation
│   ├── yolo_agnostic_pipeline.py     # Pipeline B implementation
│   └── yolo_world_pipeline.py        # Pipeline C implementation
│
├── logs/                             # Experiment logs (auto-generated, not tracked)
│   └── experiment_{timestamp}.jsonl  # Structured logs for post-hoc analysis
│
└── test_images/                      # Sample images (not tracked)
```

---

## Requirements

### Runtime Dependencies (Pinned for Reproducibility)

```
ultralytics==8.3.57
git+https://github.com/ultralytics/CLIP.git@88ade288431a46233f1556d1e141901b3ef0a36b
openai==1.59.9
pillow==11.1.0
rich==13.9.4
python-dotenv==1.0.1
numpy==2.2.2
structlog==24.4.0
```

**Note:** All dependencies are pinned to exact versions to ensure reproducibility across environments and time.

### System Requirements

| Requirement | Specification |
|-------------|---------------|
| Python | 3.10+ |
| RAM | 4GB minimum (8GB recommended) |
| Disk | ~50MB (YOLO models) |
| Network | Required for OpenAI API calls |
| GPU | Optional (CPU inference supported) |

---

## License

This project is developed as part of a BSc dissertation. See repository license for terms.

---

## Acknowledgements

- [Ultralytics](https://github.com/ultralytics/ultralytics) for YOLOv8 and YOLO-World implementations
- [OpenAI](https://openai.com) for GPT-4o Vision API

---

*Results and dataset documentation will be added upon completion of the experimental evaluation phase.*
