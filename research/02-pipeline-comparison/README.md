# Food Detection Pipeline Comparison

Research comparison of two food detection approaches:
- **System A (LLM-only)**: Full image → GPT-4o Vision → All items
- **System B (YOLO+LLM)**: YOLO regions → GPT-4o per crop → Aggregated items

## Setup

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Download YOLO model
# Place yolov8s.pt in project root

# Configure API key
cp .env.example .env
# Edit .env with your OpenAI API key
```

## Usage

```bash
python main.py llm <image_path>        # System A
python main.py yolo-llm <image_path>   # System B
```

## Output Schema

```json
{
  "items": [
    {"name": "apple", "state": "fresh"},
    {"name": "milk", "state": "packaged"}
  ],
  "meta": {
    "pipeline": "llm",
    "image": "groceries.jpg"
  }
}
```

## State Values

- `fresh` - Raw produce, unpackaged
- `packaged` - In container/wrapper
- `cooked` - Prepared food
- `unknown` - Cannot determine
