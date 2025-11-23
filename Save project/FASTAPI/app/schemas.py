from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict ,field_validator, model_validator, constr 

class RegisterRequest(BaseModel):
    email: EmailStr
    username: constr(min_length=3, max_length=30)
    gender: Optional[str] = None
    age: Optional[int] = None
    password: constr(min_length=6)
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ShowUser(BaseModel):
    id: int
    email: EmailStr
    username: str
    gender: Optional[str] = None
    age: Optional[int] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    gender: Optional[str] = None
    age: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"