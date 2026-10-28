"""Tools the agent can call. Week 1: two READ-ONLY tools.

>>> ADAPT HERE: the SQL below assumes these tables. Rename to match your
    SUNLINE schema:
      products(id, name, description, price, category)
      product_variants(id, product_id, size, color, stock)
"""
from dataclasses import dataclass
from typing import Callable, Optional, Type

from pydantic import BaseModel, Field
from sqlalchemy import text


# ---------- argument schemas (Pydantic = validation + JSON schema for the LLM)

class SearchProductsArgs(BaseModel):
    query: str = Field(description="Keywords such as 'jean noir' or 'mom fit'. "
                                   "Use the product vocabulary (French).")
    size: Optional[str] = Field(None, description="Only products available in this size, e.g. '38'.")
    max_price: Optional[float] = Field(None, description="Maximum price in TND.")
    limit: int = Field(5, ge=1, le=10)


class GetProductArgs(BaseModel):
    product_id: int = Field(description="Product id returned by search_products.")


class SearchKBArgs(BaseModel):
    query: str = Field(description="The customer's question about delivery, returns/exchanges, "
                                   "payment, size guide or garment care, in French.")
    top_k: int = Field(4, ge=1, le=6)


# ---------- implementations (read-only SQL, parameterized, never string-built)

def search_products(session, args: SearchProductsArgs, ctx: dict):
    where, params = [], {"limit": args.limit}
    for i, word in enumerate(args.query.lower().split()):
        params[f"w{i}"] = f"%{word}%"
        where.append(f"(lower(p.name) LIKE :w{i} OR lower(p.description) LIKE :w{i} "
                     f"OR lower(p.category) LIKE :w{i})")
    if args.max_price is not None:
        where.append("p.price <= :max_price")
        params["max_price"] = args.max_price
    if args.size:
        where.append("EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id "
                     "AND v.size = :size AND v.stock > 0)")
        params["size"] = args.size
    sql = ("SELECT p.id, p.name, p.price, p.category, "
           "(SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id AND v.stock > 0) "
           "AS in_stock_variants FROM products p "
           + ("WHERE " + " AND ".join(where) if where else "")
           + " ORDER BY p.id LIMIT :limit")
    rows = session.execute(text(sql), params).mappings().all()
    products = []
    for r in rows:
        d = dict(r)
        d["in_stock"] = d.pop("in_stock_variants") > 0   # True if at least one size/color is available
        products.append(d)
    return {"count": len(products), "products": products}


def get_product(session, args: GetProductArgs, ctx: dict):
    p = session.execute(
        text("SELECT id, name, description, price, category FROM products WHERE id = :id"),
        {"id": args.product_id}).mappings().first()
    if not p:
        return {"found": False}
    variants = session.execute(
        text("SELECT size, color, stock FROM product_variants WHERE product_id = :id "
             "ORDER BY size, color"), {"id": args.product_id}).mappings().all()
    return {"found": True, **dict(p),
            "variants": [{"size": v["size"], "color": v["color"],
                          "in_stock": v["stock"] > 0} for v in variants]}


def search_knowledge_base(session, args: SearchKBArgs, ctx: dict):
    kb = ctx.get("kb")
    if kb is None:
        raise RuntimeError("Knowledge base is not configured")
    hits = kb.search(args.query, args.top_k)
    best = round(hits[0]["score"], 3) if hits else 0.0
    good = [h for h in hits if h["score"] >= kb.min_score]
    if not good:
        return {"found": False, "best_score": best, "passages": []}
    passages = []
    for h in kb.expand_with_siblings(good):
        item = {"topic": h["title"], "text": h["text"]}
        if h.get("score") is not None:
            item["score"] = round(h["score"], 3)
        passages.append(item)
    return {"found": True, "best_score": best, "passages": passages,
            "rule": "State only what these passages say explicitly. If the answer, a number or a "
                    "condition is not written here, say you do not have that information."}


# ---------- registry

@dataclass
class Tool:
    name: str
    description: str
    args_model: Type[BaseModel]
    fn: Callable

    def schema(self) -> dict:
        return {"name": self.name, "description": self.description,
                "input_schema": self.args_model.model_json_schema()}


TOOLS = {t.name: t for t in [
    Tool("search_products",
         "Search the SUNLINE catalog. Returns id, name, price (TND), category and in_stock "
         "(true if at least one size is available). Call get_product for sizes/stock details.",
         SearchProductsArgs, search_products),
    Tool("get_product",
         "Get full details of one product, including which size/color variants are in stock.",
         GetProductArgs, get_product),
    Tool("search_knowledge_base",
         "Search the store's information: delivery times and costs, returns and exchanges, payment "
         "methods, size guide, garment care. Use it for any question about how the store works. "
         "Returns passages; found=false means the store has no information on that.",
         SearchKBArgs, search_knowledge_base),
]}


def tool_schemas() -> list:
    return [t.schema() for t in TOOLS.values()]
