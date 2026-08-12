import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field, EmailStr

from app.models.order import OrderStatus, PaymentMethod, PaymentStatus


class CheckoutIn(BaseModel):
    """What the checkout form submits. Matches Order's shipping-snapshot
    columns exactly — nothing here is a foreign key to `addresses`.

    email is optional at the schema level because a logged-in user's
    email is already known (order.user.email) — it only becomes
    required in practice for guest checkout, enforced in the router
    rather than here, since that decision depends on `current_user`."""

    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str = Field(min_length=8, max_length=20)
    address_line: str = Field(min_length=1, max_length=500)
    city: str = Field(min_length=1, max_length=100)
    governorate: str = Field(min_length=1, max_length=100)
    postal_code: str = Field(min_length=4, max_length=10)
    payment_method: PaymentMethod


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_variant_id: uuid.UUID
    product_name: str
    color: str
    size: str
    unit_price: Decimal
    quantity: int

    @computed_field  # type: ignore[prop-decorator]
    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    status: OrderStatus
    payment_method: PaymentMethod
    payment_status: PaymentStatus

    subtotal: Decimal
    delivery_fee: Decimal
    total: Decimal

    full_name: str
    phone: str
    address_line: str
    city: str
    governorate: str
    postal_code: str

    items: list[OrderItemOut]


class OrderListItemOut(BaseModel):
    """Slimmer shape for the order history list — no line items."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    total: Decimal
    item_count: int
