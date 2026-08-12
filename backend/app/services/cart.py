import uuid
from decimal import Decimal

from fastapi import HTTPException, Request, Response
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.redis_client import redis_client
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.user import User
from app.schemas.cart import (
    CartLineOut,
    CartOut,
    CartProductOut,
    CartVariantOut,
)
from app.schemas.product import ProductImageOut

CART_COOKIE_NAME = "sunline_cart_session"
GUEST_CART_TTL_SECONDS = 60 * 60 * 24 * 30
FREE_DELIVERY_THRESHOLD = Decimal("200.00")
DELIVERY_FEE = Decimal("8.00")


def set_cart_session_cookie(response: Response, session_key: str) -> None:
    response.set_cookie(
        key=CART_COOKIE_NAME,
        value=session_key,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=GUEST_CART_TTL_SECONDS,
        path="/",
    )


def get_or_create_session_key(request: Request, response: Response) -> str:
    session_key = request.cookies.get(CART_COOKIE_NAME)
    if session_key:
        return session_key

    session_key = uuid.uuid4().hex
    set_cart_session_cookie(response, session_key)
    return session_key


def get_existing_session_key(request: Request) -> str | None:
    return request.cookies.get(CART_COOKIE_NAME)


def guest_cart_key(session_key: str) -> str:
    return f"guest_cart:{session_key}"


def read_guest_cart(session_key: str | None) -> dict[str, int]:
    if not session_key:
        return {}
    try:
        raw_items = redis_client.hgetall(guest_cart_key(session_key))
    except RedisError as exc:
        raise HTTPException(status_code=503, detail="Guest cart is temporarily unavailable") from exc

    return {variant_id: int(quantity) for variant_id, quantity in raw_items.items() if int(quantity) > 0}


def write_guest_cart_item(session_key: str, variant_id: uuid.UUID, quantity: int) -> None:
    key = guest_cart_key(session_key)
    try:
        if quantity <= 0:
            redis_client.hdel(key, str(variant_id))
        else:
            redis_client.hset(key, str(variant_id), quantity)
        redis_client.expire(key, GUEST_CART_TTL_SECONDS)
    except RedisError as exc:
        raise HTTPException(status_code=503, detail="Guest cart is temporarily unavailable") from exc


def increment_guest_cart_item(session_key: str, variant_id: uuid.UUID, quantity: int) -> None:
    key = guest_cart_key(session_key)
    try:
        next_quantity = redis_client.hincrby(key, str(variant_id), quantity)
        if next_quantity <= 0:
            redis_client.hdel(key, str(variant_id))
        redis_client.expire(key, GUEST_CART_TTL_SECONDS)
    except RedisError as exc:
        raise HTTPException(status_code=503, detail="Guest cart is temporarily unavailable") from exc


def clear_guest_cart(session_key: str | None) -> None:
    if not session_key:
        return
    try:
        redis_client.delete(guest_cart_key(session_key))
    except RedisError:
        return


def get_user_cart(db: Session, user: User) -> Cart:
    cart = db.execute(
        select(Cart)
        .where(Cart.user_id == user.id)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
            .selectinload(Product.images)
        )
    ).scalar_one_or_none()

    if cart:
        return cart

    cart = Cart(user_id=user.id)
    db.add(cart)
    db.flush()
    return cart


def get_variant_or_404(db: Session, variant_id: uuid.UUID) -> ProductVariant:
    variant = db.execute(
        select(ProductVariant)
        .where(ProductVariant.id == variant_id)
        .options(selectinload(ProductVariant.product).selectinload(Product.images))
    ).scalar_one_or_none()
    if not variant or not variant.product or not variant.product.is_active:
        raise HTTPException(status_code=404, detail="Product variant not found")
    return variant


def assert_stock(variant: ProductVariant, quantity: int) -> None:
    if quantity > variant.stock_quantity:
        raise HTTPException(status_code=400, detail="Requested quantity is not available")


def primary_image(product) -> ProductImageOut | None:
    image = next((item for item in product.images if item.is_primary), None)
    if not image and product.images:
        image = product.images[0]
    return ProductImageOut.model_validate(image) if image else None


