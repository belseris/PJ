from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..schemas import UserCreate, ShowUser
from ..crud import create_user
from ..deps import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=ShowUser)
def register(user: UserCreate, db: Session = Depends(get_db)):
    return create_user(db, user)
