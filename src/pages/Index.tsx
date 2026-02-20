import { useNavigate } from "react-router-dom";
import { CheckCircle2, BookOpen, Sparkles, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useScenes, useSceneProgress } from "@/hooks/use-scenes";
import { useAuth } from "@/contexts/AuthContext";
import { useCourse } from "@/contexts/CourseContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
        <div className="max-w-3xl mx-auto px-10 py-12">
          <h1 className="text-3xl font-bold font-serif text-foreground tracking-tight mb-10">Home</h1>
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <BookOpen size={32} className="text-muted-foreground opacity-30 mb-1" strokeWidth={1.5} />
            <p className="text-xl font-semibold font-serif text-foreground">Welcome to Mimic</p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Create a personalized course for your work. AI plans 30 days of practice for you.
            </p>
            <button
              onClick={() => navigate("/courses/create")}
              className="mt-10 flex items-center gap-2 bg-primary text-primary-foreground font-medium px-6 py-3 rounded-xl text-sm shadow-sm"
            >
              <Sparkles size={15} className="text-primary-foreground" />
              Create My Course
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const completedIds = new Set(progress?.filter((p) => p.completed_at).map((p) => p.scene_id) ?? []);
  const todayScene = sceneList.find((s) => !completedIds.has(s.id)) ?? sceneList[sceneList.length - 1];
  const completedScenes = sceneList
    .filter((s) => completedIds.has(s.id))
    .sort((a, b) => {
      const aProgress = progress?.find((p) => p.scene_id === a.id);
      const bProgress = progress?.find((p) => p.scene_id === b.id);
      const aTime = aProgress?.completed_at ? new Date(aProgress.completed_at).getTime() : 0;
      const bTime = bProgress?.completed_at ? new Date(bProgress.completed_at).getTime() : 0;
      return bTime - aTime; // Most recent first
    });

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-10 py-12">
        <h1 className="text-3xl font-bold font-serif text-foreground tracking-tight mb-10">Home</h1>

        {/* Today's Lesson */}
        {todayScene && (
          <div className="mb-10">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Today's Lesson
            </p>
            <div
              className="rounded-2xl p-6 bg-card shadow-sm cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between"
              onClick={() => navigate(`/scene?id=${todayScene.id}`)}
            >
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Week {todayScene.week} · Day {todayScene.day}
                </p>
                <h3 className="text-xl font-bold font-serif text-foreground mb-1">{todayScene.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {todayScene.duration_minutes} min
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 ml-4">
                <ArrowRight size={18} className="text-primary-foreground" />
              </div>
            </div>
          </div>
        )}

        {/* Completed */}
        {completedScenes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Completed
            </p>
            <div className="flex flex-col">
              {completedScenes.map((scene) => {
                const p = progress?.find((pr) => pr.scene_id === scene.id);
                return (
                  <div
                    key={scene.id}
                    className="flex items-center gap-4 py-4 border-b border-border/60 last:border-0 cursor-pointer hover:bg-muted/30 -mx-3 px-3 rounded-lg transition-colors"
                    onClick={() => navigate(`/scene?id=${scene.id}`)}
                  >
                    <CheckCircle2 size={20} className="text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{scene.title}</p>
                      <p className="text-xs text-muted-foreground">Day {scene.day}</p>
                    </div>
                    <span className="text-sm font-semibold text-success">{p?.avg_score ?? 0}</span>
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
