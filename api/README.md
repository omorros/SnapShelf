# SnapShelf API

The backend for SnapShelf: FastAPI, SQLAlchemy and PostgreSQL. It turns photos and barcodes into
draft items, keeps the confirmed inventory, predicts expiry dates and suggests recipes.

## Run it

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # runs on SQLite as is; fill in the rest below
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Tables are created on startup. Interactive docs are at `http://localhost:8000/docs`.

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Defaults to `sqlite:///./snapshelf.db`. Use a `postgresql://` URL for real use (driver: psycopg 3) |
| `JWT_SECRET_KEY` | Signs login tokens. Use a long random string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime, default 30 |
| `OPENAI_API_KEY` | Needed for photo scanning and recipe ideas |
| `OPENAI_VISION_MODEL` | Vision model for photo scanning, default `gpt-5.2` (the one the research selected) |
| `SQL_ECHO` | Set to `1` to log every SQL statement |

## Test it

```bash
pytest          # from the repo root or from api/
```

52 tests: unit tests for ingestion and expiry prediction, plus API tests that run the real app
against a throwaway SQLite database. The OpenAI calls are mocked, so no API key or Postgres is
needed.

## How it works

### AI suggests, you decide

Everything the AI produces is stored as a **draft**. It only becomes inventory when the user
confirms it, and there is no other way in.

| | `DraftItem` | `InventoryItem` |
|---|---|---|
| Trust | Untrusted, from AI or quick entry | Trusted, confirmed by the user |
| Required fields | Only `name` | All of them |
| Extra | `source`, `confidence_score`, `notes` | |
| Created by | Photo scan, barcode, manual entry | `POST /api/draft-items/{id}/confirm` only |

### From a photo to drafts

`POST /api/ingest/image` sends the photo to the vision model with a prompt that asks for each
food item's name, category, quantity and unit as JSON (`app/services/ingestion/vision_client.py`).
The response is normalised to the app's categories and units, each item gets a predicted expiry
date, and the results are saved as drafts (`image_ingestion.py`).

### Barcodes

`GET /api/ingest/barcode/{barcode}` looks the product up on Open Food Facts, maps it to a
category and predicts its expiry.

### Expiry prediction

A rule-based strategy (`app/services/expiry_prediction/strategies/rule_based.py`) maps
category and storage location to a shelf life and a confidence, for example dairy in the fridge
lasts 7 days (0.85) and meat in the freezer 90 days (0.90). Unknown combinations fall back to a
storage default, then to 7 days at low confidence. Every prediction carries a short reasoning
string. The service uses a strategy pattern, so a learned model can be added next to the rules.

### Recipes

`POST /api/recipes/generate` asks an OpenAI model (`gpt-4o-mini`) for recipes built around what
is about to expire ("auto" mode) or around ingredients the user picks ("manual" mode). Each
ingredient is marked as in the inventory, expiring soon, or missing.

## Endpoints

Everything except register, login, health and the standalone expiry prediction needs
`Authorization: Bearer <token>`.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/auth/register` | Create an account, returns a token |
| `POST` | `/auth/login` | Log in, returns a token |
| `GET` | `/auth/me` | Current user |
| `POST` | `/api/ingest/image` | Photo in, detected items saved as drafts |
| `GET` | `/api/ingest/barcode/{barcode}` | Look up a product and predict its expiry |
| `POST` | `/api/ingest/barcode` | Read a barcode from an uploaded image (needs Java for pyzxing) |
| `GET`, `POST` | `/api/draft-items` | List or create drafts |
| `GET`, `PATCH`, `DELETE` | `/api/draft-items/{id}` | Read, edit or discard a draft |
| `POST` | `/api/draft-items/{id}/confirm` | Promote a draft to the inventory |
| `GET` | `/api/inventory` | List the inventory, sorted by expiry |
| `GET`, `PUT`, `DELETE` | `/api/inventory/{id}` | Read, update or remove an item |
| `PATCH` | `/api/inventory/{id}/quantity` | Change only the quantity |
| `POST` | `/api/expiry-prediction` | Predict an expiry date on its own |
| `POST` | `/api/recipes/generate` | Recipe ideas from the inventory |
| `GET` | `/api/recipes/expiring-ingredients` | Items expiring within N days |
| `GET`, `POST` | `/api/recipes/saved` | List or save recipes |
| `DELETE` | `/api/recipes/saved/{id}` | Remove a saved recipe |
| `GET` | `/health` | Health check |

## Layout

```
api/
├── app/
│   ├── core/            config, database, JWT and password hashing
│   ├── models/          SQLAlchemy models: User, DraftItem, InventoryItem, SavedRecipe
│   ├── schemas/         Pydantic request and response models
│   ├── routers/         auth, draft items, inventory, ingestion, expiry, recipes
│   └── services/
│       ├── ingestion/          vision client, image and barcode ingestion, Open Food Facts
│       ├── expiry_prediction/  strategy-based expiry service
│       └── recipe/             recipe generation
├── tests/
└── requirements.txt
```
