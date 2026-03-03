import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { getMeal } from "@/lib/api";

interface FoodItem {
  food: string;
  estimated_grams: number;
}

interface MealData {
  meal_id: number;
  logged_at: string;
  foods_identified: FoodItem[];
  macros: { calories: number; protein_g: number; carbs_g: number; fats_g: number };
  micros: { fiber_g: number; sodium_mg: number; potassium_mg: number };
  is_protein_spike: boolean;
  nudge: string | null;
  mps_score: { label: string };
}

const MealDetail = () => {
  const { mealId } = useParams<{ mealId: string }>();
  const navigate = useNavigate();
  const [meal, setMeal] = useState<MealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mealId) return;
    getMeal(Number(mealId))
      .then(setMeal)
      .catch((e) => setError(e.message ?? "Failed to load meal"))
      .finally(() => setLoading(false));
  }, [mealId]);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/home")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-display">Meal Details</h1>
        </div>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/home")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-display">Meal Details</h1>
        </div>
        <p className="text-sm text-destructive text-center py-8">{error ?? "Meal not found"}</p>
        <button
          onClick={() => navigate("/home")}
          className="w-full py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-6 pb-4 space-y-4"
    >
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/home")} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-display">Meal Details</h1>
      </div>

      <p className="text-xs text-muted-foreground">Logged at {formatTime(meal.logged_at)}</p>

      {meal.is_protein_spike && (
        <div className="card-subtle p-3 flex items-center gap-2 border border-primary/20">
          <span className="text-primary text-lg">⚡</span>
          <p className="text-sm font-semibold text-primary">
            Protein spike! {meal.mps_score.label}
          </p>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-2">Identified Foods</p>
        {(meal.foods_identified || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No foods identified</p>
        ) : (
          <div className="space-y-1.5">
            {meal.foods_identified.map((food, i) => (
              <div
                key={i}
                className="card-subtle p-4 flex justify-between items-center"
              >
                <span className="text-sm font-medium capitalize">{food.food}</span>
                <span className="text-sm text-muted-foreground">{food.estimated_grams}g</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-subtle p-4">
        <p className="text-xs text-muted-foreground mb-3 font-semibold">Nutrition</p>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="flex justify-between pr-4">
            <span>Calories</span>
            <span className="font-bold">{Math.round(meal.macros.calories)} kcal</span>
          </div>
          <div className="flex justify-between pl-4">
            <span>Protein</span>
            <span className="font-bold text-primary">{meal.macros.protein_g.toFixed(1)}g</span>
          </div>
          <div className="flex justify-between pr-4">
            <span>Carbs</span>
            <span className="font-bold">{meal.macros.carbs_g.toFixed(1)}g</span>
          </div>
          <div className="flex justify-between pl-4">
            <span>Fats</span>
            <span className="font-bold">{meal.macros.fats_g.toFixed(1)}g</span>
          </div>
        </div>
      </div>

      <div className="card-subtle p-4">
        <p className="text-xs text-muted-foreground mb-3 font-semibold">Micronutrients</p>
        <div className="grid grid-cols-3 gap-2 text-sm text-center">
          <div>
            <p className="text-xs text-muted-foreground">Fiber</p>
            <p className="font-bold">{meal.micros.fiber_g.toFixed(1)}g</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sodium</p>
            <p className="font-bold">{Math.round(meal.micros.sodium_mg)} mg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Potassium</p>
            <p className="font-bold">{Math.round(meal.micros.potassium_mg)}</p>
          </div>
        </div>
      </div>

      {meal.nudge && (
        <div className="card-subtle p-4 flex gap-3">
          <span className="text-2xl">💪</span>
          <p className="text-sm leading-relaxed">{meal.nudge}</p>
        </div>
      )}

      <button
        onClick={() => navigate("/home")}
        className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
      >
        Back to Home
      </button>
    </motion.div>
  );
};

export default MealDetail;
