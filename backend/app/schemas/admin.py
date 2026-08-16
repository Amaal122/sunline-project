import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.product import FitType
from app.models.order import OrderStatus, PaymentStatus


class ProductUpdateIn(BaseModel):
    """PATCH semantics — every field optional, only send what changes."""

    name: str | None = None
    slug: str | None = None
    description: str | None = None
    fit: FitType | None = None
    base_price: Decimal | None = None
    compare_at_price: Decimal | None = None
    care_instructions: str | None = None
    is_active: bool | None = None


class ProductVariantUpdateIn(BaseModel):
    color: str | None = None
    size: str | None = None
    sku: str | None = None
    stock_quantity: int | None = Field(default=None, ge=0)
    price_override: Decimal | None = None


class AdminOrderListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    full_name: str
    status: OrderStatus
    payment_status: PaymentStatus
    total: Decimal
    item_count: int
    created_at: datetime


class OrderStatusUpdateIn(BaseModel):
    """Both optional so the admin can update just one without touching
    the other — e.g. mark shipped without also touching payment_status."""

    status: OrderStatus | None = None
    payment_status: PaymentStatus | None = None
