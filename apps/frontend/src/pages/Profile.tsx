import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { getProfile, saveProfile } from "@/lib/api";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [goal, setGoal] = useState<"bulk" | "cut" | "lean_bulk">("lean_bulk");
  const [weight, setWeight] = useState("75");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const weightKg = parseFloat(weight || "75") || 75;
  const proteinTarget = Math.round(weightKg * 2.2);
  // TDEE-based: ~33 kcal/kg (moderate activity); bulk +400, cut -400, lean_bulk +150
  const tdee = Math.round(weightKg * 33);
  const calorieTarget =
    goal === "bulk" ? tdee + 400 : goal === "cut" ? tdee - 400 : tdee + 150;

  const loadProfile = () => {
    setLoading(true);
    getProfile()
      .then((p) => {
        if (p) {
          setGoal((p.goal === "maintain" ? "lean_bulk" : p.goal) as "bulk" | "cut" | "lean_bulk");
          const savedWeight = p.body_weight_kg ?? Math.round((p.protein_target_g ?? 165) / 2.2);
          setWeight(String(savedWeight));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (location.pathname === "/profile") loadProfile();
  }, [location.pathname]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile({
        goal,
        body_weight_kg: weightKg,
        protein_target_g: proteinTarget,
        calorie_target: calorieTarget,
      });
      toast.success("Profile saved!");
      getProfile().then((p) => {
        if (p) {
          setGoal((p.goal === "maintain" ? "lean_bulk" : p.goal) as "bulk" | "cut" | "lean_bulk");
          const w = p.body_weight_kg ?? Math.round((p.protein_target_g ?? 165) / 2.2);
          setWeight(String(w));
        }
      });
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-6 pb-4 space-y-5"
    >
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-display">Profile & Goals</h1>
      </div>

      {/* Goal */}
      <div className="glass-card-solid p-4 space-y-3">
        <label className="text-sm font-semibold">Goal</label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "bulk" as const, label: "Bulk" },
              { value: "cut" as const, label: "Cut" },
              { value: "lean_bulk" as const, label: "Lean bulk" },
            ]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setGoal(value)}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                goal === value
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Weight */}
      <div className="glass-card-solid p-4 space-y-2">
        <label className="text-sm font-semibold">Body Weight (kg)</label>
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
      </div>

      {/* Auto-calculated targets */}
      <div className="glass-card-solid p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Protein Target</span>
          <span className="font-bold">Auto (2.2g/kg) → {proteinTarget}g</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily Calories</span>
          <span className="font-bold">TDEE-based → {calorieTarget.toLocaleString()} kcal</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </motion.div>
  );
};

export default Profile;
