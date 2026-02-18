import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AuthScreen = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Registration successful! Check your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return null;

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[390px] flex flex-col items-center justify-center px-8">
        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center mb-4">
          <span className="text-primary-foreground text-base font-bold">M</span>
        </div>
        <h1 className="text-2xl font-bold font-serif text-foreground mb-1">Mimic</h1>
        <p className="text-[13px] text-muted-foreground mb-8">
          {isSignUp ? "Create an account to get started" : "Welcome back"}
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm disabled:opacity-50 mt-1 shadow-sm"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin inline-block" />
            ) : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-5 text-[13px] text-muted-foreground"
        >
          {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
