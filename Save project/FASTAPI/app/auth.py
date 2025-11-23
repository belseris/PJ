# app/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Form, Body
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from .database import get_db
from .models_user import User
from .schemas import RegisterRequest, LoginRequest, UserOut, TokenOut, TokenPairOut
from .deps import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(
        email=payload.email,
        username=payload.username,
        gender=payload.gender,
        age=payload.age,
        hashed_password=pwd_ctx.hash(payload.password),
    )
    db.add(user); db.commit(); db.refresh(user)
    return UserOut.model_validate(user, from_attributes=True)

@router.post("/login", response_model=TokenPairOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not pwd_ctx.verify(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenPairOut(
        access_token=create_access_token({"sub": user.id}),      # จะถูกบังคับเป็น str ใน deps
        refresh_token=create_refresh_token({"sub": user.id}),
    )

# รองรับทั้ง form และ JSON: {"refresh_token": "..."}
@router.post("/refresh", response_model=TokenOut)
def refresh(
    refresh_token_form: str = Form(None),
    payload_json: dict = Body(None)
):
    refresh_token = refresh_token_form or (payload_json or {}).get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="refresh_token required")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="invalid_token_type")

    uid = payload.get("sub")
    return TokenOut(access_token=create_access_token({"sub": uid}))
