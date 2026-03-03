import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def _make_claude_response(payload: dict) -> MagicMock:
    """Build a minimal mock that looks like an anthropic Messages response."""
    msg = MagicMock()
    msg.content = [MagicMock(text=json.dumps(payload))]
    return msg


@pytest.mark.asyncio
async def test_compute_nutrition_aggregates_correctly():
    expected = {
        "calories": 297.0,
        "protein_g": 55.8,
        "carbs_g": 0.0,
        "fats_g": 6.48,
        "fiber_g": 0.0,
        "sodium_mg": 133.2,
        "potassium_mg": 460.8,
    }

    mock_response = _make_claude_response(expected)

    with patch(
        "apps.agents.nutrition_agent._client.messages.create",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        from apps.agents.nutrition_agent import compute_nutrition

        food_items = [{"food": "chicken breast", "estimated_grams": 180}]
        macros, micros = await compute_nutrition(food_items)

    assert macros["protein_g"] == pytest.approx(55.8, rel=0.01)
    assert macros["calories"] == pytest.approx(297.0, rel=0.01)
    assert micros["sodium_mg"] == pytest.approx(133.2, rel=0.01)


@pytest.mark.asyncio
async def test_compute_nutrition_handles_empty_list():
    from apps.agents.nutrition_agent import compute_nutrition

    macros, micros = await compute_nutrition([])

    assert macros == {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fats_g": 0.0}
    assert micros == {"fiber_g": 0.0, "sodium_mg": 0.0, "potassium_mg": 0.0}


@pytest.mark.asyncio
async def test_compute_nutrition_handles_malformed_response():
    mock_response = _make_claude_response({})  # empty JSON — all fields missing

    with patch(
        "apps.agents.nutrition_agent._client.messages.create",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        from apps.agents.nutrition_agent import compute_nutrition

        macros, micros = await compute_nutrition([{"food": "mystery food", "estimated_grams": 100}])

    # Should return zeros gracefully
    assert macros["protein_g"] == 0.0
    assert micros["fiber_g"] == 0.0
