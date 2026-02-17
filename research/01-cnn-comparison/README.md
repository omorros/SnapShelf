# SnapShelf — Experiment 1: CNN Architecture Comparison

**Module:** MOD002691 · Computing Project
**Focus:** Food Image Classification · 14 Classes · 120,842 Images
**Best result:** 99.77% test accuracy (ResNet-50) · 99.75% (EfficientNetB0) · 98.34% (Custom CNN)
**Selected model for Experiment 2:** EfficientNetB0

---

## Overview

SnapShelf is a photo-to-inventory recognition system for produce. The end-to-end goal — detailed across three experiments — is to take a shelf photograph and automatically generate an inventory list. Before that pipeline can be built, there is a fundamental question that must be answered: **which CNN architecture best classifies individual produce crops?**

Experiment 1 answers exactly that. Three architectures are trained and evaluated head-to-head on a controlled 14-class food dataset: a custom VGG-style CNN built from scratch (the baseline), EfficientNetB0 fine-tuned from ImageNet weights (the efficient modern approach), and ResNet-50 fine-tuned from ImageNet weights (the established heavyweight). The winning architecture feeds directly into the crop-classification stage of Experiment 2's YOLO+CNN pipeline.

Every decision in this experiment — hardware selection, dataset construction, split ratios, training protocol, and architecture-specific fine-tuning depth — was made deliberately and is justified here.

---

## Contents

