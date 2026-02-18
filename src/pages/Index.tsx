import { useNavigate } from "react-router-dom";
import { CheckCircle2, LogOut, BookOpen, Sparkles, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useScenes, useSceneProgress } from "@/hooks/use-scenes";
import { useAuth } from "@/contexts/AuthContext";
import { useCourse } from "@/contexts/CourseContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeCourseId } = useCourse();
  const { data: scenes, isLoading } = useScenes(activeCourseId);
  const { data: progress } = useSceneProgress(user?.id ?? null);

  const sceneList = scenes ?? [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Empty state
  if (sceneList.length === 0) {
    return (
      <AppLayout>
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold font-serif text-foreground tracking-tight">Mimic</h1>
            <button onClick={signOut} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <LogOut size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[65vh] px-10 text-center">
          <BookOpen size={28} className="text-muted-foreground opacity-30 mb-1" strokeWidth={1.5} />
          <p className="text-base font-semibold font-serif text-foreground">Welcome to Mimic</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Create a personalized course for your work. AI plans 30 days of practice for you.
          </p>
          <button
            onClick={() => navigate("/courses/create")}
            className="mt-12 flex items-center gap-2 bg-primary text-primary-foreground font-medium px-5 py-2.5 rounded-xl text-[13px] shadow-sm"
          >
            <Sparkles size={14} className="text-primary-foreground" />
            Create My Course
          </button>
        </div>
      </AppLayout>
    );
  }

  const completedIds = new Set(progress?.filter((p) => p.completed_at).map((p) => p.scene_id) ?? []);
  const todayScene = sceneList.find((s) => !completedIds.has(s.id)) ?? sceneList[sceneList.length - 1];
  const completedScenes = sceneList.filter((s) => completedIds.has(s.id));

  return (
    <AppLayout>
      <div className="px-6 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold font-serif text-foreground tracking-tight">Mimic</h1>
          <button onClick={signOut} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <LogOut size={14} />
          </button>
        </div>

        {/* Today's Lesson */}
        {todayScene && (
          <div className="mb-6">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Today's Lesson
            </p>
            <div
              className="rounded-2xl p-5 bg-card shadow-sm cursor-pointer"
              onClick={() => navigate(`/scene?id=${todayScene.id}`)}
            >
              <p className="text-[11px] text-muted-foreground mb-1.5">
                Week {todayScene.week} · Day {todayScene.day}
              </p>
              <h3 className="text-base font-bold font-serif text-foreground mb-1">{todayScene.title}</h3>
              <p className="text-[13px] text-muted-foreground mb-5">
                {todayScene.duration_minutes} min
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-primary">Start practice</span>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <ArrowRight size={16} className="text-primary-foreground" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completed */}
        {completedScenes.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Completed
            </p>
            <div className="flex flex-col">
              {completedScenes.map((scene) => {
                const p = progress?.find((pr) => pr.scene_id === scene.id);
                return (
                  <div key={scene.id} className="flex items-center gap-3 py-3 border-b border-border/60 last:border-0">
                    <CheckCircle2 size={18} className="text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{scene.title}</p>
                      <p className="text-[11px] text-muted-foreground">Day {scene.day}</p>
                    </div>
                    <span className="text-[13px] font-semibold text-success">{p?.avg_score ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
