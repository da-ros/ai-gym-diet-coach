import json
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_identify_foods_returns_list():
    mock_response = {
        "response": '[{"food": "grilled chicken", "estimated_grams": 180}, {"food": "rice", "estimated_grams": 200}]'
    }
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.json.return_value = mock_response
        mock_post.return_value.raise_for_status = lambda: None

        from apps.agents.vision_agent import identify_foods

        result = await identify_foods(b"fake_image_bytes")

    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["food"] == "grilled chicken"
    assert result[0]["estimated_grams"] == 180


@pytest.mark.asyncio
async def test_identify_foods_handles_empty_response():
    mock_response = {"response": "I cannot identify this image."}
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.json.return_value = mock_response
        mock_post.return_value.raise_for_status = lambda: None

        from apps.agents.vision_agent import identify_foods

        result = await identify_foods(b"fake_image_bytes")

    assert result == []
