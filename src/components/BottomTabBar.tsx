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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-background border-t border-border flex justify-around py-2 z-50">
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center gap-0.5 px-4 py-1"
          >
            <tab.icon
              size={22}
              className={active ? "text-primary" : "text-muted-foreground"}
            />
            <span
              className={`text-[10px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
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
