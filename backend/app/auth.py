"""Auth: PBKDF2 passwords + HS256 JWT. No extra native deps."""
import hashlib
import hmac
import os
import secrets
import time

import jwt as pyjwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

SECRET = os.getenv("JWT_SECRET", "sathi-dev-secret")
if SECRET == "sathi-dev-secret":
    import logging as _lg
    _lg.getLogger("sathi").warning("JWT_SECRET not set — using insecure dev default. Set JWT_SECRET in production.")
ALGO = "HS256"
TTL = int(os.getenv("JWT_TTL_SECONDS", str(7 * 24 * 3600)))  # 7 days default
_bearer = HTTPBearer(auto_error=False)

# Simple in-memory login throttle: {ip_or_email: [timestamps]}
_attempts: dict[str, list[float]] = {}
_MAX_ATTEMPTS = 8
_WINDOW = 300.0


def rate_limit_login(key: str) -> None:
    now = time.time()
    hits = [t for t in _attempts.get(key, []) if now - t < _WINDOW]
    if len(hits) >= _MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in a few minutes.")
    hits.append(now)
    _attempts[key] = hits


def hash_pw(pw: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 210_000)
    return f"pbkdf2$210000${salt}${dk.hex()}"


def check_pw(pw: str, h: str) -> bool:
    try:
        # Back-compat: legacy single-round sha256 "salt$digest"
        if not h.startswith("pbkdf2$"):
            salt, digest = h.split("$", 1)
            cand = hashlib.sha256((salt + pw).encode()).hexdigest()
            return hmac.compare_digest(cand, digest)
        _, iters, salt, digest = h.split("$", 3)
        cand = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), int(iters)).hex()
        return hmac.compare_digest(cand, digest)
    except Exception:
        return False


def token_for(user_id: int, role: str) -> str:
    now = int(time.time())
    return pyjwt.encode({"sub": user_id, "role": role, "iat": now, "exp": now + TTL}, SECRET, algorithm=ALGO)


def get_db():
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer), db: Session = Depends(get_db)):
    from app import models

    if not creds:
        raise HTTPException(status_code=401, detail="Login required")
    try:
        data = pyjwt.decode(creds.credentials, SECRET, algorithms=[ALGO])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")
    user = db.query(models.User).filter(models.User.id == data["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def need_roles(*roles: str):
    def _check(user=Depends(current_user)):
        if roles and user.role not in roles:
            raise HTTPException(status_code=403, detail="Not allowed for this role")
        return user

    return _check
