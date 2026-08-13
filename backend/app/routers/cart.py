import uuid

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_current_user
from app.models.user import User
from app.schemas.cart import CartItemIn, CartItemQuantityIn, CartOut
from app.services.cart import (
    build_guest_cart_out,
    build_user_cart_out,
    get_existing_session_key,
    get_or_create_session_key,
    get_user_cart,
    get_variant_or_404,
    increment_guest_cart_item,
    set_user_cart_item_quantity,
    write_guest_cart_item,
    assert_stock,
    read_guest_cart,
)

router = APIRouter(tags=["cart"])


@router.get("", response_model=CartOut)
def get_cart(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    if current_user:
        return build_user_cart_out(get_user_cart(db, current_user))

    return build_guest_cart_out(db, get_existing_session_key(request))


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    payload: CartItemIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    variant = get_variant_or_404(db, payload.product_variant_id)

    if current_user:
        from app.services.cart import upsert_user_cart_item

        return build_user_cart_out(
            upsert_user_cart_item(db, current_user, variant, payload.quantity)
        )

    session_key = get_or_create_session_key(request, response)
    current_items = read_guest_cart(session_key)
    next_quantity = current_items.get(str(variant.id), 0) + payload.quantity
    assert_stock(variant, next_quantity)
    increment_guest_cart_item(session_key, variant.id, payload.quantity)
    return build_guest_cart_out(db, session_key)


@router.put("/items/{variant_id}", response_model=CartOut)
def update_cart_item(
    variant_id: uuid.UUID,
    payload: CartItemQuantityIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    variant = get_variant_or_404(db, variant_id)

    if current_user:
        return build_user_cart_out(
            set_user_cart_item_quantity(db, current_user, variant, payload.quantity)
        )

    session_key = get_or_create_session_key(request, response)
    assert_stock(variant, payload.quantity)
    write_guest_cart_item(session_key, variant.id, payload.quantity)
    return build_guest_cart_out(db, session_key)


@router.delete("/items/{variant_id}", response_model=CartOut)
def remove_cart_item(
    variant_id: uuid.UUID,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    variant = get_variant_or_404(db, variant_id)

    if current_user:
        return build_user_cart_out(
            set_user_cart_item_quantity(db, current_user, variant, 0)
        )

    session_key = get_or_create_session_key(request, response)
    write_guest_cart_item(session_key, variant.id, 0)
    return build_guest_cart_out(db, session_key)
