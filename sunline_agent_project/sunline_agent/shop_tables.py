"""The SUNLINE shop tables as SQLAlchemy Core definitions (only the columns the agent needs).

They mirror the real PostgreSQL schema (table and column names, nullability). Core tables work
both on PostgreSQL and on SQLite, so the same tools run on your dev database and in tests.

Enum columns (status, payment_method, payment_status, fit) are declared as plain strings on
purpose: the agent only READS them and psycopg2 sends them as untyped literals, which
PostgreSQL accepts for enum columns. Inside the SUNLINE backend you can swap these
definitions for your real ORM models.
"""
import sqlalchemy as sa

shop_metadata = sa.MetaData()

users = sa.Table(
    "users", shop_metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column("email", sa.String, nullable=False),
    sa.Column("hashed_password", sa.String, nullable=False),
    sa.Column("full_name", sa.String, nullable=False),
    sa.Column("phone", sa.String),
    sa.Column("is_active", sa.Boolean),
    sa.Column("is_admin", sa.Boolean, nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True)),
)

products = sa.Table(
    "products", shop_metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column("name", sa.String, nullable=False),
    sa.Column("slug", sa.String, nullable=False),
    sa.Column("description", sa.Text),
    sa.Column("fit", sa.String, nullable=False),
    sa.Column("base_price", sa.Numeric(10, 2), nullable=False),
    sa.Column("is_active", sa.Boolean),
)

product_variants = sa.Table(
    "product_variants", shop_metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column("product_id", sa.Uuid, nullable=False),
    sa.Column("color", sa.String, nullable=False),
    sa.Column("size", sa.String, nullable=False),
    sa.Column("sku", sa.String, nullable=False),
    sa.Column("stock_quantity", sa.Integer, nullable=False),
    sa.Column("price_override", sa.Numeric(10, 2)),
)

orders = sa.Table(
    "orders", shop_metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column("order_number", sa.String, nullable=False),
    sa.Column("user_id", sa.Uuid),                       # NULL = guest checkout
    sa.Column("status", sa.String, nullable=False),
    sa.Column("payment_method", sa.String, nullable=False),
    sa.Column("payment_status", sa.String, nullable=False),
    sa.Column("subtotal", sa.Numeric(10, 2), nullable=False),
    sa.Column("delivery_fee", sa.Numeric(10, 2), nullable=False),
    sa.Column("total", sa.Numeric(10, 2), nullable=False),
    sa.Column("full_name", sa.String, nullable=False),   # personal data: NEVER sent to the agent
    sa.Column("email", sa.String),                       # personal data
    sa.Column("phone", sa.String, nullable=False),       # personal data (used only to verify guests)
    sa.Column("address_line", sa.String, nullable=False),  # personal data
    sa.Column("city", sa.String, nullable=False),
    sa.Column("governorate", sa.String, nullable=False),
    sa.Column("postal_code", sa.String, nullable=False),   # personal data
    sa.Column("created_at", sa.DateTime(timezone=True)),
    sa.Column("updated_at", sa.DateTime(timezone=True)),
)

order_items = sa.Table(
    "order_items", shop_metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column("order_id", sa.Uuid, nullable=False),
    sa.Column("product_variant_id", sa.Uuid, nullable=False),
    sa.Column("product_name", sa.String, nullable=False),
    sa.Column("color", sa.String, nullable=False),
    sa.Column("size", sa.String, nullable=False),
    sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
    sa.Column("quantity", sa.Integer, nullable=False),
)


# ---------------------------------------------------------------------------------------------
# READ MODELS: what the agent's queries are allowed to touch. They list ONLY the columns the tools
# need, so personal data (name, email, street address, postal code) is never even selected.
# They are never created in a database (no create_all); the full tables above are used by the seed.
# The database role created by `python -m sunline_agent.grants` gets exactly these columns.
# ---------------------------------------------------------------------------------------------
read_metadata = sa.MetaData()


def _read_view(table, columns):
    return sa.Table(table.name, read_metadata, *[sa.Column(c, table.c[c].type, primary_key=table.c[c].primary_key)
                                                  for c in columns])


orders_read = _read_view(orders, ["id", "order_number", "user_id", "status", "payment_method", "payment_status",
                                  "subtotal", "delivery_fee", "total", "phone", "city", "governorate", "created_at"])
order_items_read = _read_view(order_items, ["id", "order_id", "product_variant_id", "product_name", "color",
                                            "size", "unit_price", "quantity"])
products_read = _read_view(products, ["id", "name", "description", "fit", "base_price", "is_active"])
product_variants_read = _read_view(product_variants, ["id", "product_id", "color", "size", "stock_quantity",
                                                      "price_override"])
READ_TABLES = [orders_read, order_items_read, products_read, product_variants_read]
