from datetime import datetime
from pydantic import BaseModel


class FoodItem(BaseModel):
    food: str
    estimated_grams: int


class Macros(BaseModel):
    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fats_g: float = 0.0


class Micros(BaseModel):
    fiber_g: float = 0.0
    sodium_mg: float = 0.0
    potassium_mg: float = 0.0


class MealResponse(BaseModel):
    meal_id: int
    logged_at: datetime
    foods_identified: list[FoodItem]
    macros: Macros
    micros: Micros
    is_protein_spike: bool
    nudge: str | None
    mps_score: dict
