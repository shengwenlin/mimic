import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCourse } from "@/contexts/CourseContext";
import { useQueryClient } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const CreateCourse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActiveCourse } = useCourse();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim() && characterName.trim() && context.trim().length >= 20 && !loading;

  const handleGenerate = async () => {
    if (!user || !canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-course`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          character_name: characterName.trim(),
          context: context.trim(),
          user_id: user.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成失败");

      // Invalidate courses cache, switch to new course
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["scenes"] });
      setActiveCourse(data.course_id);
      navigate("/map");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout showTabs={false}>
      <div className="px-5 pt-5 pb-8 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">创建自定义课程</h1>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles size={32} className="text-primary animate-pulse" />
            </div>
            <p className="text-base font-semibold text-foreground">正在生成课程...</p>
            <p className="text-sm text-muted-foreground text-center">
              Claude 正在为你设计 30 天的练习内容<br />通常需要 20–40 秒
            </p>
            <Loader2 size={20} className="text-primary animate-spin mt-2" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 flex-1">
            {/* Course title */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                课程名称
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：Sarah 的初创公司日记"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Character name */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                角色名字
              </label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="例如：Sarah"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Context */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                角色背景描述
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={5}
                placeholder="描述这个角色的职业、工作环境和日常场景。例如：Sarah 是一家医疗科技初创公司的产品经理，刚加入团队三个月，负责协调工程师和设计师，每天需要开很多会议，向 CEO 汇报进展..."
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors resize-none leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                描述越详细，生成的句子越贴近真实场景（至少 20 字）
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div className="mt-auto pt-4">
              <button
                onClick={handleGenerate}
                disabled={!canSubmit}
                className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} />
                用 AI 生成课程
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CreateCourse;
