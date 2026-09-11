from dotenv import load_dotenv
import os as _os
# Load backend/.env if present, else fall back to repo-root ../.env so `uvicorn
# app.main:app` run from backend/ still picks up GEMINI/GROQ keys for demos.
load_dotenv()
_root_env = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))), ".env")
if _os.path.exists(_root_env):
    load_dotenv(_root_env, override=False)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
import time
import uuid
from app.api import router

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"),
                    format="%(asctime)s %(levelname)s req=%(request_id)s %(message)s")
_log = logging.getLogger("sathi")
_old_factory = logging.getLogRecordFactory()
def _factory(*a, **k):
    r = _old_factory(*a, **k)
    r.request_id = getattr(_ctx, "rid", "-")
    return r
import threading as _th
_ctx = _th.local()
logging.setLogRecordFactory(_factory)

app = FastAPI(title="Sathi API", version="1.0.0",
              docs_url="/api/docs" if os.getenv("ENVIRONMENT", "development") != "production" else None,
              redoc_url=None)

def _origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)


@app.middleware("http")
async def request_id_and_headers(request: Request, call_next):
    _ctx.rid = request.headers.get("X-Request-ID", uuid.uuid4().hex[:12])
    start = time.time()
    resp = await call_next(request)
    resp.headers["X-Request-ID"] = _ctx.rid
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if os.getenv("ENVIRONMENT") == "production":
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    _log.info("%s %s -> %s %.0fms", request.method, request.url.path,
              resp.status_code, (time.time() - start) * 1000)
    return resp


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    _log.exception("unhandled error")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})

app.include_router(router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    try:
        from app.database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
        return {"status": "ready", "db": "up"}
    except Exception:
        _log.exception("readiness db check failed")
        return JSONResponse(status_code=503, content={"status": "not-ready", "db": "down"})


@app.get("/")
def read_root():
    return {"message": "Welcome to Sathi API", "health": "/health", "ready": "/ready"}
