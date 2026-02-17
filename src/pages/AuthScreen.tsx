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

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("注册成功！请检查邮箱验证。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange will update user → useEffect redirects
      }
    } catch (err: any) {
      toast.error(err.message || "出了点问题");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return null; // will redirect

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[390px] flex flex-col items-center justify-center px-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mimic</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {isSignUp ? "创建账号开始学习" : "登录继续学习"}
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full text-sm disabled:opacity-50 mt-2"
          >
            {submitting ? "..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-sm text-muted-foreground"
        >
          {isSignUp ? "已有账号？登录" : "没有账号？注册"}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
