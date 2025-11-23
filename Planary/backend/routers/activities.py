from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date as date_type
from db.session import get_db
from models.activity import Activity
from models.user import User
from schemas.activities import ActivityCreate, ActivityUpdate, ActivityOut, ActivityList
from routers.profile import current_user

router = APIRouter(prefix="/activities", tags=["activities"])

@router.get("", response_model=ActivityList)
def list_by_date(qdate: date_type | None = Query(None), db: Session = Depends(get_db), me: User = Depends(current_user)):
    q = db.query(Activity).filter(Activity.user_id == me.id)
    if qdate:
        q = q.filter(Activity.date == qdate)
    q = q.order_by(Activity.all_day.desc(), Activity.time.asc().nullsfirst())
    return ActivityList(items=[ActivityOut.model_validate(x) for x in q.all()])

@router.post("", response_model=ActivityOut, status_code=201)
def create(payload: ActivityCreate, db: Session = Depends(get_db), me: User = Depends(current_user)):
    if payload.all_day: payload.time = None
    row = Activity(user_id=me.id, **payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("/{act_id}", response_model=ActivityOut)
def get_one(act_id: str, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Activity).filter(Activity.id == act_id, Activity.user_id == me.id).first()
    if not row: raise HTTPException(status_code=404, detail="ไม่พบกิจกรรม")
    return row

@router.put("/{act_id}", response_model=ActivityOut)
def update(act_id: str, payload: ActivityUpdate, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Activity).filter(Activity.id == act_id, Activity.user_id == me.id).first()
    if not row: raise HTTPException(status_code=404, detail="ไม่พบกิจกรรม")
    data = payload.model_dump()
    if data["all_day"]: data["time"] = None
    for k, v in data.items(): setattr(row, k, v)
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.delete("/{act_id}", status_code=204)
def delete(act_id: str, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Activity).filter(Activity.id == act_id, Activity.user_id == me.id).first()
    if not row: raise HTTPException(status_code=404, detail="ไม่พบกิจกรรม")
    db.delete(row); db.commit(); return
