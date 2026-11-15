"""Fake development data: users, products, orders (including guest orders and other people's orders).

    python -m sunline_agent.seed_demo

SAFETY: refuses to run on a PostgreSQL database whose name does not end in _dev or _test, and only
ever deletes/inserts rows marked as fake (emails @example.test, order numbers DEV-*, slugs dev-*).
Everything here is invented: names, phones and addresses do not belong to real people."""
import sys
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, text

from . import config
from .db import make_engine
from .shop_tables import order_items, orders, product_variants, products, shop_metadata, users

# Fixed ids so you can "log in" as a fake customer:  $env:DEV_LOGIN = "alice"
ALICE_ID = uuid.UUID("00000000-0000-0000-0000-0000000000a1")
BOB_ID = uuid.UUID("00000000-0000-0000-0000-0000000000b2")
ADMIN_ID = uuid.UUID("00000000-0000-0000-0000-0000000000ad")
DEV_LOGINS = {"alice": ALICE_ID, "bob": BOB_ID, "admin": ADMIN_ID}

# Fake personal data (used by the tests to check that it NEVER reaches the agent)
FAKE = {
    "alice": {"name": "Alice Fictive", "email": "alice@example.test", "phone": "+216 20 000 111",
              "address": "7 Rue Imaginaire", "postal": "8000", "city": "Nabeul", "gov": "Nabeul"},
    "bob": {"name": "Bob Imaginaire", "email": "bob@example.test", "phone": "+216 20 000 222",
            "address": "9 Avenue Inventee", "postal": "8100", "city": "Sousse", "gov": "Sousse"},
    "guest": {"name": "Invitee Fictive", "email": None, "phone": "+216 20 000 333",
              "address": "3 Impasse Fantome", "postal": "8200", "city": "Sfax", "gov": "Sfax"},
}

PRODUCTS = [  # (key, name, description, fit keyword, price, variants[(color, size, stock)])
    ("mom", "Jean Mom Fit Noir", "Jean taille haute coupe mom, denim stretch", "mom", "89.00",
     [("noir", "36", 4), ("noir", "38", 0), ("noir", "40", 7)]),
    ("wide", "Jean Wide Leg Bleu", "Jean large taille haute, denim rigide", "wide", "99.00",
     [("bleu", "38", 3), ("bleu", "40", 2)]),
    ("slim", "Jean Slim Gris", "Jean slim taille normale", "slim", "79.00",
     [("gris", "36", 0), ("gris", "38", 0)]),
]


def _assert_safe(engine):
    if engine.dialect.name == "sqlite":
        return
    db = engine.url.database or ""
    if not (db.endswith("_dev") or db.endswith("_test")):
        raise SystemExit(f"Refusing to seed database '{db}': the name must end in _dev or _test.")


def _check_sqlite_schema(engine):
    """An old demo.db (week 1 schema) would make create_all silently keep the wrong tables."""
    from sqlalchemy import inspect
    insp = inspect(engine)
    for table in shop_metadata.sorted_tables:
        if insp.has_table(table.name):
            have = {c["name"] for c in insp.get_columns(table.name)}
            missing = {c.name for c in table.columns} - have
            if missing:
                raise SystemExit(
                    f"The SQLite file already has a table '{table.name}' with an OLD layout "
                    f"(missing columns: {sorted(missing)}). Delete the file (for example demo.db) or "
                    f"point DATABASE_URL to another database, then run the seed again.")


def _labels(conn, typname):
    if conn.dialect.name == "sqlite":
        return None
    return [r[0] for r in conn.execute(text(
        "select e.enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid "
        "where t.typname = :t order by e.enumsortorder"), {"t": typname})]


def _pick(labels, wanted):
    if not labels:
        return wanted
    for l in labels:
        if l.lower() == wanted.lower():
            return l
    for l in labels:
        if wanted.lower() in l.lower():
            return l
    return labels[0]


