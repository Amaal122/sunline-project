"""add full text search to products"""
from alembic import op
import sqlalchemy as sa


revision = '5950d298120d'
down_revision = '752aebf4e8b2'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # unaccent lets "etoile" match "Étoile" — essential for French product names
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")

    # A custom text-search config: French stemming + accent stripping combined.
    # Wrapped in a DO block so re-running migrations never fails if it exists.
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'fr_unaccent') THEN
                CREATE TEXT SEARCH CONFIGURATION fr_unaccent (COPY = french);
                ALTER TEXT SEARCH CONFIGURATION fr_unaccent
                    ALTER MAPPING FOR hword, hword_part, word
                    WITH unaccent, french_stem;
            END IF;
        END$$;
    """)

    # GENERATED ALWAYS ... STORED means Postgres recalculates this column
    # itself on every INSERT/UPDATE — no trigger, no app-side sync code,
    # works identically whether a row comes from seed.py, a future admin
    # endpoint, or a raw SQL script.
    op.execute("""
        ALTER TABLE products
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('fr_unaccent', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('fr_unaccent', coalesce(description, '')), 'B')
        ) STORED;
    """)

    op.execute("CREATE INDEX ix_products_search_vector ON products USING GIN (search_vector);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_products_search_vector;")
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS search_vector;")
    op.execute("DROP TEXT SEARCH CONFIGURATION IF EXISTS fr_unaccent;")
    op.execute("DROP EXTENSION IF EXISTS unaccent;")