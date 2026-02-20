# Experiment 2 — Pipeline Comparison Plan

## 1. Objective

Compare three end-to-end photo-to-inventory pipelines on the **same test set**
and **same metrics**, then evaluate robustness under controlled image degradations.

| Pipeline | Strategy                              |
|----------|---------------------------------------|
| A (VLM)  | Image → GPT-4o-mini → inventory       |
| B (YOLO) | Image → 14-class YOLO → inventory     |
| C (YOLO+CNN) | Image → objectness YOLO → crops → CNN → inventory |

---

## 2. Dataset Creation

### 2.1 Photography Guidelines

**Target:** 120 images, each containing 2–8 items from the 14 classes.

**Do NOT use** a clean white or solid-color background.
The app operates in real environments; the test set must reflect that.

---

#### Difficulty Tiers — 40 images each (balanced)

| Tier | Images | Items/image | Description |
|------|--------|-------------|-------------|
| Simple | **40** | 2–3 | Distinct items, well spaced, no occlusion, good lighting |
| Medium | **40** | 4–5 | Some similar items (lemon+orange), mild occlusion |
| Hard   | **40** | 6–8 | Heavy occlusion, similar colors, mixed/dim lighting |

**Total: 120 images (40 + 40 + 40)**

---

#### Locations — 5 settings, 24 images each (balanced)

Every setting gets **exactly 24 images**: 8 simple + 8 medium + 8 hard.

| # | Setting | What it looks like | Images | Simple | Medium | Hard |
|---|---------|-------------------|--------|--------|--------|------|
| 1 | **Kitchen counter** | Granite / marble / wooden countertop | 24 | 8 | 8 | 8 |
| 2 | **Fridge / shelf** | Inside open fridge or pantry shelf | 24 | 8 | 8 | 8 |
| 3 | **Wooden table** | Dining table, desk, any flat table surface | 24 | 8 | 8 | 8 |
| 4 | **Grocery bag / basket** | Items inside or spilling out of a bag/basket | 24 | 8 | 8 | 8 |
| 5 | **Chopping board / plate** | Plate, tray, chopping board, placemat | 24 | 8 | 8 | 8 |
| | **TOTAL** | | **120** | **40** | **40** | **40** |

---

#### Angles — 3 types, balanced within each setting

Within each setting's 24 images, distribute angles evenly (8 per angle):

