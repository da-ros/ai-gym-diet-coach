import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email to confirm your account");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(0,0%,98%)] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 w-80 h-80 rounded-full bg-primary/[0.06] blur-[80px]" />
      <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-primary/[0.04] blur-[60px]" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10">
        <motion.div
          className="w-full max-w-sm flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-sm mb-3">
            <Flame className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">Create account</h1>
          <p className="text-muted-foreground text-sm mb-8">Start with FuelCoach</p>

          <form onSubmit={handleSignup} className="w-full space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-white/80 border-[hsl(0,0%,90%)] text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/40 h-12 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/80 border-[hsl(0,0%,90%)] text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/40 h-12 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-white/80 border-[hsl(0,0%,90%)] text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/40 h-12 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-sm hover:bg-primary/90 transition-all mt-2"
            >
              {loading ? (
                <motion.div
                  className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                />
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 w-full my-6">
            <div className="flex-1 h-px bg-[hsl(0,0%,90%)]" />
            <span className="text-muted-foreground/70 text-xs">or</span>
            <div className="flex-1 h-px bg-[hsl(0,0%,90%)]" />
          </div>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-[hsl(0,0%,90%)] bg-white/60 text-foreground hover:bg-white/80 font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            onClick={() => navigate("/")}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <p className="mt-8 text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
