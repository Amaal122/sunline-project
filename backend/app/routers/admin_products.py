import uuid

import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_admin_user
import app.core.cloudinary_client  # noqa — ensures cloudinary.config() runs
from app.models.user import User
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.product_variant import ProductVariant
from app.schemas.product import (
    ProductImageOut,
    ProductCreateIn,
    ProductVariantCreateIn,
    ProductDetailOut,
    ProductListOut,
    ProductVariantOut,
)
from app.schemas.admin import ProductUpdateIn, ProductVariantUpdateIn

router = APIRouter(prefix="/admin/products", tags=["admin"])


def _product_or_404(db: Session, product_id: uuid.UUID) -> Product:
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .options(selectinload(Product.variants), selectinload(Product.images))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ---------------------------------------------------------------------
# LIST / DETAIL — admin sees everything, including inactive products,
# unlike the public /api/products which filters to is_active only.
# ---------------------------------------------------------------------
@router.get("", response_model=list[ProductListOut])
def list_all_products(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    products = (
        db.query(Product)
        .options(selectinload(Product.variants), selectinload(Product.images))
        .order_by(Product.created_at.desc())
        .all()
    )
    return [_to_list_out(p) for p in products]


def _to_list_out(product: Product) -> ProductListOut:
    primary = next((i for i in product.images if i.is_primary), None) or (
        product.images[0] if product.images else None
    )
    return ProductListOut(
        id=product.id,
        name=product.name,
        slug=product.slug,
        fit=product.fit,
        base_price=product.base_price,
        compare_at_price=product.compare_at_price,
        is_active=product.is_active,
        primary_image=ProductImageOut.model_validate(primary) if primary else None,
        available_colors=list({v.color for v in product.variants}),
        available_sizes=list({v.size for v in product.variants}),
        first_available_variant_id=next(
            (v.id for v in product.variants if v.stock_quantity > 0), None
        ),
    )


@router.get("/{product_id}", response_model=ProductDetailOut)
def get_product_admin(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    return _product_or_404(db, product_id)


# ---------------------------------------------------------------------
# CREATE — unchanged from what you already had
# ---------------------------------------------------------------------
@router.post("", response_model=ProductDetailOut, status_code=201)
def create_product(
    payload: ProductCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    existing = db.query(Product).filter(Product.slug == payload.slug).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="A product with this slug already exists"
        )

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


# ---------------------------------------------------------------------
# UPDATE / DELETE product
# ---------------------------------------------------------------------
@router.patch("/{product_id}", response_model=ProductDetailOut)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    product = _product_or_404(db, product_id)

    if payload.slug and payload.slug != product.slug:
        clash = db.query(Product).filter(Product.slug == payload.slug).first()
        if clash:
            raise HTTPException(status_code=400, detail="A product with this slug already exists")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    product = _product_or_404(db, product_id)
    try:
        db.delete(product)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This product has existing orders and can't be deleted. "
            "Set it inactive instead (PATCH is_active: false) to hide it from the shop.",
        )
    return None


# ---------------------------------------------------------------------
# VARIANTS
# ---------------------------------------------------------------------
@router.post(
    "/{product_id}/variants", response_model=ProductVariantOut, status_code=201
)
def create_product_variant(
    product_id: uuid.UUID,
    payload: ProductVariantCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = (
        db.query(ProductVariant).filter(ProductVariant.sku == payload.sku).first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="A variant with this SKU already exists"
        )

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


@router.patch("/{product_id}/variants/{variant_id}", response_model=ProductVariantOut)
def update_product_variant(
    product_id: uuid.UUID,
    variant_id: uuid.UUID,
    payload: ProductVariantUpdateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.id == variant_id, ProductVariant.product_id == product_id)
        .first()
    )
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    if payload.sku and payload.sku != variant.sku:
        clash = db.query(ProductVariant).filter(ProductVariant.sku == payload.sku).first()
        if clash:
            raise HTTPException(status_code=400, detail="A variant with this SKU already exists")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, field, value)

    db.commit()
    db.refresh(variant)
    return variant


@router.delete("/{product_id}/variants/{variant_id}", status_code=204)
def delete_product_variant(
    product_id: uuid.UUID,
    variant_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.id == variant_id, ProductVariant.product_id == product_id)
        .first()
    )
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    try:
        db.delete(variant)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This variant has existing orders and can't be deleted. "
            "Set its stock to 0 instead to stop it selling.",
        )
    return None


# ---------------------------------------------------------------------
# IMAGES
# ---------------------------------------------------------------------
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

    db.query(ProductImage).filter(
        ProductImage.product_id == product_id,
        ProductImage.cloudinary_public_id.is_(None),
    ).delete(synchronize_session=False)

    if is_primary:
        db.query(ProductImage).filter(ProductImage.product_id == product_id).update(
            {"is_primary": False}
        )

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


@router.delete("/{product_id}/images/{image_id}", status_code=204)
def delete_product_image(
    product_id: uuid.UUID,
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    image = (
        db.query(ProductImage)
        .filter(ProductImage.id == image_id, ProductImage.product_id == product_id)
        .first()
    )
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    if image.cloudinary_public_id:
        try:
            cloudinary.uploader.destroy(image.cloudinary_public_id)
        except Exception:
            # Don't block the DB delete on Cloudinary being flaky — an
            # orphaned Cloudinary asset is a much smaller problem than
            # a stuck admin panel.
            pass

    db.delete(image)
    db.commit()

    # Re-sequence remaining images so ordering stays contiguous
    remaining = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.position)
        .all()
    )
    for index, existing_image in enumerate(remaining):
        existing_image.position = index
    db.commit()

    return None
