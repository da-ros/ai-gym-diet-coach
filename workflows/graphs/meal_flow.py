"""
LangGraph DAG for the meal logging flow.

START → vision_node → nutrition_node → update_context_node
                                          ↓ (conditional)
                               should_coach? → coaching_node → END
                                          ↓ (no)
                                         END
"""
from datetime import datetime, date
from typing import Literal

from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session

from workflows.state import MealFlowState
from apps.agents.vision_agent import identify_foods
from apps.agents.nutrition_agent import compute_nutrition
from apps.mcp_server.config import settings


# ── Nodes ──────────────────────────────────────────────────────────────────

async def vision_node(state: MealFlowState) -> dict:
    foods, dish_name = await identify_foods(state["image_bytes"])
    return {"foods": foods, "dish_name": dish_name}


async def nutrition_node(state: MealFlowState) -> dict:
    macros, micros = await compute_nutrition(state["foods"])
    return {"macros": macros, "micros": micros}


async def update_context_node(state: MealFlowState, db: Session) -> dict:
    from apps.mcp_server.context.models import Meal, DailyLog, UserProfile
    from sqlalchemy.orm.attributes import flag_modified

    user_id = str(state["user_id"])
    macros = state["macros"]
    micros = state["micros"]
    now = datetime.now()
    today = now.date()

    # Ensure profile exists
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)

    # Persist meal
    meal = Meal(
        user_id=user_id,
        logged_at=now,
        photo_path=state.get("photo_path"),
        dish_name=state.get("dish_name"),
        protein_g=macros["protein_g"],
        foods_identified=state["foods"],
        macros=macros,
        micros=micros,
    )

    # Detect protein spike
    protein_spike = macros["protein_g"] >= settings.PROTEIN_SPIKE_THRESHOLD_G
    meal.is_protein_spike = protein_spike

    db.add(meal)
    db.flush()  # get meal.id

    # Update or create daily log
    log = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id, DailyLog.date == today)
        .first()
    )
    if not log:
        log = DailyLog(user_id=user_id, date=today)
        db.add(log)

    log.total_calories = (log.total_calories or 0.0) + macros["calories"]
    log.total_protein_g = (log.total_protein_g or 0.0) + macros["protein_g"]
    log.total_carbs_g = (log.total_carbs_g or 0.0) + macros["carbs_g"]
    log.total_fats_g = (log.total_fats_g or 0.0) + macros["fats_g"]
    log.fiber_g = (log.fiber_g or 0.0) + micros["fiber_g"]
    log.sodium_mg = (log.sodium_mg or 0.0) + micros["sodium_mg"]
    log.potassium_mg = (log.potassium_mg or 0.0) + micros["potassium_mg"]

    if protein_spike:
        spikes = list(log.protein_spikes or [])
        spikes.append(now.strftime("%H:%M"))
        log.protein_spikes = spikes
        flag_modified(log, "protein_spikes")

    db.commit()
    db.refresh(meal)
    db.refresh(log)

    # Detect micronutrient deficiency (simple thresholds relative to daily targets)
    deficiency = (
        log.fiber_g < 10.0       # below half of ~25g daily target
        or log.sodium_mg < 500   # notably low for a training day
        or log.potassium_mg < 1000
    )

    return {
        "meal_id": meal.id,
        "logged_at": now.isoformat(),
        "protein_spike_detected": protein_spike,
        "deficiency_detected": deficiency,
        "nudge": None,
    }


async def coaching_node(state: MealFlowState, db: Session) -> dict:
    from apps.mcp_server.context.models import DailyLog, UserProfile
    from apps.agents.mps_agent import generate_nudge

    user_id = str(state["user_id"])
    today = date.today()

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    log = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id, DailyLog.date == today)
        .first()
    )

    nudge = await generate_nudge(
        profile=profile,
        log=log,
        protein_spike_detected=state["protein_spike_detected"],
        deficiency_detected=state["deficiency_detected"],
    )

    # Persist nudge back on the meal
    from apps.mcp_server.context.models import Meal

    meal = db.query(Meal).filter(Meal.id == state["meal_id"]).first()
    if meal:
        meal.nudge = nudge
        db.commit()

    return {"nudge": nudge}


# ── Routing ────────────────────────────────────────────────────────────────

def should_coach(state: MealFlowState) -> Literal["coaching_node", "__end__"]:
    if state.get("protein_spike_detected") or state.get("deficiency_detected"):
        return "coaching_node"
    return "__end__"


# ── Graph assembly ─────────────────────────────────────────────────────────

async def run_meal_flow(
    user_id: str,
    image_bytes: bytes,
    photo_path: str,
    db: Session,
) -> dict:
    """Entry point called by the /meals route."""
    from langgraph.graph import StateGraph

    # Re-build with db injected — must use async wrappers so LangGraph awaits them
    async def _update_context(s: MealFlowState) -> dict:
        return await update_context_node(s, db)

    async def _coaching(s: MealFlowState) -> dict:
        return await coaching_node(s, db)

    g = StateGraph(MealFlowState)
    g.add_node("vision_node", vision_node)
    g.add_node("nutrition_node", nutrition_node)
    g.add_node("update_context_node", _update_context)
    g.add_node("coaching_node", _coaching)
    g.set_entry_point("vision_node")
    g.add_edge("vision_node", "nutrition_node")
    g.add_edge("nutrition_node", "update_context_node")
    g.add_conditional_edges("update_context_node", should_coach)
    g.add_edge("coaching_node", END)
    compiled = g.compile()

    initial_state: MealFlowState = {
        "user_id": user_id,
        "image_bytes": image_bytes,
        "photo_path": photo_path,
        "foods": [],
        "macros": {"calories": 0, "protein_g": 0, "carbs_g": 0, "fats_g": 0},
        "micros": {"fiber_g": 0, "sodium_mg": 0, "potassium_mg": 0},
        "meal_id": 0,
        "logged_at": "",
        "protein_spike_detected": False,
        "deficiency_detected": False,
        "nudge": None,
    }

    final_state = await compiled.ainvoke(initial_state)
    return final_state
