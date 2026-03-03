from datetime import date, datetime
from pydantic import BaseModel


class MealSummaryItem(BaseModel):
    id: int
    logged_at: datetime
    protein_g: float
    dish_name: str | None = None
    label: str


class DailySummaryResponse(BaseModel):
    date: date
    user_id: str
    goal: str
    protein_target_g: float
    calorie_target: int
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fats_g: float
    fiber_g: float
    sodium_mg: float
    potassium_mg: float
    mps_score: dict
    protein_spikes: list[str]
    meals_count: int
    meals: list[MealSummaryItem] = []


class WeeklyMacroDay(BaseModel):
    date: date
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fats_g: float
    mps_score: dict


class WeeklySummaryResponse(BaseModel):
    user_id: str
    days: list[WeeklyMacroDay]
