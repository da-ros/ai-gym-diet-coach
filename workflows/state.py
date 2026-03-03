from typing import TypedDict, Optional


class FoodItem(TypedDict):
    food: str
    estimated_grams: int


class Macros(TypedDict):
    calories: float
    protein_g: float
    carbs_g: float
    fats_g: float


class Micros(TypedDict):
    fiber_g: float
    sodium_mg: float
    potassium_mg: float


class MealFlowState(TypedDict):
    # Input
    user_id: str
    image_bytes: bytes
    photo_path: str

    # Vision agent output
    foods: list[FoodItem]
    dish_name: Optional[str]

    # Nutrition agent output
    macros: Macros
    micros: Micros

    # Context update output
    meal_id: int
    logged_at: str
    protein_spike_detected: bool
    deficiency_detected: bool

    # Coaching agent output (optional)
    nudge: Optional[str]
