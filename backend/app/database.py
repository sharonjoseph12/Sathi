import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

_DB = os.getenv("DATABASE_URL") or "sqlite:///" + os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sathi.db")

# Supabase / cloud postgres URLs often start with postgres://
# SQLAlchemy 1.4+ expects postgresql://
if _DB.startswith("postgres://"):
    _DB = _DB.replace("postgres://", "postgresql://", 1)

SQLALCHEMY_DATABASE_URL = _DB

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine_kwargs = {"connect_args": connect_args}
if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

