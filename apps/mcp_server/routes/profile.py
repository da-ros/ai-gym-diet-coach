from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..context.database import get_db
from ..context.models import UserProfile
from ..schemas.profile import ProfileUpsertRequest, ProfileResponse
from ..auth import get_current_user

router = APIRouter()


@router.put("/profile", response_model=ProfileResponse)
def upsert_profile(
    body: ProfileUpsertRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile:
        profile.goal = body.goal
        profile.body_weight_kg = body.body_weight_kg
        profile.protein_target_g = body.protein_target_g
        profile.calorie_target = body.calorie_target
    else:
        profile = UserProfile(
            user_id=user_id,
            goal=body.goal,
            body_weight_kg=body.body_weight_kg,
            protein_target_g=body.protein_target_g,
            calorie_target=body.calorie_target,
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return ProfileResponse(
        user_id=str(profile.user_id),
        goal=profile.goal,
        body_weight_kg=getattr(profile, "body_weight_kg", 75.0),
        protein_target_g=profile.protein_target_g,
        calorie_target=profile.calorie_target,
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return ProfileResponse(
        user_id=str(profile.user_id),
        goal=profile.goal,
        body_weight_kg=getattr(profile, "body_weight_kg", 75.0),
        protein_target_g=profile.protein_target_g,
        calorie_target=profile.calorie_target,
    )
