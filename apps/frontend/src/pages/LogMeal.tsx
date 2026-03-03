import { useState, useRef } from "react";
import { ArrowLeft, Camera, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { logMeal } from "@/lib/api";

type Step = "capture" | "processing" | "review";

interface MealResult {
  meal_id: number;
  foods_identified: { food: string; estimated_grams: number }[];
  macros: { calories: number; protein_g: number; carbs_g: number; fats_g: number };
  micros: { fiber_g: number; sodium_mg: number; potassium_mg: number };
  is_protein_spike: boolean;
  nudge: string | null;
  mps_score: { label: string };
}

const LogMeal = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("capture");
  const [result, setResult] = useState<MealResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep("processing");
    try {
      const data = await logMeal(file);
      setResult(data);
      setStep("review");
    } catch (e: any) {
      setError(e.message ?? "Analysis failed. Please try again.");
      setStep("capture");
    } finally {
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
    }
  };

  const reset = () => {
    setStep("capture");
    setResult(null);
    setError(null);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-display">Log Meal</h1>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {error && (
        <p className="mb-4 text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <AnimatePresence mode="wait">
        {step === "capture" && (
          <motion.div
            key="capture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="glass-card-solid aspect-[4/3] flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Camera className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Take a photo of your meal</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.setAttribute("capture", "environment");
                    fileRef.current.click();
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-transform"
              >
                Capture
              </button>
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.removeAttribute("capture");
                    fileRef.current.click();
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Image className="w-4 h-4" />
                Gallery
              </button>
            </div>
          </motion.div>
        )}

        {step === "processing" && previewUrl && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="card-subtle overflow-hidden aspect-[4/3] rounded-2xl">
              <img
                src={previewUrl}
                alt="Your meal"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="card-subtle p-4 text-center space-y-3">
              <p className="text-sm font-semibold">Analyzing your meal...</p>
              <div className="space-y-2 text-left max-w-[220px] mx-auto">
                {["Identifying foods", "Estimating portions", "Calculating macros"].map((s, i) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.6 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-primary">✓</span> {s}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === "review" && result && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {result.is_protein_spike && (
              <div className="glass-card-solid p-3 flex items-center gap-2 border border-primary/20">
                <span className="text-primary text-lg">⚡</span>
                <p className="text-sm font-semibold text-primary">
                  Protein spike! {result.mps_score.label}
                </p>
              </div>
            )}

            <p className="text-sm font-semibold text-center text-muted-foreground">
              Identified Foods
            </p>

            {result.foods_identified.map((food, i) => (
              <div key={i} className="glass-card-solid p-4 flex justify-between items-center">
                <span className="text-sm font-medium capitalize">{food.food}</span>
                <span className="text-sm text-muted-foreground">{food.estimated_grams}g</span>
              </div>
            ))}

            <div className="glass-card-solid p-4">
              <p className="text-xs text-muted-foreground mb-3 font-semibold">Nutrition</p>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="flex justify-between pr-4">
                  <span>Calories</span>
                  <span className="font-bold">{Math.round(result.macros.calories)} kcal</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>Protein</span>
                  <span className="font-bold text-primary">{result.macros.protein_g.toFixed(1)}g</span>
                </div>
                <div className="flex justify-between pr-4">
                  <span>Carbs</span>
                  <span className="font-bold">{result.macros.carbs_g.toFixed(1)}g</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>Fats</span>
                  <span className="font-bold">{result.macros.fats_g.toFixed(1)}g</span>
                </div>
              </div>
            </div>

            {result.nudge && (
              <div className="glass-card-solid p-4 flex gap-3">
                <span className="text-2xl">💪</span>
                <p className="text-sm leading-relaxed">{result.nudge}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Meal Time:{" "}
              {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>

            <button
              onClick={() => navigate("/")}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
            >
              Done
            </button>
            <button
              onClick={reset}
              className="w-full py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] transition-transform"
            >
              Log Another Meal
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogMeal;
