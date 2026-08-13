from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_current_user
from app.models.user import User
from app.schemas.order import CheckoutIn, OrderListItemOut, OrderOut
from app.services.email import send_order_confirmation_email
from app.services.order import (
    create_order_from_cart,
    get_order_by_number,
    list_user_orders,
)

router = APIRouter(tags=["orders"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def checkout(
    payload: CheckoutIn,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Converts the current cart (user or guest) into a real order.
    Guest checkout is intentional — Order.user_id is nullable and the
    cart already supports guests via the session cookie."""

    recipient_email = current_user.email if current_user else payload.email
    if not recipient_email:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email is required for guest checkout.",
        )

    order = create_order_from_cart(db, current_user, request, payload)
    order.email = recipient_email
    db.commit()
    db.refresh(order)

    background_tasks.add_task(send_order_confirmation_email, order, recipient_email)
    return order


@router.get("", response_model=list[OrderListItemOut])
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Order history is account-only — guests have no way to list past
    orders, only to look one up directly by order_number (see below)."""
    orders = list_user_orders(db, current_user)
    return [
        OrderListItemOut(
            id=o.id,
            order_number=o.order_number,
            status=o.status,
            payment_status=o.payment_status,
            total=o.total,
            item_count=sum(item.quantity for item in o.items),
        )
        for o in orders
    ]


@router.get("/{order_number}", response_model=OrderOut)
def get_order(
    order_number: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Powers the confirmation page. Guest orders are viewable by number
    alone (like a receipt); orders tied to an account require being
    logged in as that account."""
    return get_order_by_number(db, order_number, current_user)
