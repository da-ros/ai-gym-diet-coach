from datetime import datetime, date
from sqlalchemy import String, Float, Integer, Date, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    goal: Mapped[str] = mapped_column(String(20), default="lean_bulk")  # bulk | cut | lean_bulk
    body_weight_kg: Mapped[float] = mapped_column(Float, default=75.0)
    protein_target_g: Mapped[float] = mapped_column(Float, default=165.0)
    calorie_target: Mapped[int] = mapped_column(Integer, default=2800)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    meals: Mapped[list["Meal"]] = relationship("Meal", back_populates="user")
    daily_logs: Mapped[list["DailyLog"]] = relationship("DailyLog", back_populates="user")


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user_profiles.user_id"), default=None)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    photo_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    dish_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    foods_identified: Mapped[list] = mapped_column(JSON, default=list)
    macros: Mapped[dict] = mapped_column(JSON, default=dict)
    micros: Mapped[dict] = mapped_column(JSON, default=dict)

    protein_g: Mapped[float] = mapped_column(Float, default=0.0)
    is_protein_spike: Mapped[bool] = mapped_column(default=False)
    nudge: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["UserProfile"] = relationship("UserProfile", back_populates="meals")


class DailyLog(Base):
    __tablename__ = "daily_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user_profiles.user_id"), default=None)
    date: Mapped[date] = mapped_column(Date, default=date.today)

    total_calories: Mapped[float] = mapped_column(Float, default=0.0)
    total_protein_g: Mapped[float] = mapped_column(Float, default=0.0)
    total_carbs_g: Mapped[float] = mapped_column(Float, default=0.0)
    total_fats_g: Mapped[float] = mapped_column(Float, default=0.0)
    fiber_g: Mapped[float] = mapped_column(Float, default=0.0)
    sodium_mg: Mapped[float] = mapped_column(Float, default=0.0)
    potassium_mg: Mapped[float] = mapped_column(Float, default=0.0)

    protein_spikes: Mapped[list] = mapped_column(JSON, default=list)

    user: Mapped["UserProfile"] = relationship("UserProfile", back_populates="daily_logs")

    @property
    def mps_score(self) -> dict:
        achieved = len(self.protein_spikes or [])
        target = 4
        return {"achieved": achieved, "target": target, "label": f"{achieved} / {target} protein spikes"}
