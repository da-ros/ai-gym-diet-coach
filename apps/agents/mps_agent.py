"""
MPS & Coaching Agent — generates evidence-based coaching nudges and handles
the /chat endpoint's AI replies. Uses Claude (claude-haiku-4-5).
"""
import anthropic
from apps.mcp_server.config import settings

_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

NUDGE_SYSTEM_PROMPT = """You are a precision dietary coach for serious gym-goers.
Your role is to give short (1-2 sentence), evidence-based, actionable nudges about nutrition.
Rules:
- Only reference the actual data provided. Never invent numbers.
- Gym-oriented, performance-focused tone.
- No generic motivational phrases or quotes.
- Be direct and specific.
"""

CHAT_SYSTEM_PROMPT = """You are a precision dietary coach for serious gym-goers.
Answer questions about nutrition, macros, MPS, and training performance.
Rules:
- ONLY refer to data explicitly present in the user's daily log context provided below.
- If data is missing or unclear, say so explicitly rather than guessing.
- No generic motivational phrases. Be direct and evidence-based.
- Keep responses under 4 sentences unless more detail is clearly needed.
"""


async def _call_claude_text(system: str, prompt: str) -> str:
    message = await _client.messages.create(
        model=settings.CLAUDE_TEXT_MODEL,
        max_tokens=512,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip() if message.content else ""


async def generate_nudge(
    profile,
    log,
    protein_spike_detected: bool,
    deficiency_detected: bool,
) -> str:
    """
    Generate a 1-2 sentence coaching nudge based on today's data.
    Called from the coaching_node in the LangGraph DAG.
    """
    if not profile or not log:
        return ""

    mps = log.mps_score
    prompt_parts = [
        f"User goal: {profile.goal}.",
        f"Protein target: {profile.protein_target_g}g.",
        f"Today so far — Protein: {log.total_protein_g:.1f}g, "
        f"Calories: {log.total_calories:.0f} kcal.",
        f"MPS status: {mps['label']}.",
        f"Fiber: {log.fiber_g:.1f}g, Sodium: {log.sodium_mg:.0f}mg, "
        f"Potassium: {log.potassium_mg:.0f}mg.",
    ]

    if protein_spike_detected:
        prompt_parts.append(
            f"A protein spike was just detected (meal ≥ {settings.PROTEIN_SPIKE_THRESHOLD_G}g protein). "
            f"Spike times today: {', '.join(log.protein_spikes)}."
        )
    if deficiency_detected:
        prompt_parts.append(
            "A micronutrient deficiency was detected (low fiber, sodium, or potassium)."
        )

    prompt_parts.append(
        "Give a single, specific 1-2 sentence coaching nudge for what the user should do next."
    )

    return await _call_claude_text(NUDGE_SYSTEM_PROMPT, " ".join(prompt_parts))


async def generate_chat_reply(
    user_message: str,
    daily_context: str,
    history: list[dict] | None = None,
) -> str:
    """
    Generate a grounded chat response. Uses daily context + optional conversation
    history so the model can follow up on previous answers.
    """
    system = f"{CHAT_SYSTEM_PROMPT}\n\n[Today's data — use this for all answers]\n{daily_context}"
    history = history or []
    messages = [{"role": m["role"], "content": m["text"]} for m in history]
    messages.append({"role": "user", "content": user_message})

    reply = await _client.messages.create(
        model=settings.CLAUDE_TEXT_MODEL,
        max_tokens=512,
        system=system,
        messages=messages,
    )
    return reply.content[0].text.strip() if reply.content else ""
