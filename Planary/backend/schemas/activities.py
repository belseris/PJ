from __future__ import annotations

from datetime import date, time as dt_time
from uuid import UUID
from pydantic import BaseModel, Field

class ActivityCreate(BaseModel):
    date: date
    all_day: bool = False
    time: dt_time | None = None
    title: str = Field(..., min_length=1, max_length=200)
    category: str | None = None
    status: str = "normal"
    remind: bool = False
    remind_offset_min: int = 5
    notes: str | None = None

class ActivityUpdate(BaseModel):
    date: date
    all_day: bool = False
    time: dt_time | None = None
    title: str = Field(..., min_length=1, max_length=200)
    category: str | None = None
    status: str = "normal"
    remind: bool = False
    remind_offset_min: int = 5
    notes: str | None = None

class ActivityOut(BaseModel):
    id: UUID                  # << เปลี่ยนจาก str เป็น UUID
    date: date
    all_day: bool
    time: dt_time | None
    title: str
    category: str | None
    status: str
    remind: bool
    remind_offset_min: int
    notes: str | None

    class Config:
        from_attributes = True

class ActivityList(BaseModel):
    items: list[ActivityOut]
