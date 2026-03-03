from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..context.database import get_db
from ..context.models import DailyLog, UserProfile
from ..schemas.chat import ChatRequest, ChatResponse
from ..auth import get_current_user

router = APIRouter()


def _spike_times_in_user_tz(
    log_date: date,
    spike_times: list[str],
    user_tz_name: str,
) -> list[str]:
    """Convert HH:MM spike times (server local) to user's timezone and return as HH:MM."""
    if not spike_times or not user_tz_name:
        return spike_times or []
    try:
        server_tz = datetime.now().astimezone().tzinfo or ZoneInfo("UTC")
        user_tz = ZoneInfo(user_tz_name)
    except Exception:
        return spike_times
    out = []
    for hhmm in spike_times:
        try:
            parts = hhmm.split(":")
            h, m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
            dt_naive = datetime.combine(log_date, time(h, m))
            dt_server = dt_naive.replace(tzinfo=server_tz)
            dt_user = dt_server.astimezone(user_tz)
            out.append(dt_user.strftime("%H:%M"))
        except Exception:
            out.append(hhmm)
    return out


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = str(user_id)
    profile = db.query(UserProfile).filter(UserProfile.user_id == uid).first()
    today = date.today()
    log = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == uid, DailyLog.date == today)
        .first()
    )

    # Build context summary for the model
    if profile and log:
        spike_times = log.protein_spikes or []
        if body.timezone:
            spike_times = _spike_times_in_user_tz(log.date, spike_times, body.timezone)
        spike_times_str = ", ".join(spike_times) if spike_times else "none yet"
        context = (
            f"User goal: {profile.goal}. "
            f"Protein target: {profile.protein_target_g}g. "
            f"Calorie target: {profile.calorie_target} kcal.\n"
            f"Today's log ({today}):\n"
            f"  Calories: {log.total_calories:.0f} kcal\n"
            f"  Protein: {log.total_protein_g:.1f}g\n"
            f"  Carbs: {log.total_carbs_g:.1f}g\n"
            f"  Fats: {log.total_fats_g:.1f}g\n"
            f"  Fiber: {log.fiber_g:.1f}g\n"
            f"  Sodium: {log.sodium_mg:.0f}mg\n"
            f"  Potassium: {log.potassium_mg:.0f}mg\n"
            f"  MPS: {log.mps_score['label']}\n"
            f"  Protein spike times (user local): {spike_times_str}"
        )
    elif profile:
        context = (
            f"User goal: {profile.goal}. "
            f"Protein target: {profile.protein_target_g}g. "
            f"No meals logged today yet."
        )
    else:
        context = "No user profile found. The user has not logged any meals yet."

    if body.timeline_summary:
        context += f"\n\n{body.timeline_summary}"

    from apps.agents.mps_agent import generate_chat_reply

    reply = await generate_chat_reply(
        user_message=body.message,
        daily_context=context,
        history=[{"role": m.role, "text": m.text} for m in body.history],
    )
    return ChatResponse(reply=reply)
