"""Order tools for the customer assistant. SECURITY RULES (each one has a test):

1. Identity comes from the server (ctx["user_id"], set from the login), never from the model.
   No tool parameter can carry a user id, an email or a role.
2. A logged-in customer can read ONLY their own orders. Admin status gives nothing here.
3. A guest (not logged in) can read a GUEST order only with order number + the phone number
   used at checkout. Orders that belong to an account always require login.
4. Every failure returns the SAME message, whether the order does not exist, belongs to
   someone else, or the phone is wrong: nothing reveals which order numbers exist.
5. Failed attempts are limited per session and per order number.
6. The agent receives a minimal view: no name, phone, email, street address or postal code,
   and no database ids.
"""
import hmac
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import func, select

from .shop_tables import order_items_read as order_items
from .shop_tables import orders_read as orders

# Assumed meanings: CHECK THEM with the SUNLINE team and edit if your process differs.
STATUS_MEANING = {
    "pending": "Order received and waiting to be processed.",
    "processing": "Order is being prepared.",
    "shipped": "Order has been handed over for delivery and is on its way.",
    "delivered": "Order has been delivered.",
    "cancelled": "Order was cancelled.",
}

NOT_FOUND = {"found": False,
             "message": "No order matches. Ask the customer to check the order number and, if they "
                        "are not logged in, the phone number used at checkout, or to contact an advisor."}
LOCKED = {"found": False, "locked": True,
          "message": "Too many failed attempts. Do not retry. Tell the customer a human advisor will help."}
NEEDS_PHONE = {"found": False, "needs": "phone",
               "message": "The customer is not logged in. Ask for the phone number used at checkout."}
NOT_LOGGED_IN = {"logged_in": False,
                 "message": "The customer is not logged in. Ask for the order number and the phone "
                            "number used at checkout, or ask them to log in."}


class GetMyOrdersArgs(BaseModel):
    limit: int = Field(5, ge=1, le=10, description="How many recent orders to list.")


class GetOrderStatusArgs(BaseModel):
    order_number: str = Field(max_length=40, description="Order number given by the customer.")
    phone: Optional[str] = Field(None, max_length=30,
                                 description="Phone number used at checkout. Needed only when the "
                                             "customer is not logged in.")


# ------------------------------------------------------------------ helpers

def _as_uuid(value):
    if value is None:
        return None
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except ValueError:
        return None


def _clean_order_number(raw: str):
    n = (raw or "").strip().lstrip("#").upper()
    return n if re.fullmatch(r"[A-Z0-9][A-Z0-9\-_/]{0,39}", n) else None


def normalize_phone(raw) -> str:
    d = re.sub(r"\D", "", str(raw or ""))
    if d.startswith("00216"):
        d = d[5:]
    elif d.startswith("216") and len(d) > 8:
        d = d[3:]
    return d


def phones_match(stored, given) -> bool:
    a, b = normalize_phone(stored), normalize_phone(given)
    return len(a) >= 8 and len(b) >= 8 and hmac.compare_digest(a, b)


def _days_since(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return max(0, (datetime.now(timezone.utc) - dt).days)


def _item_count(session, order_id):
    return session.execute(select(func.coalesce(func.sum(order_items.c.quantity), 0))
                           .where(order_items.c.order_id == order_id)).scalar_one()


def _summary(session, o):
    status = str(o["status"]).lower()
    return {"order_number": o["order_number"], "status": status,
            "status_meaning": STATUS_MEANING.get(status, ""),
            "payment_status": str(o["payment_status"]).lower(),
            "ordered_on": o["created_at"].date().isoformat() if o["created_at"] else None,
            "days_since_order": _days_since(o["created_at"]),
            "total": o["total"], "item_count": _item_count(session, o["id"])}


def _view(session, o):
    """The ONLY order shape the agent ever sees."""
    items = session.execute(select(order_items).where(order_items.c.order_id == o["id"])
                            .order_by(order_items.c.product_name)).mappings().all()
    out = _summary(session, o)
    out.pop("item_count")
    out.update({
        "payment_method": str(o["payment_method"]).lower(),
        "subtotal": o["subtotal"], "delivery_fee": o["delivery_fee"],
        "delivery_to": {"governorate": o["governorate"], "city": o["city"]},
        "items": [{"product_name": i["product_name"], "color": i["color"], "size": i["size"],
                   "quantity": i["quantity"], "unit_price": i["unit_price"],
                   "line_total": i["unit_price"] * i["quantity"]} for i in items],
    })
    return out


# -------------------------------------------------------------------- tools

def get_my_orders(session, args: GetMyOrdersArgs, ctx: dict):
    uid = _as_uuid(ctx.get("user_id"))
    if uid is None:
        return NOT_LOGGED_IN
    rows = session.execute(select(orders).where(orders.c.user_id == uid)
                           .order_by(orders.c.created_at.desc()).limit(args.limit)).mappings().all()
    return {"logged_in": True, "count": len(rows), "orders": [_summary(session, r) for r in rows]}


def get_order_status(session, args: GetOrderStatusArgs, ctx: dict):
    uid = _as_uuid(ctx.get("user_id"))
    limiter, sid = ctx.get("limiter"), str(ctx.get("session_id", "anonymous"))
    ip_limiter, ip = ctx.get("ip_limiter"), ctx.get("client_ip")
    number = _clean_order_number(args.order_number)
    keys = [f"session:{sid}"] + ([f"order:{number}"] if number else [])

    def fail():
        if limiter:
            for k in keys:
                limiter.record_failure(k)
        if ip_limiter and ip:
            ip_limiter.record_failure(f"ip:{ip}")
        return NOT_FOUND

    # The IP limiter has a higher threshold: many customers share one mobile-network address.
    if (limiter and any(limiter.blocked(k) for k in keys)) or (ip_limiter and ip and ip_limiter.blocked(f"ip:{ip}")):
        return LOCKED
    if number is None:
        return fail()
    if uid is None and not args.phone:
        return NEEDS_PHONE                       # nothing was looked up: no information leaked

    order = session.execute(select(orders).where(func.upper(orders.c.order_number) == number)
                            ).mappings().first()
    allowed = False
    if order is not None:
        if uid is not None and order["user_id"] == uid:
            allowed = True                                           # their own order
        elif order["user_id"] is None and args.phone and phones_match(order["phone"], args.phone):
            allowed = True                                           # guest order + matching phone
    if not allowed:
        return fail()
    return {"found": True, "order": _view(session, order)}