def line_from_variant(variant: ProductVariant, quantity: int) -> CartLineOut:
    unit_price = variant.price_override or variant.product.base_price
    return CartLineOut(
        product_variant_id=variant.id,
        product=CartProductOut(
            id=variant.product.id,
            name=variant.product.name,
            slug=variant.product.slug,
            base_price=variant.product.base_price,
            compare_at_price=variant.product.compare_at_price,
            primary_image=primary_image(variant.product),
        ),
        variant=CartVariantOut.model_validate(variant),
        quantity=quantity,
        unit_price=unit_price,
        line_total=unit_price * quantity,
    )


def cart_out_from_lines(lines: list[CartLineOut]) -> CartOut:
    subtotal = sum((line.line_total for line in lines), Decimal("0.00"))
    delivery_fee = Decimal("0.00") if subtotal == 0 or subtotal >= FREE_DELIVERY_THRESHOLD else DELIVERY_FEE
    return CartOut(
        items=lines,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=subtotal + delivery_fee,
        count=sum(line.quantity for line in lines),
    )


def build_user_cart_out(cart: Cart) -> CartOut:
    lines = [
        line_from_variant(item.variant, item.quantity)
        for item in cart.items
        if item.variant and item.variant.product and item.variant.product.is_active
    ]
    return cart_out_from_lines(lines)


def build_guest_cart_out(db: Session, session_key: str | None) -> CartOut:
    items = read_guest_cart(session_key)
    if not items:
        return cart_out_from_lines([])

    variant_ids = [uuid.UUID(variant_id) for variant_id in items]
    variants = db.execute(
        select(ProductVariant)
        .where(ProductVariant.id.in_(variant_ids))
        .options(selectinload(ProductVariant.product).selectinload(Product.images))
    ).scalars().unique().all()

    lines = [
        line_from_variant(variant, min(items[str(variant.id)], variant.stock_quantity))
        for variant in variants
        if variant.stock_quantity > 0 and variant.product and variant.product.is_active
    ]
    return cart_out_from_lines(lines)


def upsert_user_cart_item(db: Session, user: User, variant: ProductVariant, quantity_delta: int) -> Cart:
    cart = get_user_cart(db, user)
    item = db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.product_variant_id == variant.id,
        )
    ).scalar_one_or_none()

    next_quantity = quantity_delta
    if item:
        next_quantity = item.quantity + quantity_delta
    assert_stock(variant, next_quantity)

    if item:
        item.quantity = next_quantity
    else:
        db.add(CartItem(cart_id=cart.id, product_variant_id=variant.id, quantity=next_quantity))

    db.commit()
    db.refresh(cart)
    return get_user_cart(db, user)


def set_user_cart_item_quantity(db: Session, user: User, variant: ProductVariant, quantity: int) -> Cart:
    cart = get_user_cart(db, user)
    item = db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.product_variant_id == variant.id,
        )
    ).scalar_one_or_none()

    if quantity <= 0:
        if item:
            db.delete(item)
    else:
        assert_stock(variant, quantity)
        if item:
            item.quantity = quantity
        else:
            db.add(CartItem(cart_id=cart.id, product_variant_id=variant.id, quantity=quantity))

    db.commit()
    return get_user_cart(db, user)


def merge_guest_cart_into_user_cart(db: Session, user: User, session_key: str | None) -> None:
    guest_items = read_guest_cart(session_key)
    if not guest_items:
        return

    cart = get_user_cart(db, user)
    variant_ids = [uuid.UUID(variant_id) for variant_id in guest_items]
    variants = db.execute(
        select(ProductVariant)
        .where(ProductVariant.id.in_(variant_ids))
        .options(selectinload(ProductVariant.product))
    ).scalars().unique().all()

    for variant in variants:
        if not variant.product or not variant.product.is_active or variant.stock_quantity <= 0:
            continue

        requested = guest_items[str(variant.id)]
        item = db.execute(
            select(CartItem).where(
                CartItem.cart_id == cart.id,
                CartItem.product_variant_id == variant.id,
            )
        ).scalar_one_or_none()

        if item:
            item.quantity = min(item.quantity + requested, variant.stock_quantity)
        else:
            db.add(
                CartItem(
                    cart_id=cart.id,
                    product_variant_id=variant.id,
                    quantity=min(requested, variant.stock_quantity),
                )
            )

    db.commit()
    clear_guest_cart(session_key)
