# CNN Food Image Classification

A comparative study of Convolutional Neural Network architectures for food image classification, achieving **99.76% accuracy** on a 14-class dataset.

## Overview

This project compares three CNN approaches for classifying fruits and vegetables:

- **Custom CNN** - Built from scratch (VGG-style architecture)
- **EfficientNetB0** - Transfer learning from ImageNet
- **ResNet-50** - Transfer learning from ImageNet

All models are trained under identical conditions to ensure fair comparison.

## Dataset

| Property | Value |
|----------|-------|
| Total Images | 120,842 (deduplicated) |
| Classes | 14 |
| Train / Val / Test | 84,582 / 18,119 / 18,141 |
| Image Size | 224×224 RGB |
| Class Imbalance | 113:1 (handled via class weights) |

**Classes:** Apple, Banana, Bell Pepper (Red/Green), Carrot, Cucumber, Grape, Lemon, Onion, Orange, Peach, Potato, Strawberry, Tomato

The dataset was compiled from three Kaggle sources with SHA-256 deduplication and stratified splitting to prevent data leakage.

## Results

| Model | Test Accuracy | Parameters | Size | Training Time |
|-------|---------------|------------|------|---------------|
| Custom CNN | 97.97% | 4.96M | 56.9 MB | 14.8h |
| EfficientNetB0 | 99.75% | 4.07M | 40.0 MB | 6.7h |
| **ResNet-50** | **99.76%** | 24.13M | 211.0 MB | 10.3h |

### Key Findings

1. **Transfer learning wins** - Pretrained models outperform custom CNN by ~1.8 percentage points
2. **EfficientNetB0 is optimal** - Matches ResNet-50 accuracy while being 5.9x smaller and 35% faster to train
3. **Custom CNN is viable** - 97.97% accuracy shows domain-specific architectures work without pretrained weights
4. **Class imbalance handled well** - All models maintain >0.98 F1 on minority classes

## Notebooks

Run in order:

| # | Notebook | Description |
|---|----------|-------------|
| 1 | `01_dataset_preparation.ipynb` | Merge sources, deduplicate, split dataset |
| 2 | `02_custom_cnn_training.ipynb` | Train VGG-style CNN from scratch |
| 3 | `03_efficientnet_training.ipynb` | Fine-tune EfficientNetB0 |
| 4 | `04_resnet50_training.ipynb` | Fine-tune ResNet-50 |
| 5 | `05_model_comparison.ipynb` | Compare all models, generate visualizations |

## Requirements

```
tensorflow>=2.15
numpy
pandas
matplotlib
seaborn
scikit-learn
```

Notebooks are designed to run on Google Colab with GPU runtime.

## Project Structure

```
├── notebooks/
│   ├── 01_dataset_preparation.ipynb
│   ├── 02_custom_cnn_training.ipynb
│   ├── 03_efficientnet_training.ipynb
│   ├── 04_resnet50_training.ipynb
│   └── 05_model_comparison.ipynb
└── README.md
```

## License

MIT
