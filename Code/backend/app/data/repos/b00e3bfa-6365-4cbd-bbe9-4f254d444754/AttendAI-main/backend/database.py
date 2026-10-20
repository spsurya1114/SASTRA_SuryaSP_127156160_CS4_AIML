"""
database.py — SQLAlchemy engine + session factory + dependency.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://nithil:nithil@localhost:5432/attendai",
)

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Handle SSL mode for cloud databases if not localhost
connect_args = {}
if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
    connect_args["sslmode"] = "require"

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,           # reconnect on stale connections
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