| Angle | Per setting | Total (×5 settings) |
|-------|-------------|---------------------|
| Top-down (bird's eye) | 8 | 40 |
| 45° (angled view) | 8 | 40 |
| Side / slight low angle | 8 | 40 |

---

#### Class Balance

Each of the 14 classes must appear in **at least 15 images** across the full set.

With 120 images averaging ~4.5 items each ≈ 540 total item appearances:
540 / 14 classes ≈ **~38 appearances per class** (target minimum: 15).

**Confusing pairs to deliberately include** (at least 5 images per pair):
- Lemon + Orange
- Peach + Orange
- Tomato + Apple (red, round)
- Red pepper + Tomato (red)
- Potato + Onion (brown, round)
- Cucumber + Green pepper (green, elongated)

---

#### Shooting Checklist Summary

- [ ] 120 images total: 40 simple, 40 medium, 40 hard
- [ ] 24 images per setting (kitchen, fridge, table, bag, board)
- [ ] 40 images per angle (top-down, 45°, side)
- [ ] Every class in at least 15 images
- [ ] All 6 confusing pairs captured in at least 5 images each
- [ ] Use the same phone camera throughout (the device the app targets)
- [ ] Vary lighting naturally (daylight near windows, warm indoor, dim for hard tier)

### 2.2 Annotation

**Tool:** Roboflow (free tier), CVAT, or Label Studio.

**Format:** YOLO `.txt` (one file per image):
```
<class_id> <x_center> <y_center> <width> <height>
```
All coordinates normalized [0, 1]. Class IDs per `config.py` (0=apple … 13=tomato).

**Export structure:**
```
dataset_exp2/
  images/       ← 120 .jpg files
  labels/       ← matching .txt annotation files
```

**Quality control:**
- Every object fully boxed, tight bounding box
- Green vs. red pepper annotated with correct class
- Partially occluded items still annotated
- No duplicate boxes on the same object

---

## 3. Image Degradation

Generate degraded versions of the **same** images to test pipeline robustness.
All degradations applied using `albumentations` / `PIL` / `OpenCV` with fixed
random seed (42) for reproducibility.

### 3.1 Degradation Types (3 selected)

We select three degradations representing the most common real-world image
quality issues: **optical** (blur), **sensor** (noise), and **compression** (JPEG).

| ID | Degradation | Parameters | Simulates | Category |
|----|-------------|------------|-----------|----------|
| D1 | **Gaussian blur** | kernel=7, sigma=3.0 | Out-of-focus camera | Optical |
| D2 | **Gaussian noise** | mean=0, sigma=25 (uint8 scale) | Low-light sensor noise | Sensor |
| D3 | **JPEG compression** | quality=15 | Messaging apps, cheap uploads | Compression |

**Justification for these three:** They cover the three main sources of quality
loss in a mobile app workflow — the camera optics, the sensor hardware, and
the image compression pipeline. Other degradations (motion blur, low-res,
brightness) are either subsets of these or less common in the target use case.

Parameters are starting points. Adjust after visual inspection so that images
are noticeably degraded but still recognizable by a human.

### 3.2 Dataset Structure

```
dataset_exp2/
  images/              ← clean originals (120 images)
  labels/              ← shared ground truth (120 .txt files)
  images_d1_blur/      ← Gaussian blur applied
  images_d2_noise/     ← Gaussian noise applied
  images_d3_jpeg/      ← JPEG compression applied
```

Labels are shared — degradation does not change bounding boxes or class IDs.

### 3.3 Evaluation Runs

4 dataset variants × 3 pipelines = **12 total runs**.

| Run | Pipeline     | Dataset    |
|-----|-------------|------------|
| 1   | A (VLM)     | clean      |
| 2   | A (VLM)     | D1 blur    |
| 3   | A (VLM)     | D2 noise   |
| 4   | A (VLM)     | D3 jpeg    |
| 5   | B (YOLO)    | clean      |
| 6   | B (YOLO)    | D1 blur    |
| 7   | B (YOLO)    | D2 noise   |
| 8   | B (YOLO)    | D3 jpeg    |
| 9   | C (YOLO+CNN)| clean      |
| 10  | C (YOLO+CNN)| D1 blur    |
| 11  | C (YOLO+CNN)| D2 noise   |
| 12  | C (YOLO+CNN)| D3 jpeg    |

### 3.4 Results Template

**F1 scores (main comparison table):**

|            | Clean | D1 Blur | D2 Noise | D3 JPEG | Avg Degraded | Worst |
|------------|-------|---------|----------|---------|--------------|-------|
| Pipeline A |       |         |          |         |              |       |
| Pipeline B |       |         |          |         |              |       |
| Pipeline C |       |         |          |         |              |       |

**F1 Drop (%) from clean baseline:**

|            | D1 Blur | D2 Noise | D3 JPEG | Avg Drop |
|------------|---------|----------|---------|----------|
| Pipeline A |         |          |         |          |
| Pipeline B |         |          |         |          |
| Pipeline C |         |          |         |          |

---

## 4. Metrics

All metrics are **count-based** (inventory-level), matching the existing
`evaluation/metrics.py` logic:

```
TP = min(predicted_count, ground_truth_count)
FP = max(0, predicted_count - ground_truth_count)
FN = max(0, ground_truth_count - predicted_count)
```

### 4.1 Primary Metrics (per pipeline, per dataset variant)

| Metric | Description |
|--------|-------------|
| **Micro Precision** | TP_total / (TP_total + FP_total) across all images and classes |
| **Micro Recall** | TP_total / (TP_total + FN_total) across all images and classes |
| **Micro F1** | Harmonic mean of micro precision and micro recall |
| **Macro F1** | Mean of per-class F1 scores (gives equal weight to rare classes) |

### 4.2 Per-Class Metrics

For each of the 14 classes:
- Precision, Recall, F1
- Total TP, FP, FN counts

Presented as a table + heatmap.

### 4.3 Latency

| Metric | Description |
|--------|-------------|
| **Mean latency** (ms/image) | Average inference time per image |
| **Median latency** (ms/image) | Robust to outliers |
| **Std deviation** (ms) | Consistency of speed |
| **P95 latency** (ms) | Worst-case tail |

For Pipeline C, also report **breakdown**: detection time + classification time.

### 4.4 Robustness Metrics (clean vs. degraded)

| Metric | Formula |
|--------|---------|
| **F1 Drop** | (F1_clean − F1_degraded) / F1_clean × 100% |
| **Robustness Score** | Mean F1 across all 4 dataset variants (clean + 3 degraded) |
| **Worst-case F1** | Lowest F1 across all degradation types |

### 4.5 Error Analysis

| Error type | Definition |
|------------|------------|
| **Missed items** | FN breakdown: which classes are most often missed? |
| **Phantom items** | FP breakdown: which classes are hallucinated / over-counted? |
| **Over-counting** | pred > gt: how often and by how much? |
| **Under-counting** | pred < gt: how often and by how much? |
| **Confusion pairs** | Which classes get confused for each other? (confusion matrix) |

### 4.6 Statistical Significance

Per-image F1 scores are computed for each pipeline on each dataset variant.
Pipeline pairs are compared using the **Wilcoxon signed-rank test** (non-parametric,
paired, does not assume normal distribution).

| Comparison | Test | Report |
|------------|------|--------|
| A vs B (per dataset) | Wilcoxon signed-rank | p-value, effect size (r) |
| A vs C (per dataset) | Wilcoxon signed-rank | p-value, effect size (r) |
| B vs C (per dataset) | Wilcoxon signed-rank | p-value, effect size (r) |

Significance threshold: p < 0.05. Apply Bonferroni correction for multiple
comparisons (3 pairs × 4 datasets = 12 tests → adjusted α = 0.05/12 ≈ 0.004).

This answers: "Is the difference between pipelines statistically meaningful,
or could it be due to chance variation in the test images?"

### 4.7 Cost & Deployment Analysis

#### Per-image inference cost

| Pipeline | Compute cost / image | Internet required | Notes |
|----------|---------------------|-------------------|-------|
| A (VLM)  | ~$0.01–0.02 (API)  | Yes               | OpenAI GPT-4o-mini pricing |
| B (YOLO) | $0 (local)          | No                | Runs on CPU or GPU |
| C (YOLO+CNN) | $0 (local)      | No                | Runs on CPU or GPU |

#### Deployment/hosting cost (for Experiment 3 app integration)

| Deployment model | Pipeline A (VLM) | Pipeline B (YOLO) | Pipeline C (YOLO+CNN) |
|------------------|-------------------|--------------------|-----------------------|
| **On-device (mobile)** | N/A — requires API | ~22 MB model size, $0/month | ~42 MB combined (22 + 20), $0/month |
| **Cloud server (CPU)** | $0 hosting (uses OpenAI) | ~$5–15/month (e.g. small VPS) | ~$10–20/month |
| **Cloud server (GPU)** | $0 hosting (uses OpenAI) | ~$50–200/month (e.g. AWS g4dn) | ~$50–200/month |
| **Serverless (per-call)** | ~$0.01–0.02/call (OpenAI) | ~$0.005–0.01/call (e.g. Replicate) | ~$0.01–0.02/call |

**Key trade-offs to discuss:**
- Pipeline A has **zero infrastructure cost** but **variable per-call cost** and
  requires internet. At scale (thousands of users), API costs grow linearly.
- Pipelines B & C have **zero per-call cost** but require hosting the model weights
  somewhere — either bundled in the app (~22–42 MB download) or on a server.
- On-device deployment eliminates server costs entirely but increases app size
  and requires the phone to have enough compute power.
- Pipeline A depends on a third-party service (OpenAI) — availability risk.

**Report at minimum:**
- Cost per 1,000 images for each pipeline
- Monthly cost estimate at 100 / 1,000 / 10,000 images per month
- Qualitative comparison: offline capability, privacy, latency consistency

---

## 5. Qualitative Error Examples

Beyond aggregate metrics, select **4–6 representative images** that reveal
meaningful differences between pipelines. For each example:

1. Show the original image (with ground truth boxes overlaid)
2. Show each pipeline's predicted inventory vs. ground truth
3. Explain **why** the pipeline succeeded or failed

**Target examples to include:**

| Example type | What to look for |
|-------------|------------------|
| **All agree, all correct** | Baseline — shows the task is solvable |
| **VLM correct, YOLO wrong** | VLM's semantic understanding advantage |
| **YOLO correct, VLM wrong** | Local detection beating global understanding |
| **Confusion pair failure** | e.g. lemon↔orange, shows per-class weakness |
| **Degradation sensitivity** | Same image clean vs. degraded, different results |
| **Pipeline C domain gap** | CNN misclassifies a crop that YOLO-14 gets right |

These go into the dissertation as figures with captions. They are what
transform a "results dump" into genuine analysis.

---

## 6. Execution Workflow

### Step 1 — Create dataset
1. Photograph 120 multi-item scenes following Section 2.1
2. Annotate bounding boxes in YOLO format (Section 2.2)
3. Place in `dataset_exp2/images/` and `dataset_exp2/labels/`
4. Validate: run a script to check label/image pairing, class distribution

### Step 2 — Generate degraded datasets
1. Run degradation script on `dataset_exp2/images/`
2. Output to `images_d1_blur/`, `images_d2_noise/`, `images_d3_jpeg/`
3. Labels folder is shared — no changes needed

### Step 3 — Run pipelines (12 runs)
1. Run all 3 pipelines on the clean dataset
2. Run all 3 pipelines on each of the 3 degraded datasets
3. Save predictions as JSON (per pipeline, per dataset variant)
4. Log latency per image

### Step 4 — Compute metrics
1. Primary metrics (Section 4.1) per pipeline per dataset variant
2. Per-class metrics (Section 4.2)
3. Latency stats (Section 4.3)
4. Robustness metrics (Section 4.4)
5. Error analysis (Section 4.5)
6. Statistical significance tests (Section 4.6)
7. Cost analysis (Section 4.7)

### Step 5 — Qualitative analysis
1. Select 4–6 representative images (Section 5)
2. Generate annotated figures with predictions vs. ground truth
3. Write captions explaining each case

### Step 6 — Generate report
1. Comparison tables (pipeline × dataset variant)
2. Bar charts: F1 per pipeline per condition
3. Heatmaps: per-class F1, confusion matrices
4. Cost comparison table and chart
5. LaTeX export for dissertation

---

## 7. Deliverables

| Artefact | Format |
|----------|--------|
| Clean test dataset | `dataset_exp2/images/` + `labels/` |
| Degraded datasets (3) | `dataset_exp2/images_d1_blur/`, `images_d2_noise/`, `images_d3_jpeg/` |
| Per-pipeline predictions | `results/exp2/{pipeline}_{dataset}_predictions.json` |
| Metrics summary | `results/exp2/comparison_summary.json` |
| Statistical tests | `results/exp2/significance_tests.json` |
| Cost analysis | `results/exp2/cost_analysis.json` |
| Comparison bar charts | `results/exp2/comparison_*.png` |
| Confusion matrices | `results/exp2/{pipeline}_confusion.png` |
| Qualitative figures | `results/exp2/qualitative_examples/` |
| LaTeX tables | `results/exp2/comparison_table.tex` |
| Experiment log | `logs/experiment2_{timestamp}.jsonl` |

---

## 8. Winner Selection Criteria

The **overall winner** is the pipeline with the best balance across:

1. **Clean F1** — baseline accuracy (most important weight)
2. **Robustness** — smallest F1 drop under degradation
3. **Latency** — speed for real-time app use
4. **Cost** — deployment and per-inference cost for a real app
5. **Consistency** — low variance across classes and conditions

Statistical significance tests (Section 4.6) determine whether observed
differences are meaningful or due to chance.

If no single pipeline dominates all criteria, present a weighted discussion
and justify the choice for Experiment 3 (app integration).

---

## 9. Dissertation Limitations to Acknowledge

These are known limitations to address in the Discussion chapter:

- **Dataset size:** 120 images is sufficient for comparative evaluation but
  small by industry standards. Frame positively: "purpose-built to reflect the
  target deployment environment, prioritising ecological validity over scale."
- **Single photographer / single device:** All images from one phone, one person.
  Acknowledge and note this controls for device variance (consistent baseline).
- **CNN domain gap:** Pipeline C's CNN was trained on clean, single-item images.
  The domain shift to YOLO-cropped regions from real scenes is a known factor.
  This is a valid finding, not a flaw — it reveals a real limitation of the
  detect-then-classify approach.
- **VLM non-determinism:** GPT-4o-mini with temperature=0 is mostly deterministic
  but not guaranteed. Acknowledge and run each VLM evaluation once (cost constraint).
- **14-class scope:** Results may not generalise to larger class sets.
