from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")

# Routers land here as each phase is built:
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(products.router, prefix="/api/products", tags=["products"])
# app.include_router(cart.router, prefix="/api/cart", tags=["cart"])
# app.include_router(orders.router, prefix="/api/orders", tags=["orders"])


@app.get("/")
def root():
    return {"message": "SUNLINE API is running", "docs": "/docs"}
