import os
import uuid
from datetime import date
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Path
from sqlalchemy.orm import Session

from ..context.database import get_db
from ..context.models import DailyLog, Meal, UserProfile
from ..schemas.meals import MealResponse
from ..config import settings
from ..auth import get_current_user

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _get_or_create_profile(user_id: str, db: Session) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _get_or_create_daily_log(user_id: str, db: Session) -> DailyLog:
    today = date.today()
    log = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id, DailyLog.date == today)
        .first()
    )
    if not log:
        log = DailyLog(user_id=user_id, date=today)
        db.add(log)
        db.commit()
        db.refresh(log)
    return log


@router.post("/meals", response_model=MealResponse)
async def log_meal(
    photo: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Ensure user profile exists
    _get_or_create_profile(user_id, db)

    # Save photo to disk
    ext = os.path.splitext(photo.filename or "meal.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    photo_path = os.path.join(UPLOAD_DIR, filename)
    content = await photo.read()
    with open(photo_path, "wb") as f:
        f.write(content)

    # Run LangGraph meal pipeline
    from workflows.graphs.meal_flow import run_meal_flow

    result = await run_meal_flow(
        user_id=user_id,
        image_bytes=content,
        photo_path=photo_path,
        db=db,
    )

    daily_log = _get_or_create_daily_log(user_id, db)

    return MealResponse(
        meal_id=result["meal_id"],
        logged_at=result["logged_at"],
        foods_identified=result["foods"],
        macros=result["macros"],
        micros=result["micros"],
        is_protein_spike=result["protein_spike_detected"],
        nudge=result.get("nudge"),
        mps_score=daily_log.mps_score,
    )


@router.get("/meals/{meal_id}", response_model=MealResponse)
def get_meal(
    meal_id: int = Path(..., ge=1),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meal = (
        db.query(Meal)
        .filter(Meal.id == meal_id, Meal.user_id == user_id)
        .first()
    )
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    daily_log = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id, DailyLog.date == meal.logged_at.date())
        .first()
    )
    mps_score = daily_log.mps_score if daily_log else {"label": "—"}

    return MealResponse(
        meal_id=meal.id,
        logged_at=meal.logged_at,
        foods_identified=meal.foods_identified or [],
        macros=meal.macros or {},
        micros=meal.micros or {},
        is_protein_spike=meal.is_protein_spike or False,
        nudge=meal.nudge,
        mps_score=mps_score,
    )
