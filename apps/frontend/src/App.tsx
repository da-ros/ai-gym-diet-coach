import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MobileLayout from "./components/layout/MobileLayout";
import Dashboard from "./pages/Dashboard";
import LogMeal from "./pages/LogMeal";
import MealDetail from "./pages/MealDetail";
import CoachChat from "./pages/CoachChat";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { supabase } from "./lib/supabase";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(!!data.session);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) return null;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            element={
              <ProtectedRoute>
                <MobileLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/home" element={<Dashboard />} />
            <Route path="/log" element={<LogMeal />} />
            <Route path="/meal/:mealId" element={<MealDetail />} />
            <Route path="/chat" element={<CoachChat />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
