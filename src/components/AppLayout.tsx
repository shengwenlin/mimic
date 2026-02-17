import { ReactNode } from "react";
import BottomTabBar from "./BottomTabBar";

const AppLayout = ({ children, showTabs = true }: { children: ReactNode; showTabs?: boolean }) => (
  <div className="min-h-screen bg-background flex justify-center">
    <div className="w-full max-w-[390px] min-h-screen relative pb-16">
      {children}
      {showTabs && <BottomTabBar />}
    </div>
  </div>
);

export default AppLayout;
