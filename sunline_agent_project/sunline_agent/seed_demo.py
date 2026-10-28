"""Creates a tiny demo catalog so you can run the agent before connecting
your real SUNLINE database copy:  python -m sunline_agent.seed_demo"""
from sqlalchemy import text

from . import config
from .db import make_engine

DDL = [
    "CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, description TEXT, price NUMERIC, category TEXT)",
    "CREATE TABLE IF NOT EXISTS product_variants (id INTEGER PRIMARY KEY, product_id INTEGER, size TEXT, color TEXT, stock INTEGER)",
]
PRODUCTS = [
    (1, "Jean Mom Fit Noir", "Jean taille haute coupe mom, denim stretch", 89.0, "jean"),
    (2, "Jean Wide Leg Bleu", "Jean large taille haute, denim rigide", 99.0, "jean"),
    (3, "Jean Slim Gris", "Jean slim taille normale", 79.0, "jean"),
]
VARIANTS = [
    (1, 1, "36", "noir", 4), (2, 1, "38", "noir", 0), (3, 1, "40", "noir", 7),
    (4, 2, "38", "bleu", 3), (5, 2, "40", "bleu", 2),
    (6, 3, "36", "gris", 0), (7, 3, "38", "gris", 0),
]


def seed(engine):
    with engine.begin() as c:
        for stmt in DDL:
            c.execute(text(stmt))
        if c.execute(text("SELECT COUNT(*) FROM products")).scalar() == 0:
            for p in PRODUCTS:
                c.execute(text("INSERT INTO products VALUES (:a,:b,:c,:d,:e)"),
                          dict(zip("abcde", p)))
            for v in VARIANTS:
                c.execute(text("INSERT INTO product_variants VALUES (:a,:b,:c,:d,:e)"),
                          dict(zip("abcde", v)))


if __name__ == "__main__":
    seed(make_engine(config.DATABASE_URL))
    print("Demo data ready in", config.DATABASE_URL)
