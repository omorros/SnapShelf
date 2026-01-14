from fastapi import FastAPI

from app.core.database import engine, Base
from app.models import user, draft_item, inventory_item  # noqa: F401
from app.routers import auth, draft_items, inventory_items, expiry_prediction, ingestion, recipes


app = FastAPI(
    title="SnapShelf Backend",
    version="0.1.0",
    description="AI-assisted food waste reduction through trusted inventory management"
)

# Register routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(draft_items.router, prefix="/api")
app.include_router(inventory_items.router, prefix="/api")
app.include_router(expiry_prediction.router, prefix="/api")
app.include_router(ingestion.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}

