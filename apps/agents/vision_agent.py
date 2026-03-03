"""
Vision Agent — sends a meal photo to Claude (claude-sonnet-4-6) and returns
a structured list of food items with estimated gram weights.
"""
import base64
import json
import re
import anthropic
from apps.mcp_server.config import settings

_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = (
    "You are a food recognition expert. When given a meal photo, you identify the dish/meal name "
    "and list all food items with estimated portion sizes in grams. "
    "Respond ONLY with a valid JSON object with two keys: "
    '"dish" (a short, descriptive name for the meal, e.g. "Burrito", "Beef with broccoli", "Chicken salad") '
    'and "foods" (an array where each element has "food" and "estimated_grams"). '
    'Example: {"dish": "Chicken burrito", "foods": [{"food": "flour tortilla", "estimated_grams": 50}, {"food": "grilled chicken", "estimated_grams": 150}]}'
)

USER_PROMPT = (
    "Look at this meal photo carefully. "
    "1) Give a short dish name (e.g. Burrito, Beef with broccoli, Chicken stir-fry). "
    "2) List every food item and estimate the weight in grams for each. "
    "Return ONLY a JSON object: "
    '{"dish": "short dish name", "foods": [{"food": "item", "estimated_grams": N}, ...]}'
)


def _detect_media_type(image_bytes: bytes) -> str:
    if image_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if image_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    if image_bytes[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return "image/jpeg"  # safe fallback for most meal photos


async def identify_foods(image_bytes: bytes) -> tuple[list[dict], str | None]:
    """
    Send image to Claude vision. Returns (foods, dish_name).
    foods: list of {food: str, estimated_grams: int}
    dish_name: short meal summary (e.g. "Burrito", "Beef with broccoli") or None
    """
    b64_image = base64.standard_b64encode(image_bytes).decode("utf-8")
    media_type = _detect_media_type(image_bytes)

    message = await _client.messages.create(
        model=settings.CLAUDE_VISION_MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_image,
                        },
                    },
                    {"type": "text", "text": USER_PROMPT},
                ],
            }
        ],
    )

    raw_text = message.content[0].text if message.content else "{}"

    # Try object format first: {"dish": "...", "foods": [...]}
    obj_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if obj_match:
        try:
            data = json.loads(obj_match.group())
            if isinstance(data, dict) and "foods" in data:
                foods = [
                    {"food": str(item["food"]), "estimated_grams": int(item["estimated_grams"])}
                    for item in data["foods"]
                    if isinstance(item, dict) and "food" in item and "estimated_grams" in item
                ]
                dish = str(data["dish"]).strip() if data.get("dish") else None
                return (foods, dish)
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    # Fallback: legacy array format
    arr_match = re.search(r"\[.*\]", raw_text, re.DOTALL)
    if arr_match:
        try:
            foods = json.loads(arr_match.group())
            return (
                [
                    {"food": str(item["food"]), "estimated_grams": int(item["estimated_grams"])}
                    for item in foods
                    if isinstance(item, dict) and "food" in item and "estimated_grams" in item
                ],
                None,
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    return ([], None)
