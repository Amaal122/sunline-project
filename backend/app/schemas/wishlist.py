import uuid
from pydantic import BaseModel

from app.schemas.product import ProductListOut


class WishlistOut(BaseModel):
    product_ids: list[uuid.UUID]
    products: list[ProductListOut]
