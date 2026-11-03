"""Tools the agent can call.

Products and orders use the real SUNLINE schema (see shop_tables.py). The model never
supplies identity: who the customer is comes from ctx, set by the server.
"""
import uuid
from dataclasses import dataclass
from typing import Callable, Optional, Type

from pydantic import BaseModel, Field
from sqlalchemy import String, cast, exists, func, or_, select

from .escalation import EscalateArgs, escalate_to_human
from .order_tools import (GetMyOrdersArgs, GetOrderStatusArgs, get_my_orders,
                          get_order_status)
from .shop_tables import product_variants_read as pv
from .shop_tables import products_read as pr


# ---------- argument schemas (Pydantic = validation + JSON schema for the LLM)

class SearchProductsArgs(BaseModel):
    query: str = Field(description="Keywords such as 'jean noir' or 'mom fit'. "
                                   "Use the product vocabulary (French).")
    size: Optional[str] = Field(None, description="Only products available in this size, e.g. '38'.")
    max_price: Optional[float] = Field(None, description="Maximum price in TND.")
    limit: int = Field(5, ge=1, le=10)


class GetProductArgs(BaseModel):
    product_id: uuid.UUID = Field(description="Product id returned by search_products.")


class SearchKBArgs(BaseModel):
    query: str = Field(description="The customer's question about delivery, returns/exchanges, "
                                   "payment, size guide or garment care, in French.")
    top_k: int = Field(4, ge=1, le=6)


# ---------- products (read-only, parameterized)

def _like(word: str) -> str:
    return "%" + word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def search_products(session, args: SearchProductsArgs, ctx: dict):
    conds = [or_(pr.c.is_active.is_(None), pr.c.is_active.is_(True))]
    for w in args.query.lower().split():
        pat = _like(w)
        conds.append(or_(func.lower(pr.c.name).like(pat, escape="\\"),
                         func.lower(func.coalesce(pr.c.description, "")).like(pat, escape="\\"),
                         func.lower(cast(pr.c.fit, String)).like(pat, escape="\\")))
    if args.max_price is not None:
        conds.append(pr.c.base_price <= args.max_price)
    if args.size:
        conds.append(exists().where(pv.c.product_id == pr.c.id, pv.c.size == args.size,
                                    pv.c.stock_quantity > 0))
    available = (select(func.count()).select_from(pv)
                 .where(pv.c.product_id == pr.c.id, pv.c.stock_quantity > 0).scalar_subquery())
    rows = session.execute(select(pr.c.id, pr.c.name, pr.c.base_price, pr.c.fit, available.label("avail"))
                           .where(*conds).order_by(pr.c.name).limit(args.limit)).mappings().all()
    return {"count": len(rows),
            "products": [{"id": r["id"], "name": r["name"], "price": r["base_price"],
                          "fit": str(r["fit"]), "in_stock": r["avail"] > 0} for r in rows]}


def get_product(session, args: GetProductArgs, ctx: dict):
    p = session.execute(select(pr).where(pr.c.id == args.product_id)).mappings().first()
    if not p:
        return {"found": False}
    variants = session.execute(select(pv).where(pv.c.product_id == args.product_id)
                               .order_by(pv.c.size, pv.c.color)).mappings().all()
    return {"found": True, "id": p["id"], "name": p["name"], "description": p["description"],
            "fit": str(p["fit"]), "price": p["base_price"],
            "variants": [{"size": v["size"], "color": v["color"], "in_stock": v["stock_quantity"] > 0,
                          "price": v["price_override"] if v["price_override"] is not None else p["base_price"]}
                         for v in variants]}


# ---------- knowledge base

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
         "Search the SUNLINE catalog. Returns id, name, price (TND), fit and in_stock "
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
    Tool("get_my_orders",
         "List the recent orders of the logged-in customer (status, date, total). Works only when "
         "the customer is logged in; the system knows who they are.",
         GetMyOrdersArgs, get_my_orders),
    Tool("get_order_status",
         "Get the status and contents of ONE order by order number. A logged-in customer can look up "
         "their own orders. A customer who is not logged in must also give the phone number used at "
         "checkout.",
         GetOrderStatusArgs, get_order_status),
    Tool("escalate_to_human",
         "Hand the case to the SUNLINE team: records it and returns the reference and the contact details "
         "to give the customer. Use it when the customer needs a human (see rules).",
         EscalateArgs, escalate_to_human),
]}


def tool_schemas() -> list:
    return [t.schema() for t in TOOLS.values()]