def seed(engine):
    _assert_safe(engine)
    if engine.dialect.name == "sqlite":
        _check_sqlite_schema(engine)
        shop_metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    with engine.begin() as c:
        # remove previous FAKE rows only
        fake_orders = select(orders.c.id).where(orders.c.order_number.like("DEV-%"))
        c.execute(delete(order_items).where(order_items.c.order_id.in_(fake_orders)))
        c.execute(delete(orders).where(orders.c.order_number.like("DEV-%")))
        fake_products = select(products.c.id).where(products.c.slug.like("dev-%"))
        c.execute(delete(product_variants).where(product_variants.c.product_id.in_(fake_products)))
        c.execute(delete(products).where(products.c.slug.like("dev-%")))
        c.execute(delete(users).where(users.c.email.like("%@example.test")))

        fit_labels = _labels(c, "fittype")
        st = {k: _pick(_labels(c, "orderstatus"), k) for k in
              ("pending", "processing", "shipped", "delivered", "cancelled")}
        pm = {k: _pick(_labels(c, "paymentmethod"), k) for k in ("cod", "online")}
        ps = {k: _pick(_labels(c, "paymentstatus"), k) for k in ("unpaid", "paid", "failed", "refunded")}

        for uid, key, admin in ((ALICE_ID, "alice", False), (BOB_ID, "bob", False), (ADMIN_ID, None, True)):
            f = FAKE[key] if key else {"name": "Admin Fictif", "email": "admin@example.test", "phone": None}
            c.execute(users.insert().values(id=uid, email=f["email"], hashed_password="not-a-real-hash",
                                            full_name=f["name"], phone=f["phone"], is_active=True,
                                            is_admin=admin, created_at=now))
        variant_ids = {}
        for key, name, desc, fit, price, variants in PRODUCTS:
            pid = uuid.uuid4()
            c.execute(products.insert().values(id=pid, name=name, slug=f"dev-{key}", description=desc,
                                               fit=_pick(fit_labels, fit), base_price=price, is_active=True))
            for color, size, stock in variants:
                vid = uuid.uuid4()
                variant_ids[(key, size)] = (vid, name, color, size, price)
                c.execute(product_variants.insert().values(
                    id=vid, product_id=pid, color=color, size=size, sku=f"DEV-{key}-{size}".upper(),
                    stock_quantity=stock, price_override=None))

        def order(number, user_id, who, status, method, pay, days_ago, items, fee="7.00"):
            oid, f = uuid.uuid4(), FAKE[who]
            sub = sum(float(v[4]) * q for v, q in items)
            c.execute(orders.insert().values(
                id=oid, order_number=number, user_id=user_id, status=st[status], payment_method=pm[method],
                payment_status=ps[pay], subtotal=f"{sub:.2f}", delivery_fee=fee,
                total=f"{sub + float(fee):.2f}", full_name=f["name"], email=f["email"], phone=f["phone"],
                address_line=f["address"], city=f["city"], governorate=f["gov"], postal_code=f["postal"],
                created_at=now - timedelta(days=days_ago), updated_at=None))
            for v, q in items:
                c.execute(order_items.insert().values(
                    id=uuid.uuid4(), order_id=oid, product_variant_id=v[0], product_name=v[1],
                    color=v[2], size=v[3], unit_price=v[4], quantity=q))

        order("DEV-1001", ALICE_ID, "alice", "shipped", "cod", "unpaid", 3, [(variant_ids[("mom", "40")], 1)])
        order("DEV-1002", ALICE_ID, "alice", "delivered", "online", "paid", 20,
              [(variant_ids[("wide", "38")], 1), (variant_ids[("mom", "36")], 2)])
        order("DEV-1003", ALICE_ID, "alice", "cancelled", "cod", "unpaid", 40, [(variant_ids[("wide", "40")], 1)])
        order("DEV-2001", BOB_ID, "bob", "pending", "cod", "unpaid", 1, [(variant_ids[("mom", "40")], 1)])
        order("DEV-3001", None, "guest", "processing", "cod", "unpaid", 2, [(variant_ids[("wide", "40")], 1)])
    return {"users": list(DEV_LOGINS), "orders": ["DEV-1001", "DEV-1002", "DEV-1003 (alice)",
                                                  "DEV-2001 (bob)", "DEV-3001 (guest, phone 20 000 333)"]}


def main():
    print(f"Seeding fake data into {config.DATABASE_URL.split('@')[-1]} ...")
    info = seed(make_engine(config.DATABASE_URL))
    print("Done. Fake logins:", ", ".join(info["users"]))
    print("Orders:", "; ".join(info["orders"]))
    print("To act as a logged-in customer:  $env:DEV_LOGIN = 'alice'   (unset = guest)")


if __name__ == "__main__":
    sys.exit(main())
