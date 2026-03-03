import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/home", { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(0,0%,98%)] relative overflow-hidden">
      {/* Very subtle warm gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-96 rounded-full bg-primary/[0.06] blur-[80px]" />

      {/* Header: logo + app name | Sign In */}
      <header className="flex items-center justify-between w-full px-6 pt-8 pb-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl md:text-2xl font-display font-bold text-foreground tracking-tight">
            FuelCoach
          </span>
        </div>
        <Link
          to="/login"
          className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Main content: pill, headline, description, CTA */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12 z-10">
        <motion.div
          className="flex flex-col items-center gap-6 w-full max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Feature pill — very light, almost lost */}
          <div className="rounded-full bg-white border border-[hsl(0,0%,92%)] px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              AI dietary coach for gym goers
            </span>
          </div>

          {/* Headline — AilaBank style: first part large, second part larger + accent */}
          <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground text-center tracking-tight leading-none">
            Fuel smarter.
            <br />
            <span className="text-5xl md:text-6xl text-primary">Grow stronger.</span>
          </h1>

          {/* Benefit copy */}
          <p className="text-muted-foreground text-sm text-center leading-relaxed max-w-xs">
            Log meals by photo, track macros and protein timing, and get
            evidence-based nudges to hit 3–4 protein spikes and recover better.
          </p>

          {/* Primary CTA — soft peach */}
          <Button
            size="lg"
            className="w-full h-12 rounded-xl font-semibold text-base gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            onClick={() => navigate("/signup")}
          >
            Sign in or Sign up
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-muted-foreground/80 text-xs">
            Zero manual logging. Just snap, track, and improve.
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Splash;
