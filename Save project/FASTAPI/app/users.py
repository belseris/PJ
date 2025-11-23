# app/users.py
from fastapi import APIRouter, Depends, Request
from .schemas import UserOut
from .deps import get_current_user
from .models_user import User

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserOut)
def me(request: Request, current_user: User = Depends(get_current_user)):
    # debug header
    print("AUTH HEADER:", request.headers.get("authorization"))
    return UserOut.model_validate(current_user, from_attributes=True)
