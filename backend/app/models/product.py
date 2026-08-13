import uuid
import enum
from sqlalchemy import Column, String, Text, Boolean, Numeric, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class FitType(str, enum.Enum):
    straight = "Straight"
    wide_leg = "Wide Leg"
    skinny = "Skinny"
    mom_jeans = "Mom Jeans"
    flare = "Flare"


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    fit = Column(Enum(FitType), nullable=False)
    base_price = Column(Numeric(10, 2), nullable=False)
    compare_at_price = Column(Numeric(10, 2), nullable=True)
    is_active = Column(Boolean, default=True)
    care_instructions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    variants = relationship(
        "ProductVariant", back_populates="product", cascade="all, delete-orphan"
    )
    images = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.position",
    )
    wishlisted_by = relationship(
        "Wishlist", back_populates="product", cascade="all, delete-orphan"
    )
