from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import CORS_ORIGINS
from .database import Base, engine
from . import models_user  # สำคัญ: import models เพื่อให้ตารางถูก register
from .auth import router as auth_router
from .users import router as users_router

app = FastAPI(title="Diary API")

# สร้างตารางครั้งแรก (หลัง import models แล้ว)
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
