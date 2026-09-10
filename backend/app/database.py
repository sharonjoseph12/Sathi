import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

_DB = os.getenv("DATABASE_URL") or "sqlite:///" + os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sathi.db")
SQLALCHEMY_DATABASE_URL = _DB

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
