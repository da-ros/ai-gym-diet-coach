from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..context.database import get_db
from ..context.models import DailyLog, Meal, UserProfile
from ..schemas.summary import DailySummaryResponse, MealSummaryItem, WeeklyMacroDay, WeeklySummaryResponse
from ..auth import get_current_user

router = APIRouter()


def _meals_for_today(user_id: str, today: date, db: Session) -> list[MealSummaryItem]:
    """Today's meals, most recent first (server local date)."""
    start = datetime.combine(today, datetime.min.time())
    end = datetime.combine(today + timedelta(days=1), datetime.min.time())
    uid = str(user_id)  # normalize for UUID column comparison
    rows = (
        db.query(Meal)
        .filter(
            Meal.user_id == uid,
            Meal.logged_at >= start,
            Meal.logged_at < end,
        )
        .order_by(Meal.logged_at.desc())
        .all()
    )
    return [
        MealSummaryItem(
            id=m.id,
            logged_at=m.logged_at,
            protein_g=m.protein_g,
            dish_name=getattr(m, "dish_name", None),
            label=(m.dish_name or ", ".join(f.get("food", "") for f in (m.foods_identified or [])[:3]) or "Meal"),
        )
        for m in rows
    ]


@router.get("/daily-summary", response_model=DailySummaryResponse)
def get_daily_summary(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    uid = str(user_id)
    profile = db.query(UserProfile).filter(UserProfile.user_id == uid).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Log a meal first.")

    log = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == uid, DailyLog.date == today)
        .first()
    )
    today_meals = _meals_for_today(uid, today, db)
    meals_count = len(today_meals)

    if not log:
        return DailySummaryResponse(
            date=today,
            user_id=user_id,
            goal=profile.goal,
            protein_target_g=profile.protein_target_g,
            calorie_target=profile.calorie_target,
            total_calories=0,
            total_protein_g=0,
            total_carbs_g=0,
            total_fats_g=0,
            fiber_g=0,
            sodium_mg=0,
            potassium_mg=0,
            mps_score={"achieved": 0, "target": 4, "label": "0 / 4 protein spikes"},
            protein_spikes=[],
            meals_count=0,
            meals=[],
        )

    return DailySummaryResponse(
        date=log.date,
        user_id=user_id,
        goal=profile.goal,
        protein_target_g=profile.protein_target_g,
        calorie_target=profile.calorie_target,
        total_calories=log.total_calories,
        total_protein_g=log.total_protein_g,
        total_carbs_g=log.total_carbs_g,
        total_fats_g=log.total_fats_g,
        fiber_g=log.fiber_g,
        sodium_mg=log.sodium_mg,
        potassium_mg=log.potassium_mg,
        mps_score=log.mps_score,
        protein_spikes=log.protein_spikes,
        meals_count=meals_count,
        meals=today_meals,
    )


@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
def get_weekly_summary(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    seven_days_ago = today - timedelta(days=6)

    logs = (
        db.query(DailyLog)
        .filter(
            DailyLog.user_id == user_id,
            DailyLog.date >= seven_days_ago,
            DailyLog.date <= today,
        )
        .order_by(DailyLog.date)
        .all()
    )

    days = [
        WeeklyMacroDay(
            date=log.date,
            total_calories=log.total_calories,
            total_protein_g=log.total_protein_g,
            total_carbs_g=log.total_carbs_g,
            total_fats_g=log.total_fats_g,
            mps_score=log.mps_score,
        )
        for log in logs
    ]

    return WeeklySummaryResponse(user_id=user_id, days=days)
