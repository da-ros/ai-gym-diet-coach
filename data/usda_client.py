"""
USDA FoodData Central API client.
Docs: https://api.nal.usda.gov/fdc/v1/
Free API key: https://fdc.nal.usda.gov/api-guide.html
"""
import httpx
from apps.mcp_server.config import settings

USDA_BASE = "https://api.nal.usda.gov/fdc/v1"

# Nutrient IDs in USDA FoodData Central
NUTRIENT_IDS = {
    "calories": 1008,    # Energy (kcal)
    "protein_g": 1003,   # Protein
    "carbs_g": 1005,     # Carbohydrate, by difference
    "fats_g": 1004,      # Total lipid (fat)
    "fiber_g": 1079,     # Fiber, total dietary
    "sodium_mg": 1093,   # Sodium, Na
    "potassium_mg": 1092, # Potassium, K
}


def _extract_nutrients(food_item: dict, grams: float) -> dict:
    """Extract and scale nutrient values from a USDA food item."""
    nutrients = {item["nutrientId"]: item for item in food_item.get("foodNutrients", [])}
    scale = grams / 100.0  # USDA values are per 100g

    result = {}
    for key, nutrient_id in NUTRIENT_IDS.items():
        nutrient = nutrients.get(nutrient_id)
        if nutrient:
            result[key] = round((nutrient.get("value") or 0.0) * scale, 2)
        else:
            result[key] = 0.0
    return result


async def get_nutrients_for_food(food_name: str, grams: float) -> dict:
    """
    Query USDA FoodData Central for a food item and return scaled nutrients.
    Returns a dict with keys: calories, protein_g, carbs_g, fats_g, fiber_g, sodium_mg, potassium_mg
    """
    if not settings.USDA_API_KEY:
        # Fallback: return zeroed nutrients (allows dev without API key)
        return {k: 0.0 for k in NUTRIENT_IDS}

    params = {
        "query": food_name,
        "dataType": "Foundation,SR Legacy",  # Use verified lab-tested data only
        "pageSize": 1,
        "api_key": settings.USDA_API_KEY,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{USDA_BASE}/foods/search", params=params)
        response.raise_for_status()
        data = response.json()

    foods = data.get("foods", [])
    if not foods:
        return {k: 0.0 for k in NUTRIENT_IDS}

    return _extract_nutrients(foods[0], grams)


async def get_nutrients_for_meal(food_items: list[dict]) -> tuple[dict, dict]:
    """
    Given a list of {food, estimated_grams} items, return aggregated macros and micros.
    Returns (macros_dict, micros_dict).
    """
    totals = {k: 0.0 for k in NUTRIENT_IDS}

    for item in food_items:
        nutrients = await get_nutrients_for_food(item["food"], item["estimated_grams"])
        for key in totals:
            totals[key] += nutrients.get(key, 0.0)

    macros = {
        "calories": round(totals["calories"], 1),
        "protein_g": round(totals["protein_g"], 1),
        "carbs_g": round(totals["carbs_g"], 1),
        "fats_g": round(totals["fats_g"], 1),
    }
    micros = {
        "fiber_g": round(totals["fiber_g"], 1),
        "sodium_mg": round(totals["sodium_mg"], 1),
        "potassium_mg": round(totals["potassium_mg"], 1),
    }
    return macros, micros
