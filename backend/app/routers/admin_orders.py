from sqlalchemy.orm import Session, selectinload
from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_db
from app.core.deps import get_current_admin_user
from app.models.user import User
from app.models.order import Order
from app.schemas.order import OrderOut
from app.schemas.admin import AdminOrderListItemOut, OrderStatusUpdateIn

router = APIRouter(prefix="/admin/orders", tags=["admin"])


@router.get("", response_model=list[AdminOrderListItemOut])
def list_all_orders(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    orders = (
        db.query(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .all()
    )
    return [
        AdminOrderListItemOut(
            id=o.id,
            order_number=o.order_number,
            full_name=o.full_name,
            status=o.status,
            payment_status=o.payment_status,
            total=o.total,
            item_count=sum(item.quantity for item in o.items),
            created_at=o.created_at,
        )
        for o in orders
    ]


@router.get("/{order_number}", response_model=OrderOut)
def get_order_admin(
    order_number: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Unlike the customer-facing GET /api/orders/{order_number}, this
    has no ownership check — an admin can look up any order by number."""
    order = (
        db.query(Order)
        .filter(Order.order_number == order_number)
        .options(selectinload(Order.items))
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_number}/status", response_model=OrderOut)
def update_order_status(
    order_number: str,
    payload: OrderStatusUpdateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    order = (
        db.query(Order)
        .filter(Order.order_number == order_number)
        .options(selectinload(Order.items))
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if payload.status is not None:
        order.status = payload.status
    if payload.payment_status is not None:
        order.payment_status = payload.payment_status

    db.commit()
    db.refresh(order)
    return order