- [The Research Question](#the-research-question)
- [Results at a Glance](#results-at-a-glance)
- [Repository Structure](#repository-structure)
- [Step 1 — Hardware Selection](#step-1--hardware-selection)
- [Step 2 — Dataset Pipeline](#step-2--dataset-pipeline)
- [Step 3 — Architecture Selection](#step-3--architecture-selection)
- [Step 4 — Training Protocol](#step-4--training-protocol)
- [Step 5 — Model Architectures](#step-5--model-architectures)
- [Results](#results)
- [Analysis and Discussion](#analysis-and-discussion)
- [Model Selection for Experiment 2](#model-selection-for-experiment-2)
- [Limitations and Threats to Validity](#limitations-and-threats-to-validity)
- [How to Reproduce](#how-to-reproduce)
- [Requirements](#requirements)
- [References](#references)

---

## The Research Question

> *Which CNN architecture achieves the best trade-off between classification accuracy and computational efficiency for food image recognition, when trained under identical conditions?*

The question has two parts: raw performance (accuracy, macro-F1) and practical fitness for deployment (model size, parameter count, training cost). The answer cannot be "whichever achieves the highest single number" — it must account for the fact that in Experiment 2, the chosen model will run once per bounding-box crop, potentially multiple times per image, inside a pipeline that needs to operate on consumer hardware.

---

## Results at a Glance

| Model | Test Accuracy | Macro F1 | Parameters | Model Size | Training Time | Total Epochs |
|---|---|---|---|---|---|---|
| Custom CNN | 98.34% | 0.9823 | 4.96M | 56.9 MB | ~24.8 h | 81 |
| EfficientNetB0 | 99.75% | 0.9972 | 4.07M | 40.0 MB | 10.96 h | 42 |
| **ResNet-50** | **99.77%** | **0.9973** | 24.13M | 211.0 MB | 8.13 h | 32 |

**Selected for Experiment 2: EfficientNetB0.** ResNet-50 leads by 0.02% accuracy, a difference that falls entirely within the Wilson 95% confidence interval (overlapping CIs on 18,141 test samples). EfficientNetB0 is 5.3× smaller and trained 2.3× faster. On functionally equivalent accuracy, efficiency is the deciding criterion.

---

## Repository Structure

```
.
├── notebooks/
│   ├── 01_hardware_accelerator_benchmark.ipynb   # GPU selection for fair comparison
│   ├── 02_dataset_preparation.ipynb              # Merge, deduplicate, split, verify
│   ├── 03_custom_cnn_training.ipynb              # Baseline: VGG-style CNN from scratch
│   ├── 04_efficientnet_training.ipynb            # Transfer learning: EfficientNetB0
│   ├── 05_resnet50_training.ipynb                # Transfer learning: ResNet-50
│   └── 06_model_comparison.ipynb                 # Statistical comparison and selection
└── README.md
```

**Run the notebooks in order.** Each builds on the outputs of the previous one. Notebooks are designed for Google Colab with a GPU runtime (T4 recommended).

> **Branch note:** All prior development versions are preserved on the `archive` branch under `v1/` and `v2/`. The `notebooks/` directory here is the final, clean submission version.

---

## Step 1 — Hardware Selection

*Notebook: `01_hardware_accelerator_benchmark.ipynb`*

Before training a single model, a hardware decision had to be made. Google Colab offers multiple GPU tiers (T4, L4, A100) at different cost points, and training three models at 80k+ images per epoch is an expensive operation. Selecting different hardware for different models would introduce an uncontrolled variable into the comparison.

To solve this, a controlled benchmark was run: the same Custom CNN architecture, the same dataset, and three training epochs were executed identically on CPU, Tesla T4, NVIDIA L4, and NVIDIA A100-SXM4-80GB. The evaluation criterion was **cost efficiency** — training speed normalised by the relative cost tier of each accelerator.

| Accelerator | Avg Epoch Time | Speedup over CPU | Cost Tier | Cost Efficiency Score |
|---|---|---|---|---|
| CPU | 2,378.9 s | 1.0× | 0.5× | — |
| **Tesla T4** | **159.96 s** | **14.87×** | **1.0×** | **14.87** |
| NVIDIA L4 | 115.12 s | 20.66× | 2.0× | 10.33 |
| NVIDIA A100 | 113.53 s | 20.95× | 4.0× | 5.24 |

The Tesla T4 delivers the best speedup per cost unit — 14.87 speed units per cost unit, versus 10.33 for the L4 and 5.24 for the A100. The A100 is faster in absolute terms but offers diminishing returns given its 4× premium. **All three model training runs were conducted on the Tesla T4**, ensuring hardware-consistent results across the comparison.

---

## Step 2 — Dataset Pipeline

*Notebook: `02_dataset_preparation.ipynb`*

### Sources

The dataset was compiled from three independent Kaggle repositories covering produce imagery:

- `moltean/fruits` (Fruits-360)
- `sshikamaru/fruit-recognition`
- `utkarshsaxenadn/fruits-classification`

Combining three sources introduces an immediate risk: **duplicate images appearing across sources**, which would cause data leakage if the same image ends up in both training and test sets. This was handled rigorously.

### Deduplication

Every image was fingerprinted with a SHA-256 hash. Exact duplicates — whether within a source or across sources — were removed globally before any split was computed. Of the 163,316 original images:

- **42,474 duplicates removed** (9,263 were cross-source duplicates, confirming inter-dataset overlap was real)
- **120,842 unique images retained**

A full deduplication report (`deduplication_report.csv`) and a dataset manifest (`dataset_manifest.csv`) with per-image SHA-256 hashes were generated for audit purposes.

### Class Mapping

Folder names across sources were inconsistent (e.g., `Apple Braeburn`, `apple_6`, `Apple`). A careful include/exclude pattern mapping was used to assign each folder to one of the 14 target classes, with substring collision prevention to avoid false matches.

**Target classes (14):** apple, banana, bell\_pepper\_green, bell\_pepper\_red, carrot, cucumber, grape, lemon, onion, orange, peach, potato, strawberry, tomato

### Split Rationale: 70 / 15 / 15

A 70/15/15 train/validation/test split was chosen over the more common 80/10/10. The reason is class imbalance.

The dataset has a **113:1 imbalance ratio** — apple accounts for 45,455 images while carrot has only 402. With a 10% test split, the carrot class yields approximately 40 test samples. With a 15% split, it yields 61. This matters because with 40 samples, a single misclassification shifts the F1 score by 2.5 percentage points, making per-class metrics unreliable. With 61 samples, the same misclassification shifts by 1.6 points — a more stable signal.

The same logic applies to the validation set. The early stopping, learning rate reduction, and model checkpoint callbacks all monitor validation accuracy. If the validation set is too small, the signal becomes noisy and early stopping may fire prematurely. With 18,119 validation images, even the smallest class has enough representation to produce stable callback signals.

The cost — losing 5% of training data compared to 80/10/10 — is negligible at this scale. Moving from ~96,000 to ~84,000 training images does not meaningfully affect convergence in models of this capacity (Goodfellow et al., 2016).

### Split Verification

After splitting, every hash in the training, validation, and test sets was checked for overlap. **Zero cross-split duplicates were found**, confirming no data leakage. The stratified split preserved class proportions across all three sets.

### Class Imbalance Mitigation

Balanced class weights were computed from the training set distribution using scikit-learn's `compute_class_weight` and saved to `class_weights.csv`. These weights were applied during all three model training runs to ensure minority classes receive appropriate loss amplification without over-sampling artefacts.

| Property | Value |
|---|---|
| Original images | 163,316 |
| After deduplication | 120,842 |
| Train | 84,582 (70%) |
| Validation | 18,119 (15%) |
| Test | 18,141 (15%) |
| Class imbalance ratio | 113:1 |
| Image size | 224×224 RGB |

---

## Step 3 — Architecture Selection

*Motivation for choosing these three specific architectures:*

**Custom CNN (baseline)** — Every transfer learning study needs a from-scratch baseline. Without it, the question "does transfer learning actually help for this specific task?" cannot be answered. If EfficientNetB0 and ResNet-50 only beat each other by 0.02%, that result alone is not particularly informative. The fact that both pretrained models outperform the from-scratch model by ~1.4–1.8% is the result that gives the comparison its meaning.

**EfficientNetB0** — Represents the modern parameter-efficient paradigm. Tan & Le (2019) introduced compound scaling — simultaneously scaling network depth, width, and input resolution by a fixed ratio — and depthwise separable convolutions to maximise accuracy per parameter. EfficientNetB0 is the smallest variant in the family, which makes it directly relevant for mobile and edge deployment (a key consideration for Experiment 3).

**ResNet-50** — Represents the established deep residual paradigm. He et al. (2016) introduced residual connections to solve the vanishing gradient problem in very deep networks. ResNet-50 is the most widely cited backbone in computer vision research and serves as the canonical benchmark architecture.

The comparison structure is deliberate: **from-scratch baseline vs. efficient modern architecture vs. established heavyweight.**

---

## Step 4 — Training Protocol

To ensure a fair comparison, all models were trained under an identical protocol wherever architecture permitted. The following settings were fixed across all three runs:

| Setting | Value |
|---|---|
| Hardware | Tesla T4 (Google Colab) |
| Dataset | Identical split (SHA-256 verified, zero leakage) |
| Image size | 224×224 RGB |
| Batch size | 32 |
| Max epochs | 100 |
| Early stopping patience | 15 epochs |
| LR reduction factor | 0.5 (patience = 5, min = 1e-7) |
| Class weights | Applied uniformly |
| Random seed | 42 |

**Data augmentation** (training set only): random rotation ±20°, width/height shifts 10%, shear 10%, zoom 10%, horizontal flip.

### Why 100 Epochs and Patience 15?

This requires explanation because an earlier version of this experiment used 50 epochs and patience 5 — settings that were inadequate.

Both EfficientNetB0 and ResNet-50 use a two-phase training procedure: Phase 1 freezes the pretrained backbone and trains only the classification head for 10 epochs; Phase 2 unfreezes a portion of the backbone and continues with a reduced learning rate. At the Phase 1 → Phase 2 transition, millions of previously frozen parameters suddenly begin receiving gradient updates. The model temporarily destabilises — validation accuracy drops and loss spikes — before recovering as the newly active weights settle into the task (Yosinski et al., 2014; Lee et al., 2022).

With patience 5, early stopping would detect that spike, count five epochs of no improvement, and terminate training before the model has had a chance to recover. The result is a model that stops learning precisely at the moment its pretrained features are beginning to be refined for the target domain. Patience 15 gives the model the room it needs to survive the transition, plateau, and then improve again. The 100-epoch ceiling is a generous upper bound — the real control mechanism is early stopping, not the ceiling.

### Learning Rate Differences

The initial learning rate is 0.001 for all models. However, at Phase 2 of the transfer learning models, it drops to 0.0001.

This is not an inconsistency — it is a deliberate safeguard against **catastrophic forgetting** (French, 1999). When a pretrained backbone is unfrozen, its weights already encode useful representations learned from millions of ImageNet images. Applying the full 0.001 learning rate to those weights produces gradients large enough to overwrite those representations in a handful of updates. Reducing to 0.0001 allows the pretrained weights to be gently refined toward the target domain rather than re-initialised.

The Custom CNN has no pretrained weights to protect. Everything starts from random initialisation, so a higher learning rate is not only safe but beneficial — the weights need to move aggressively from random to useful (Goodfellow et al., 2016).

---

## Step 5 — Model Architectures

### Custom CNN

*Notebook: `03_custom_cnn_training.ipynb`*

A VGG-style architecture built entirely from scratch. Four convolutional blocks with progressively increasing filter depths (64 → 128 → 256 → 512), each containing two Conv2D layers followed by Batch Normalisation and MaxPooling. GlobalAveragePooling2D replaces Flatten to reduce parameter count while preserving spatial feature summaries. The classification head uses Dense(512) + Batch Norm + ReLU + Dropout(0.5) before the 14-class softmax output.

| Property | Value |
|---|---|
| Total parameters | 4,964,942 |
| Model file size | 56.92 MB |
| Input | 224×224 RGB |
| Pretrained | No |

### EfficientNetB0

*Notebook: `04_efficientnet_training.ipynb`*

EfficientNetB0 pretrained on ImageNet, adapted with a lightweight classification head: GlobalAveragePooling2D → Batch Norm → Dropout(0.3) → Dense(14, softmax). No intermediate dense layers — EfficientNet's compound-scaled feature extraction is expressive enough that a direct projection head suffices.

**Fine-tuning depth: top 30% of the base (72 of 238 layers unfrozen at Phase 2).**

EfficientNetB0's depthwise separable convolutions are parameter-efficient: unfreezing 30% exposes ~3.1M trainable parameters. This percentage is higher than ResNet-50's 20% because EfficientNet's architecture couples features more tightly across layers through its compound scaling, making deeper adaptation beneficial. The selected percentage follows established fine-tuning practice (Tan & Le, 2019; Keras Transfer Learning Guide).

| Property | Value |
|---|---|
| Total parameters | 4,072,625 |
| Model file size | 40.03 MB |
| Phase 1 trainable | 20,494 (0.08%) |
| Phase 2 trainable | 3,099,626 (76.1%) |
| Layers unfrozen (Phase 2) | 72 of 238 (30%) |
| Pretrained | ImageNet |

### ResNet-50

*Notebook: `05_resnet50_training.ipynb`*

ResNet-50 pretrained on ImageNet, adapted with a deeper classification head than EfficientNetB0 to match its larger backbone capacity: GlobalAveragePooling2D → Batch Norm → Dropout(0.3) → Dense(256) → Batch Norm → Dropout(0.3) → Dense(14, softmax). The intermediate Dense(256) layer provides a bottleneck appropriate for a 24M-parameter backbone.

**Fine-tuning depth: top 20% of the base (35 of 175 layers unfrozen at Phase 2).**

ResNet-50 uses standard convolutions with high parameter density per layer. Unfreezing 20% exposes ~15.5M trainable parameters — already five times more than EfficientNetB0's 30% unfreeze. A more conservative percentage preserves the low-level ImageNet representations in the early layers, which transfer broadly across vision tasks and do not need domain-specific refinement (Yosinski et al., 2014).

| Property | Value |
|---|---|
| Total parameters | 24,125,070 |
| Model file size | 211.03 MB |
| Phase 1 trainable | 532,750 (2.2%) |
| Phase 2 trainable | 15,510,798 (64.3%) |
| Layers unfrozen (Phase 2) | 35 of 175 (20%) |
| Pretrained | ImageNet |

---

## Results

### Overall Performance

| Metric | Custom CNN | EfficientNetB0 | ResNet-50 |
|---|---|---|---|
| Test Accuracy | 98.34% | 99.75% | **99.77%** |
| Test Loss | 0.0485 | 0.0207 | **0.0128** |
| Macro Precision | 0.9746 | 0.9977 | 0.9974 |
| Macro Recall | 0.9911 | 0.9968 | 0.9973 |
| Macro F1 | 0.9823 | 0.9972 | **0.9973** |
| Total Epochs | 81 | 42 | 32 |
| Best Epoch | 60 | 40 | 28 |
| Training Time | ~24.8 h | 10.96 h | 8.13 h |

### Statistical Significance (Wilson Score 95% CI)

With 18,141 test samples, accuracy confidence intervals are tight:

| Model | Accuracy | 95% CI (Wilson) |
|---|---|---|
| Custom CNN | 98.34% | [98.14%, 98.52%] |
| EfficientNetB0 | 99.75% | [99.67%, 99.81%] |
| ResNet-50 | 99.77% | [99.69%, 99.83%] |

**Custom CNN vs. transfer models:** Non-overlapping confidence intervals. The ~1.4–1.8% gap is statistically significant.

**EfficientNetB0 vs. ResNet-50:** Overlapping confidence intervals. The 0.02% difference is within statistical noise and should not be used to favour one model over the other on accuracy grounds alone (Agresti & Coull, 1998).

### Per-Class F1 Scores

| Class | Custom CNN | EfficientNetB0 | ResNet-50 |
|---|---|---|---|
| apple | 0.9825 | 0.9973 | 0.9977 |
| **banana** | **0.9070** | 0.9865 | 0.9904 |
| bell\_pepper\_green | 1.0000 | 1.0000 | 1.0000 |
| bell\_pepper\_red | 1.0000 | 1.0000 | 1.0000 |
| carrot | 1.0000 | 1.0000 | 1.0000 |
| cucumber | 0.9998 | 1.0000 | 1.0000 |
| **grape** | **0.9359** | 0.9888 | 0.9893 |
| lemon | 1.0000 | 1.0000 | 1.0000 |
| onion | 1.0000 | 1.0000 | 1.0000 |
| orange | 1.0000 | 1.0000 | 1.0000 |
| peach | 1.0000 | 1.0000 | 1.0000 |
| potato | 1.0000 | 1.0000 | 1.0000 |
| **strawberry** | **0.9272** | 0.9888 | 0.9852 |
| tomato | 1.0000 | 1.0000 | 1.0000 |

Ten of fourteen classes achieve F1 = 1.000 across all three architectures. The differentiation lives in three visually similar classes: banana, grape, and strawberry.

### Efficiency Trade-offs

| Metric | Custom CNN | EfficientNetB0 | ResNet-50 |
|---|---|---|---|
| Parameters | 4.96M | **4.07M** | 24.13M |
| Model size | 56.9 MB | **40.0 MB** | 211.0 MB |
| Single-image inference | **64.97 ms** | 68.70 ms | 68.23 ms |
| Batch inference (per image) | **7.09 ms** | 14.10 ms | 10.10 ms |

All three models have comparable single-image inference latency (~65–69 ms), meaning inference speed alone does not distinguish them at deployment time. Model size is a more meaningful differentiator, particularly for Experiment 3's mobile/edge deployment context.

---

## Analysis and Discussion

### Why Transfer Learning Wins

The Custom CNN reaches 98.34% overall, which on its own is an impressive result for a model trained from scratch on 84,582 images. But the per-class breakdown reveals where it struggles: banana (F1 = 0.907), strawberry (F1 = 0.927), and grape (F1 = 0.936) all show low precision with high recall. The pattern is consistent — the model learns to recall those classes well but generates false positives by misclassifying visually similar items as banana, strawberry, or grape.

The underlying reason is the nature of the features available to a from-scratch model. At 84K training images, the Custom CNN develops robust representations for colour and gross shape, but lacks the fine-grained texture and surface-detail features needed to cleanly separate, for instance, red grapes from certain apple varieties, or green grapes from bell peppers of similar colour and form. These distinctions require richer representations than the dataset alone can furnish.

Both transfer learning models resolve this immediately — their F1 scores on all three weak classes jump above 0.985. ImageNet pretraining provides exactly the low- and mid-level feature vocabulary (edge directions, texture gradients, surface normals) that the Custom CNN has to learn from scratch and does not fully acquire.

### Understanding the Training Curves

**EfficientNetB0 and ResNet-50** both show a characteristic dip in validation metrics at the Phase 1 → Phase 2 transition (epoch 10–11). This is the direct consequence of unfreezing previously frozen weights: millions of parameters suddenly become active, temporarily destabilising the model's learned representations before the lower learning rate guides them back to a stable, task-adapted configuration. This is a known and expected behaviour in two-phase fine-tuning (Yosinski et al., 2014; Lee et al., 2022). Patience 15 was set specifically to accommodate this.

**Custom CNN** shows volatile oscillations in the validation metrics between epochs 5 and 25. Training from scratch with a 113:1 class imbalance and corresponding class weights means that a single bad batch heavily populated by minority-class samples can spike the weighted loss dramatically. The model has not yet built stable intermediate representations, so it reacts strongly to each outlier batch. After epoch 30, as the feature representations mature and stabilise, the curves smooth out and convergence becomes steady.

### The Convergence Efficiency Gap

Beyond final accuracy, the training efficiency picture is stark. ResNet-50 converges in 32 total epochs; EfficientNetB0 in 42; Custom CNN requires 81 — more than twice as long as ResNet-50 and nearly double EfficientNetB0. This reflects the advantage of starting from a pre-adapted feature space rather than random initialisation.

---

## Model Selection for Experiment 2

The selection criterion for Experiment 2 is explicitly stated as the optimal accuracy-efficiency trade-off, not the raw accuracy maximum.

ResNet-50 achieves 99.77% — 0.02% above EfficientNetB0's 99.75%. With 18,141 test samples, the Wilson 95% confidence intervals for both models overlap completely. This 0.02% difference is within statistical noise and cannot be used to meaningfully prefer ResNet-50 on accuracy grounds (Agresti & Coull, 1998; Goodfellow et al., 2016, Chapter 5.3).

When accuracy is statistically indistinguishable, the remaining criteria are deployment-relevant:

| Criterion | EfficientNetB0 | ResNet-50 | Winner |
|---|---|---|---|
| Model size | 40.0 MB | 211.0 MB | EfficientNetB0 (5.3×) |
| Parameters | 4.07M | 24.13M | EfficientNetB0 (5.9×) |
| Training time | 10.96 h | 8.13 h | ResNet-50 (1.3×) |
| Inference latency | 68.70 ms | 68.23 ms | Comparable |

In Experiment 2's Pipeline C (YOLO + CNN), the classifier runs once per bounding box crop. An image containing eight fruits produces eight CNN invocations. Deploying a 211 MB model in that loop — versus a 40 MB model with effectively identical classification performance — is not justifiable. The 5.3× size advantage and 5.9× parameter advantage compound with every inference call. On mobile or edge hardware (relevant for Experiment 3), the distinction is more pronounced still.

EfficientNetB0's design rationale reinforces this choice directly: Tan & Le (2019) demonstrate that compound scaling achieves comparable accuracy to ResNet-50 at a fraction of the parameters — a finding this experiment reproduces on a domain-specific dataset.

**EfficientNetB0 is selected as the classifier for Experiment 2.**

---

## Limitations and Threats to Validity

**Dataset ceiling effect.** The Fruits-360 and related sources use studio-quality images against plain backgrounds. This controlled environment compresses the performance differences between architectures — in real-world deployment, where produce appears under variable lighting, partial occlusion, and textured backgrounds, the gap between the Custom CNN and transfer learning models may be larger.

**Single data split.** Ideally, k-fold cross-validation (k = 5) would be used to produce robust variance estimates. However, five-fold cross-validation on this dataset across three models would require approximately 150+ GPU hours. Given compute constraints, a single large test split (n = 18,141) was used instead. The Wilson confidence intervals are tight, which partially compensates, but variance across splits remains unknown.

**Training time estimation for Custom CNN.** The Custom CNN training session was interrupted and resumed from a checkpoint. The total training time (~24.8 hours) is an extrapolation from recorded session durations. The ±10% variance should be noted when comparing training efficiency.

**Fine-tuning depth.** EfficientNetB0 unfreezes 30% of its base; ResNet-50 unfreezes 20%. These percentages follow established guidelines for their respective architectures and were not found via exhaustive search. Different unfreeze depths may yield modestly different results, though the pretrained feature quality is robust to these choices within a reasonable range.

**Inference benchmarking.** Inference times were measured on Colab instances, which are subject to variable load and thermal conditions. The reported latencies (~65–69 ms) should be treated as relative comparisons between architectures, not as absolute deployment benchmarks.

---

## How to Reproduce

All notebooks are designed to run on Google Colab with a GPU runtime. Select **Tesla T4** for consistency with the reported results.

Run notebooks in order:

| Step | Notebook | What it does | Outputs |
|---|---|---|---|
| 1 | `01_hardware_accelerator_benchmark.ipynb` | Benchmarks T4/L4/A100/CPU and justifies hardware selection | Benchmark table |
| 2 | `02_dataset_preparation.ipynb` | Downloads, maps, deduplicates, and splits the dataset | `snapshelf_dataset_14classes_deduped.zip`, `dataset_manifest.csv`, `class_weights.csv` |
| 3 | `03_custom_cnn_training.ipynb` | Trains the Custom VGG-style CNN from scratch | Saved model, training history |
| 4 | `04_efficientnet_training.ipynb` | Fine-tunes EfficientNetB0 (two-phase) | Saved model, training history |
| 5 | `05_resnet50_training.ipynb` | Fine-tunes ResNet-50 (two-phase) | Saved model, training history |
| 6 | `06_model_comparison.ipynb` | Statistical comparison, per-class analysis, model selection | Comparison CSVs, visualisations |

Each notebook includes a Google Drive mount step and path configuration cell at the top. Adjust paths to match your Drive structure before running.

---

## Requirements

```
tensorflow>=2.15
numpy
pandas
matplotlib
seaborn
scikit-learn
```

All dependencies are available in the standard Google Colab environment. No additional installation is required.

---

## References

Agresti, A. & Coull, B. A. (1998). Approximate is better than "exact" for interval estimation of binomial proportions. *The American Statistician*, 52(2), 119–126.

French, R. M. (1999). Catastrophic forgetting in connectionist networks. *Trends in Cognitive Sciences*, 3(4), 128–135.

Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*. MIT Press.

He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image recognition. *Proceedings of the IEEE CVPR*, 770–778. arXiv:1512.03385.

Lee, J. H., et al. (2022). Fine-tuning can distort pretrained features and underperform from-scratch training. *ICLR 2022*. arXiv:2202.10054.

Prechelt, L. (1997). Early stopping — but when? In *Neural Networks: Tricks of the Trade*, Springer, 55–69.

Tan, M. & Le, Q. V. (2019). EfficientNet: Rethinking model scaling for convolutional neural networks. *ICML 2019*. arXiv:1905.11946.

Yosinski, J., Clune, J., Bengio, Y., & Lipson, H. (2014). How transferable are features in deep neural networks? *NeurIPS 2014*. arXiv:1411.1792.

---

*Part of the SnapShelf project — MOD002691 Computing Project.*
