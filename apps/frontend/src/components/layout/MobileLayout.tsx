import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Camera, MessageSquare, User } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/log", label: "Log", icon: Camera },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/profile", label: "Profile", icon: User },
];

const MobileLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex justify-center min-h-screen bg-background">
      <div className="w-full max-w-md flex flex-col min-h-screen relative">
        <main className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md card-subtle rounded-t-2xl rounded-b-none border-b border-[hsl(0,0%,93%)] bottom-safe-area z-50">
          <div className="flex items-center justify-around py-1 px-2">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-xl bg-accent"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <tab.icon
                    className={`relative z-10 w-5 h-5 transition-colors ${
                      isActive ? "text-accent-foreground" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`relative z-10 text-[10px] font-semibold transition-colors ${
                      isActive ? "text-accent-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default MobileLayout;
