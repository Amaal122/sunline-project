from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis_client import redis_client

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    redis_status = "ok"

    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {e}"

    try:
        redis_client.ping()
    except Exception as e:
        redis_status = f"error: {e}"

    return {
        "status": "ok",
        "database": db_status,
        "redis": redis_status,
    }
