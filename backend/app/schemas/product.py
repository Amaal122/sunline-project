import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.product import FitType


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    cloudinary_public_id: str | None = None
    alt_text: str | None = None
    position: int
    is_primary: bool


class ProductVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    color: str
    size: str
    sku: str
    stock_quantity: int
    price_override: Decimal | None = None


class ProductListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    fit: FitType
    base_price: Decimal
    compare_at_price: Decimal | None = None
    is_active: bool
    primary_image: ProductImageOut | None = None
    available_colors: list[str] = Field(default_factory=list)
    available_sizes: list[str] = Field(default_factory=list)
    first_available_variant_id: uuid.UUID | None = None


class ProductDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    fit: FitType
    base_price: Decimal
    compare_at_price: Decimal | None = None
    is_active: bool
    care_instructions: str | None = None
    images: list[ProductImageOut] = Field(default_factory=list)
    variants: list[ProductVariantOut] = Field(default_factory=list)


class ProductCreateIn(BaseModel):
    name: str
    slug: str
    description: str | None = None
    fit: FitType
    base_price: Decimal
    compare_at_price: Decimal | None = None
    care_instructions: str | None = None
    is_active: bool = True


class ProductVariantCreateIn(BaseModel):
    color: str
    size: str
    sku: str
    stock_quantity: int = 0
    price_override: Decimal | None = None
