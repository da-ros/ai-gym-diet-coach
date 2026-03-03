"""
Nutrition Agent — asks Claude to estimate macros and micros for a list of
food items (identified by the vision agent) with their gram weights.
Replaces the USDA FoodData Central lookup, which fails on composite or
non-standard food names.
"""
import json
import re
import anthropic
from apps.mcp_server.config import settings

_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = (
    "You are a precise nutrition expert with deep knowledge of food composition. "
    "Given a list of food items and their weights in grams, estimate the total "
    "nutritional content for the entire meal. Use standard food composition data. "
    "Respond ONLY with a valid JSON object — no prose, no markdown."
)

_KEYS = ("calories", "protein_g", "carbs_g", "fats_g", "fiber_g", "sodium_mg", "potassium_mg")


def _build_prompt(food_items: list[dict]) -> str:
    lines = "\n".join(
        f"- {item['food']}: {item['estimated_grams']}g" for item in food_items
    )
    return (
        f"Food items in this meal:\n{lines}\n\n"
        "Return ONLY a JSON object with these exact keys and numeric values:\n"
        '{"calories": <kcal>, "protein_g": <g>, "carbs_g": <g>, "fats_g": <g>, '
        '"fiber_g": <g>, "sodium_mg": <mg>, "potassium_mg": <mg>}'
    )


async def compute_nutrition(food_items: list[dict]) -> tuple[dict, dict]:
    """
    food_items: list of {food: str, estimated_grams: int}
    Returns: (macros, micros)
      macros: {calories, protein_g, carbs_g, fats_g}
      micros: {fiber_g, sodium_mg, potassium_mg}
    """
    if not food_items:
        return (
            {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fats_g": 0.0},
            {"fiber_g": 0.0, "sodium_mg": 0.0, "potassium_mg": 0.0},
        )

    message = await _client.messages.create(
        model=settings.CLAUDE_TEXT_MODEL,
        max_tokens=256,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_prompt(food_items)}],
    )

    raw = message.content[0].text if message.content else "{}"

    # Extract JSON object even if the model wraps it in backticks/prose
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    try:
        data = json.loads(match.group()) if match else {}
    except (json.JSONDecodeError, AttributeError):
        data = {}

    def _v(key: str) -> float:
        return round(float(data.get(key, 0.0)), 1)

    macros = {
        "calories": _v("calories"),
        "protein_g": _v("protein_g"),
        "carbs_g": _v("carbs_g"),
        "fats_g": _v("fats_g"),
    }
    micros = {
        "fiber_g": _v("fiber_g"),
        "sodium_mg": _v("sodium_mg"),
        "potassium_mg": _v("potassium_mg"),
    }
    return macros, micros
