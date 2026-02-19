import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CourseProvider } from "@/contexts/CourseContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Monitor } from "lucide-react";
import Index from "./pages/Index";
import SceneIntro from "./pages/SceneIntro";
import PracticeFlow from "./pages/PracticeFlow";
import ReviewScreen from "./pages/ReviewScreen";
import StoryMapScreen from "./pages/StoryMapScreen";
import ProgressScreen from "./pages/ProgressScreen";
import AuthScreen from "./pages/AuthScreen";
import CreateCourse from "./pages/CreateCourse";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const MobileGate = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center gap-5">
        <Monitor size={48} className="text-muted-foreground opacity-40" strokeWidth={1.5} />
        <div>
          <p className="text-xl font-semibold font-serif text-foreground mb-2">Please open on desktop</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Mimic is designed for desktop use.<br />Mobile is not yet supported.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CourseProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <MobileGate>
            <Routes>
              <Route path="/auth" element={<AuthScreen />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/scene" element={<ProtectedRoute><SceneIntro /></ProtectedRoute>} />
              <Route path="/practice" element={<ProtectedRoute><PracticeFlow /></ProtectedRoute>} />
              <Route path="/listen" element={<ProtectedRoute><PracticeFlow /></ProtectedRoute>} />
              <Route path="/saved" element={<ProtectedRoute><ReviewScreen /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute><StoryMapScreen /></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><ProgressScreen /></ProtectedRoute>} />
              <Route path="/courses/create" element={<ProtectedRoute><CreateCourse /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </MobileGate>
          </BrowserRouter>
        </TooltipProvider>
      </CourseProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
