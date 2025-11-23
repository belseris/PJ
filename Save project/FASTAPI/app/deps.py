# app/deps.py
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from .database import get_db
from .models_user import User

security = HTTPBearer()

def _encode(payload: dict, minutes: int) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_access_token(payload: dict) -> str:
    # บังคับให้ sub เป็น string และใส่ type="access"
    payload = payload.copy()
    payload["sub"] = str(payload["sub"])
    payload["type"] = "access"
    return _encode(payload, ACCESS_TOKEN_EXPIRE_MINUTES)

def create_refresh_token(payload: dict) -> str:
    # อายุยาวกว่า (เช่น 30 วัน)
    payload = payload.copy()
    payload["sub"] = str(payload["sub"])
    payload["type"] = "refresh"
    return _encode(payload, 60 * 24 * 30)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None

def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(cred.credentials)
    if not payload or payload.get("type") != "access" or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    try:
        uid = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = db.get(User, uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
