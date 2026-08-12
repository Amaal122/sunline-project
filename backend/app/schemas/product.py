import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.product import FitType


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    cloudinary_public_id: Optional[str] = None
    alt_text: Optional[str] = None
    position: int
    is_primary: bool


class ProductVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    color: str
    size: str
    sku: str
    stock_quantity: int
    price_override: Optional[Decimal] = None


class ProductListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    fit: FitType
    base_price: Decimal
    compare_at_price: Optional[Decimal] = None
    is_active: bool
    primary_image: Optional[ProductImageOut] = None
    available_colors: list[str] = Field(default_factory=list)
    available_sizes: list[str] = Field(default_factory=list)
    first_available_variant_id: uuid.UUID | None = None


class ProductDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    fit: FitType
    base_price: Decimal
    compare_at_price: Optional[Decimal] = None
    is_active: bool
    care_instructions: Optional[str] = None
    images: list[ProductImageOut] = Field(default_factory=list)
    variants: list[ProductVariantOut] = Field(default_factory=list)
