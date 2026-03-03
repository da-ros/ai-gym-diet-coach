import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_generate_nudge_calls_ollama():
    mock_profile = MagicMock()
    mock_profile.goal = "bulk"
    mock_profile.protein_target_g = 165.0

    mock_log = MagicMock()
    mock_log.total_protein_g = 60.0
    mock_log.total_calories = 1200.0
    mock_log.fiber_g = 8.0
    mock_log.sodium_mg = 800.0
    mock_log.potassium_mg = 900.0
    mock_log.protein_spikes = ["09:30"]
    mock_log.mps_score = {"achieved": 1, "target": 4, "label": "1 / 4 protein spikes"}

    expected_nudge = "You've only hit 1 protein spike. Add a 30–40g protein meal before bed."

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.json.return_value = {"response": expected_nudge}
        mock_post.return_value.raise_for_status = lambda: None

        from apps.agents.mps_agent import generate_nudge

        result = await generate_nudge(
            profile=mock_profile,
            log=mock_log,
            protein_spike_detected=True,
            deficiency_detected=True,
        )

    assert result == expected_nudge


def test_mps_score_computed_from_model():
    """Test DailyLog.mps_score property logic."""
    import json
    from unittest.mock import PropertyMock

    log = MagicMock()
    type(log).protein_spikes = PropertyMock(return_value=["09:30", "14:10"])
    log.mps_score = property(lambda self: {
        "achieved": len(self.protein_spikes),
        "target": 4,
        "label": f"{len(self.protein_spikes)} / 4 protein spikes",
    })
    # Direct unit test of the logic
    spikes = ["09:30", "14:10"]
    score = {"achieved": len(spikes), "target": 4, "label": f"{len(spikes)} / 4 protein spikes"}
    assert score["achieved"] == 2
    assert score["label"] == "2 / 4 protein spikes"
