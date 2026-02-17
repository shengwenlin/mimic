import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import SceneIntro from "./pages/SceneIntro";
import PracticeFlow from "./pages/PracticeFlow";
import ReviewScreen from "./pages/ReviewScreen";
import StoryMapScreen from "./pages/StoryMapScreen";
import ProgressScreen from "./pages/ProgressScreen";
import AuthScreen from "./pages/AuthScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthScreen />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/scene" element={<ProtectedRoute><SceneIntro /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute><PracticeFlow /></ProtectedRoute>} />
            <Route path="/listen" element={<ProtectedRoute><PracticeFlow /></ProtectedRoute>} />
            <Route path="/saved" element={<ProtectedRoute><ReviewScreen /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><StoryMapScreen /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><ProgressScreen /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
