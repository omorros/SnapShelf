from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import engine, Base, get_db
from app.models import user, draft_item, inventory_item  # noqa: F401
from app.routers import draft_items, inventory_items


app = FastAPI(
    title="SnapShelf Backend",
    version="0.1.0",
    description="AI-assisted food waste reduction through trusted inventory management"
)

# Register routers
app.include_router(draft_items.router, prefix="/api")
app.include_router(inventory_items.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/db-test")
def db_test(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).scalar()
    return {"db_response": result}

