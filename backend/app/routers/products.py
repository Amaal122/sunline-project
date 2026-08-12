from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select,text
from app.core.database import get_db
from app.models.product import Product, FitType
from app.models.product_variant import ProductVariant
from app.schemas.product import ProductListOut, ProductDetailOut, ProductImageOut

router = APIRouter(tags=["products"])


@router.get("", response_model=list[ProductListOut])
def list_products(
    db: Session = Depends(get_db),
    fit: Optional[FitType] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    color: Optional[str] = Query(None),
    size: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    in_stock: bool = Query(False),
    sort: Literal["featured", "price-asc", "price-desc"] = Query("featured"),
):
    query = select(Product).where(Product.is_active == True).options(
        selectinload(Product.images),
        selectinload(Product.variants),
    )

    if fit:
        query = query.where(Product.fit == fit)
    if min_price is not None:
        query = query.where(Product.base_price >= min_price)
    if max_price is not None:
        query = query.where(Product.base_price <= max_price)
    if color:
        query = query.where(Product.variants.any(color=color))
    if size:
        query = query.where(Product.variants.any(size=size))
    if q:
        q_clean = q.strip()
        # Full-text match against the generated search_vector column —
        # handles French stemming and accented characters (fr_unaccent
        # config from the Phase 7 migration).
        query = query.where(
            text("products.search_vector @@ plainto_tsquery('fr_unaccent', :search_q)")
        )
        # Rank by relevance when actively searching, instead of the
        # default "featured" ordering — a match on `name` (weight A)
        # ranks above a match only in `description` (weight B).
        if sort == "featured":
            query = query.order_by(
                text("ts_rank(products.search_vector, plainto_tsquery('fr_unaccent', :search_q)) DESC")
            )
        query = query.params(search_q=q_clean)
    if in_stock:
        query = query.where(Product.variants.any(ProductVariant.stock_quantity > 0))
    if sort == "price-asc":
        query = query.order_by(Product.base_price.asc())
    elif sort == "price-desc":
        query = query.order_by(Product.base_price.desc())

    products = db.execute(query).scalars().unique().all()

    results = []
    for p in products:
        primary = next((img for img in p.images if img.is_primary), None)
        if not primary and p.images:
            primary = p.images[0]
        active_variants = [variant for variant in p.variants if variant.stock_quantity > 0]
        results.append(
            ProductListOut(
                id=p.id,
                name=p.name,
                slug=p.slug,
                fit=p.fit,
                base_price=p.base_price,
                compare_at_price=p.compare_at_price,
                is_active=p.is_active,
                primary_image=ProductImageOut.model_validate(primary) if primary else None,
                available_colors=sorted({variant.color for variant in active_variants}),
                available_sizes=sorted({variant.size for variant in active_variants}),
                first_available_variant_id=active_variants[0].id if active_variants else None,
            )
        )
    return results


@router.get("/{slug}", response_model=ProductDetailOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    query = select(Product).where(Product.slug == slug).options(
        selectinload(Product.images),
        selectinload(Product.variants),
    )
    product = db.execute(query).scalar_one_or_none()

    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    return product
