import secrets
import uuid
from decimal import Decimal

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.cart_item import CartItem
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.user import User
from app.schemas.order import CheckoutIn
from app.services.cart import (
    DELIVERY_FEE,
    FREE_DELIVERY_THRESHOLD,
    assert_stock,
    clear_guest_cart,
    get_existing_session_key,
    get_user_cart,
    read_guest_cart,
)


class EmptyCartError(HTTPException):
    def __init__(self):
        super().__init__(status_code=400, detail="Your cart is empty")


def _generate_order_number(db: Session) -> str:
    """SL + 6 digits, matching the brand's existing order-number style.
    Retries on the rare collision rather than trusting randomness alone."""
    for _ in range(10):
        candidate = f"SL{secrets.randbelow(900000) + 100000}"
        exists = db.execute(
            select(Order.id).where(Order.order_number == candidate)
        ).scalar_one_or_none()
        if not exists:
            return candidate
    # Astronomically unlikely, but fail loudly rather than silently collide
    raise HTTPException(status_code=500, detail="Could not generate a unique order number")


def _resolve_checkout_lines(
    db: Session, current_user: User | None, request: Request
) -> list[tuple[ProductVariant, int]]:
    """Returns [(variant, quantity), ...] for whichever cart applies —
    logged-in user's DB cart, or guest's Redis session cart. Mirrors the
    dual-path pattern in app/routers/cart.py exactly.

    Variant rows are re-fetched with FOR UPDATE so stock is row-locked
    for the duration of this transaction — two simultaneous checkouts
    on the last unit can no longer both pass validation."""

    if current_user:
        cart = get_user_cart(db, current_user)
        quantities_by_variant_id = {
            item.variant.id: item.quantity
            for item in cart.items
            if item.variant and item.variant.product and item.variant.product.is_active
        }
        if not quantities_by_variant_id:
            raise EmptyCartError()
    else:
        session_key = get_existing_session_key(request)
        guest_items = read_guest_cart(session_key)
        if not guest_items:
            raise EmptyCartError()

        variant_ids = [uuid.UUID(vid) for vid in guest_items]
        active_variants = db.execute(
            select(ProductVariant.id)
            .join(Product)
            .where(ProductVariant.id.in_(variant_ids), Product.is_active.is_(True))
        ).scalars().all()
        quantities_by_variant_id = {
            vid: guest_items[str(vid)] for vid in active_variants
        }
        if not quantities_by_variant_id:
            raise EmptyCartError()

    # Single locked query for every variant in the order — holds row
    # locks until commit/rollback, so a concurrent checkout on the same
    # variant blocks here instead of racing past assert_stock.
    locked_variants = db.execute(
        select(ProductVariant)
        .where(ProductVariant.id.in_(quantities_by_variant_id.keys()))
        .options(selectinload(ProductVariant.product))
        .with_for_update()
    ).scalars().all()

    return [(variant, quantities_by_variant_id[variant.id]) for variant in locked_variants]


def create_order_from_cart(
    db: Session, current_user: User | None, request: Request, payload: CheckoutIn
) -> Order:
    lines = _resolve_checkout_lines(db, current_user, request)

    # Stock is now locked (FOR UPDATE) as of the query inside
    # _resolve_checkout_lines — this check happens while holding those
    # locks, so no other transaction can shrink stock_quantity underneath us.
    for variant, quantity in lines:
        assert_stock(variant, quantity)

    subtotal = sum(
        ((variant.price_override or variant.product.base_price) * quantity for variant, quantity in lines),
        Decimal("0.00"),
    )
    delivery_fee = Decimal("0.00") if subtotal >= FREE_DELIVERY_THRESHOLD else DELIVERY_FEE
    total = subtotal + delivery_fee

    order = Order(
        order_number=_generate_order_number(db),
        user_id=current_user.id if current_user else None,
        status=OrderStatus.pending,
        payment_method=payload.payment_method,
        payment_status=PaymentStatus.unpaid,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=total,
        full_name=payload.full_name,
        phone=payload.phone,
        address_line=payload.address_line,
        city=payload.city,
        governorate=payload.governorate,
        postal_code=payload.postal_code,
    )
    db.add(order)
    db.flush()  # assigns order.id without committing yet

    try:
        for variant, quantity in lines:
            unit_price = variant.price_override or variant.product.base_price
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_variant_id=variant.id,
                    product_name=variant.product.name,
                    color=variant.color,
                    size=variant.size,
                    unit_price=unit_price,
                    quantity=quantity,
                )
            )
            variant.stock_quantity -= quantity  # deduct stock atomically with order creation

        db.flush()

        if current_user:
            cart = get_user_cart(db, current_user)
            db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        else:
            clear_guest_cart(get_existing_session_key(request))

        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Order could not be completed — please try again")
    except Exception:
        db.rollback()
        raise

    # Explicit eager-load instead of db.refresh(order) + lazy access —
    # guarantees order.items is fully populated in this object regardless
    # of when the request-scoped session eventually closes, so response
    # serialization never depends on session lifecycle timing.
    return db.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items))
    ).scalar_one()


def list_user_orders(db: Session, user: User) -> list[Order]:
    return (
        db.execute(
            select(Order)
            .where(Order.user_id == user.id)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
        )
        .scalars()
        .all()
    )


def get_order_by_number(db: Session, order_number: str, current_user: User | None) -> Order:
    order = db.execute(
        select(Order)
        .where(Order.order_number == order_number)
        .options(selectinload(Order.items))
    ).scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Orders placed while logged in are private to that account. Guest
    # orders (user_id is None) act like a receipt — knowing the order
    # number is enough, same as most e-commerce guest-checkout flows.
    if order.user_id is not None:
        if not current_user or current_user.id != order.user_id:
            raise HTTPException(status_code=404, detail="Order not found")

    return order
