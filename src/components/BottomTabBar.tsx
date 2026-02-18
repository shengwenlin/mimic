import { Home, GraduationCap, Bookmark, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: GraduationCap, label: "Lesson", path: "/map" },
  { icon: Bookmark, label: "Saved", path: "/saved" },
  { icon: BarChart3, label: "Progress", path: "/progress" },
];

const BottomTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-card/80 backdrop-blur-xl border-t border-border/50 flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50">
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-all ${active ? "" : "opacity-35"}`}
          >
            <tab.icon
              size={21}
              strokeWidth={active ? 2.2 : 1.8}
              className={active ? "text-primary" : "text-foreground"}
            />
            <span
              className={`text-[10px] font-medium ${
                active ? "text-primary" : "text-foreground"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;
