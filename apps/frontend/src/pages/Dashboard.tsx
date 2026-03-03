import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Menu } from "lucide-react";
import MacroSummary from "@/components/dashboard/MacroSummary";
import MPSScore, { type TimelineSlot } from "@/components/dashboard/MPSScore";
import MicroStatus from "@/components/dashboard/MicroStatus";
import RecentMeals from "@/components/dashboard/RecentMeals";
import { useNavigate } from "react-router-dom";
import { getDailySummary } from "@/lib/api";
import { signOut } from "@/lib/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MealSummary {
  id: number;
  logged_at: string;
  protein_g: number;
  dish_name?: string | null;
  label: string;
}

interface DailySummary {
  date: string;
  goal: string;
  protein_target_g: number;
  calorie_target: number;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  fiber_g: number;
  sodium_mg: number;
  potassium_mg: number;
  mps_score: { achieved: number; target: number; label: string };
  meals_count: number;
  protein_spikes: string[];
  meals: MealSummary[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    getDailySummary()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const nextWindow = () => {
    if (!data) return "—";
    if (data.mps_score.achieved >= data.mps_score.target) return "Target met!";

    const meals = data.meals || [];
    const lastMeal = meals[0]; // most recent (ordered desc by backend)
    if (!lastMeal?.logged_at) return "Anytime — log your first meal";

    const lastTime = new Date(lastMeal.logged_at);
    const nextStart = new Date(lastTime.getTime() + 3 * 60 * 60 * 1000);
    const nextEnd = new Date(lastTime.getTime() + 4 * 60 * 60 * 1000);

    const fmt = (d: Date) =>
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${fmt(nextStart)} – ${fmt(nextEnd)}`;
  };

  const PROTEIN_SPIKE_G = 20;

  const buildMpsSlots = (): TimelineSlot[] => {
    if (!data) return [];
    const achieved = data.mps_score.achieved;
    const allMeals = [...(data.meals || [])].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    const spikeMeals = allMeals.filter((m) => m.protein_g >= PROTEIN_SPIKE_G).slice(0, 4);
    const next = nextWindow();
    const nextStr =
      next && next !== "—" && next !== "Anytime — log your first meal" ? next : "—";

    return Array.from({ length: 4 }, (_, i) => {
      const slotIndex = i + 1;
      const filled = slotIndex <= achieved;
      const meal = spikeMeals[i];
      if (meal) {
        return {
          time: new Date(meal.logged_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          label: meal.dish_name || meal.label || "Meal",
          filled,
          isNextTarget: false,
        };
      }
      if (i === achieved) {
        return {
          time: nextStr,
          label: "Next target",
          filled: false,
          isNextTarget: true,
        };
      }
      return { time: "—", label: "—", filled: false, isNextTarget: false };
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-6 pb-4 space-y-4"
    >
      {/* Header — AilaBank style: logo + bold name | hamburger menu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-display tracking-tight">FuelCoach</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-[hsl(0,5%,94%)] bg-white/80 hover:bg-muted/80 transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                navigate("/", { replace: true });
              }}
              className="text-foreground cursor-pointer"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-sm text-muted-foreground">Today · {today}</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          <MacroSummary
            calories={Math.round(data.total_calories)}
            caloriesTarget={data.calorie_target}
            protein={Math.round(data.total_protein_g)}
            proteinTarget={data.protein_target_g}
            carbs={Math.round(data.total_carbs_g)}
            fats={Math.round(data.total_fats_g)}
          />
          <MPSScore
            spikes={data.mps_score.achieved}
            target={data.mps_score.target}
            nextWindow={nextWindow()}
            slots={buildMpsSlots()}
          />
          <MicroStatus
            fiber={Math.round(data.fiber_g)}
            sodium={Math.round(data.sodium_mg)}
            potassium={Math.round(data.potassium_mg)}
          />
          <RecentMeals meals={data.meals || []} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          Failed to load today's data.
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => navigate("/log")}
          className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          Log Meal
        </button>
        <button
          onClick={() => navigate("/chat")}
          className="flex-1 py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] transition-transform"
        >
          Ask Coach
        </button>
      </div>
    </motion.div>
  );
};

export default Dashboard;
