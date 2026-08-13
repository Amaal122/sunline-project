import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.product import Product
from app.models.user import User
from app.models.wishlist import Wishlist
from app.schemas.product import ProductImageOut, ProductListOut
from app.schemas.wishlist import WishlistOut

router = APIRouter(tags=["wishlist"])


def product_list_out(product: Product) -> ProductListOut:
    primary = next((img for img in product.images if img.is_primary), None)
    if not primary and product.images:
        primary = product.images[0]
    active_variants = [
        variant for variant in product.variants if variant.stock_quantity > 0
    ]
    return ProductListOut(
        id=product.id,
        name=product.name,
        slug=product.slug,
        fit=product.fit,
        base_price=product.base_price,
        compare_at_price=product.compare_at_price,
        is_active=product.is_active,
        primary_image=ProductImageOut.model_validate(primary) if primary else None,
        available_colors=sorted({variant.color for variant in active_variants}),
        available_sizes=sorted({variant.size for variant in active_variants}),
        first_available_variant_id=active_variants[0].id if active_variants else None,
    )


@router.get("", response_model=WishlistOut)
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.execute(
            select(Wishlist)
            .where(Wishlist.user_id == current_user.id)
            .options(
                selectinload(Wishlist.product).selectinload(Product.images),
                selectinload(Wishlist.product).selectinload(Product.variants),
            )
        )
        .scalars()
        .all()
    )
    products = [row.product for row in rows if row.product and row.product.is_active]

    return WishlistOut(
        product_ids=[product.id for product in products],
        products=[product_list_out(product) for product in products],
    )


@router.post(
    "/items/{product_id}",
    response_model=WishlistOut,
    status_code=status.HTTP_201_CREATED,
)
def add_wishlist_item(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.execute(
        select(Product).where(Product.id == product_id)
    ).scalar_one_or_none()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    db.add(Wishlist(user_id=current_user.id, product_id=product.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()

    return get_wishlist(db, current_user)


@router.delete("/items/{product_id}", response_model=WishlistOut)
def remove_wishlist_item(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.execute(
        select(Wishlist).where(
            Wishlist.user_id == current_user.id,
            Wishlist.product_id == product_id,
        )
    ).scalar_one_or_none()
    if row:
        db.delete(row)
        db.commit()

    return get_wishlist(db, current_user)
