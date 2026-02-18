import { Home, GraduationCap, Bookmark, BarChart3, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: GraduationCap, label: "Lesson", path: "/map" },
  { icon: Bookmark, label: "Saved", path: "/saved" },
  { icon: BarChart3, label: "Progress", path: "/progress" },
];

const SidebarNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-card border-r border-border/50 flex flex-col px-4 py-7 z-40">
      {/* Logo */}
      <h1 className="text-xl font-bold font-serif text-foreground tracking-tight px-2 mb-8">Mimic</h1>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                active
                  ? "bg-primary/8 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <tab.icon size={17} strokeWidth={active ? 2.2 : 1.8} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer"
      >
        <LogOut size={17} strokeWidth={1.8} />
        Sign out
      </button>
    </aside>
  );
};

export default SidebarNav;
