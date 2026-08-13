from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# connect_args forces UTF-8 client encoding explicitly. Without this,
# psycopg2 falls back to the OS locale to decide how to decode bytes
# coming back from Postgres — on non-English Windows locales (e.g. French)
# that default is often cp1252/Latin-1, not UTF-8, which causes
# "'utf-8' codec can't decode byte 0xe9" errors on connect.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"client_encoding": "utf8"},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
