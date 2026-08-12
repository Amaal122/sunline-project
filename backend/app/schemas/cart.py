import uuid
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.product import ProductImageOut


class CartItemIn(BaseModel):
    product_variant_id: uuid.UUID
    quantity: int = Field(default=1, ge=1, le=99)


class CartItemQuantityIn(BaseModel):
    quantity: int = Field(ge=0, le=99)


class CartProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    base_price: Decimal
    compare_at_price: Decimal | None = None
    primary_image: ProductImageOut | None = None


class CartVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    color: str
    size: str
    sku: str
    stock_quantity: int
    price_override: Decimal | None = None


class CartLineOut(BaseModel):
    product_variant_id: uuid.UUID
    product: CartProductOut
    variant: CartVariantOut
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class CartOut(BaseModel):
    items: list[CartLineOut]
    subtotal: Decimal
    delivery_fee: Decimal
    total: Decimal
    count: int
