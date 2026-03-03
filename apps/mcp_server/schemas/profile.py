from pydantic import BaseModel
from typing import Literal


class ProfileUpsertRequest(BaseModel):
    goal: Literal["bulk", "cut", "lean_bulk"] = "lean_bulk"
    body_weight_kg: float = 75.0
    protein_target_g: float = 165.0
    calorie_target: int = 2800


class ProfileResponse(BaseModel):
    user_id: str
    goal: str
    body_weight_kg: float
    protein_target_g: float
    calorie_target: int
