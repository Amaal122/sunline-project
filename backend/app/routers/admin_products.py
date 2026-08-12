import uuid

import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin_user
import app.core.cloudinary_client  # noqa — ensures cloudinary.config() runs
from app.models.user import User
from app.models.product import Product
from app.models.product_image import ProductImage
from app.schemas.product import (
    ProductImageOut,
    ProductCreateIn,
    ProductVariantCreateIn,
    ProductDetailOut,
    ProductVariantOut,
)
from app.models.product_variant import ProductVariant
router = APIRouter(prefix="/admin/products", tags=["admin"])


@router.post("/{product_id}/images", response_model=ProductImageOut)
def upload_product_image(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    alt_text: str = Form(None),
    is_primary: bool = Form(False),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    result = cloudinary.uploader.upload(
        file.file,
        folder="sunline/products",
        resource_type="image",
    )

    # A real Cloudinary image now exists for this product — any leftover
    # seed placeholders (cloudinary_public_id IS NULL) are dead weight
    # that would otherwise sit at low `position` values and get shown
    # instead of real photos. Clear them out now, not later.
    db.query(ProductImage).filter(
        ProductImage.product_id == product_id,
        ProductImage.cloudinary_public_id.is_(None),
    ).delete(synchronize_session=False)

    if is_primary:
        db.query(ProductImage).filter(
            ProductImage.product_id == product_id
        ).update({"is_primary": False})

    # Re-sequence remaining real images to be contiguous (0, 1, 2, ...)
    # so deleted placeholders never leave gaps or stale ordering behind.
    remaining = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.position)
        .all()
    )
    for index, existing_image in enumerate(remaining):
        existing_image.position = index

    image = ProductImage(
        product_id=product_id,
        url=result["secure_url"],
        cloudinary_public_id=result["public_id"],
        alt_text=alt_text,
        position=len(remaining),
        is_primary=is_primary,
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return image
@router.post("", response_model=ProductDetailOut, status_code=201)
def create_product(
    payload: ProductCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    existing = db.query(Product).filter(Product.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="A product with this slug already exists")

    product = Product(
        id=uuid.uuid4(),
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        fit=payload.fit,
        base_price=payload.base_price,
        compare_at_price=payload.compare_at_price,
        care_instructions=payload.care_instructions,
        is_active=payload.is_active,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.post("/{product_id}/variants", response_model=ProductVariantOut, status_code=201)
def create_product_variant(
    product_id: uuid.UUID,
    payload: ProductVariantCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(ProductVariant).filter(ProductVariant.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="A variant with this SKU already exists")

    variant = ProductVariant(
        id=uuid.uuid4(),
        product_id=product_id,
        color=payload.color,
        size=payload.size,
        sku=payload.sku,
        stock_quantity=payload.stock_quantity,
        price_override=payload.price_override,
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant