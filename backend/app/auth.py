"""Minimal auth: salted sha256 passwords + HS256 JWT. No extra native deps."""
import hashlib
import os
import secrets
import time

import jwt as pyjwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

SECRET = os.getenv("JWT_SECRET", "sathi-dev-secret")
ALGO = "HS256"
TTL = 30 * 24 * 3600  # 30 days
_bearer = HTTPBearer(auto_error=False)


def hash_pw(pw: str) -> str:
    salt = secrets.token_hex(8)
    return f"{salt}${hashlib.sha256((salt + pw).encode()).hexdigest()}"


def check_pw(pw: str, h: str) -> bool:
    try:
        salt, digest = h.split("$", 1)
        return hashlib.sha256((salt + pw).encode()).hexdigest() == digest
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
