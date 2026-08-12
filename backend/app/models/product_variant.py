import uuid
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProductVariant(Base):
    __tablename__ = "product_variants"
    __table_args__ = (UniqueConstraint("product_id", "color", "size", name="uq_variant_product_color_size"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    color = Column(String, nullable=False)
    size = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    price_override = Column(Numeric(10, 2), nullable=True)

    product = relationship("Product", back_populates="variants")
    cart_items = relationship("CartItem", back_populates="variant")
    order_items = relationship("OrderItem", back_populates="variant")