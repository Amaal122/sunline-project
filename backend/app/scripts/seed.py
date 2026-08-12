import uuid
from decimal import Decimal
from app.core.database import SessionLocal
from app.models.product import Product, FitType
from app.models.product_variant import ProductVariant
from app.models.product_image import ProductImage

db = SessionLocal()

try:
    # clear existing test data (safe to rerun this script)
    db.query(ProductImage).delete()
    db.query(ProductVariant).delete()
    db.query(Product).delete()
    db.commit()

    p1 = Product(
        id=uuid.uuid4(),
        name="Étoile High-Rise Straight",
        slug="etoile-high-rise-straight",
        description="A timeless straight-leg fit in soft washed denim.",
        fit=FitType.straight,
        base_price=Decimal("189.00"),
        compare_at_price=Decimal("229.00"),
        is_active=True,
        care_instructions="Machine wash cold, inside out.",
    )
    p2 = Product(
        id=uuid.uuid4(),
        name="Lune Wide-Leg",
        slug="lune-wide-leg",
        description="Relaxed wide-leg silhouette with a high rise.",
        fit=FitType.wide_leg,
        base_price=Decimal("205.00"),
        compare_at_price=None,
        is_active=True,
        care_instructions="Machine wash cold, inside out.",
    )

    db.add_all([p1, p2])
    db.flush()  # so p1.id / p2.id are usable below before commit

    variants = [
        ProductVariant(product_id=p1.id, color="Indigo", size="36", sku="ETO-IND-36", stock_quantity=12),
        ProductVariant(product_id=p1.id, color="Indigo", size="38", sku="ETO-IND-38", stock_quantity=0),
        ProductVariant(product_id=p1.id, color="Black", size="36", sku="ETO-BLK-36", stock_quantity=5),
        ProductVariant(product_id=p2.id, color="Ecru", size="38", sku="LUN-ECR-38", stock_quantity=8),
        ProductVariant(product_id=p2.id, color="Ecru", size="40", sku="LUN-ECR-40", stock_quantity=3),
    ]

    images = [
        ProductImage(product_id=p1.id, url="https://placehold.co/600x800?text=Etoile+1", alt_text="Étoile front", position=0, is_primary=True),
        ProductImage(product_id=p1.id, url="https://placehold.co/600x800?text=Etoile+2", alt_text="Étoile back", position=1, is_primary=False),
        ProductImage(product_id=p2.id, url="https://placehold.co/600x800?text=Lune+1", alt_text="Lune front", position=0, is_primary=True),
    ]

    db.add_all(variants + images)
    db.commit()

    print(f"Seeded 2 products: {p1.slug}, {p2.slug}")

finally:
    db.close()