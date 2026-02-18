import { ReactNode } from "react";
import SidebarNav from "./SidebarNav";

// showTabs=true  → sidebar nav visible (main pages)
// showTabs=false → fullscreen immersive (practice, scene intro)
const AppLayout = ({ children, showTabs = true }: { children: ReactNode; showTabs?: boolean }) => (
  <div className="min-h-screen bg-background flex">
    {showTabs && <SidebarNav />}
    <main className={`flex-1 min-h-screen overflow-y-auto ${showTabs ? "pl-56" : ""}`}>
      {children}
    </main>
  </div>
);

export default AppLayout;
