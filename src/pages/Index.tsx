import { useNavigate } from "react-router-dom";
import { Flame, CheckCircle2, LogOut } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useScenes, useSceneProgress } from "@/hooks/use-scenes";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: scenes, isLoading } = useScenes();
  const { data: progress } = useSceneProgress(user?.id ?? null);

  if (isLoading || !scenes) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground text-sm">加载中...</p>
        </div>
      </AppLayout>);

  }

  const completedIds = new Set(progress?.filter((p) => p.completed_at).map((p) => p.scene_id) ?? []);

  // Find the first incomplete scene as today's lesson
  const todayScene = scenes.find((s) => !completedIds.has(s.id)) ?? scenes[scenes.length - 1];
  const completedScenes = scenes.filter((s) => completedIds.has(s.id));

  const streakDays = scenes.map((s) => completedIds.has(s.id));

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mimic</h1>
          <button onClick={signOut} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
            <LogOut size={16} />
          </button>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-1.5">
            <Flame size={20} className="text-warning" />
            <span className="text-sm font-semibold text-foreground">
              {completedScenes.length} day streak
            </span>
          </div>
          <div className="flex gap-1.5 ml-auto">
            {streakDays.map((done, i) =>
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${done ? "bg-primary" : "bg-border"}`} />

            )}
          </div>
        </div>

        {/* Today's Lesson */}
        {todayScene &&
        <div className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Today's Lesson
            </h2>
            <div className="border-border rounded-2xl p-5 bg-white border-0">
              <p className="text-xs text-muted-foreground mb-1">
                Week {todayScene.week} · Day {todayScene.day}
              </p>
              <h3 className="text-lg font-bold text-foreground mb-1">{todayScene.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {todayScene.duration_minutes} min
              </p>
              <button
              onClick={() => navigate(`/scene?id=${todayScene.id}`)}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-[50px] text-sm">

                Start →
              </button>
            </div>
          </div>
        }

        {/* Completed */}
        {completedScenes.length > 0 &&
        <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Completed
            </h2>
            <div className="flex flex-col gap-3">
              {completedScenes.map((scene) => {
              const p = progress?.find((pr) => pr.scene_id === scene.id);
              return (
                <div key={scene.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={20} className="text-success" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{scene.title}</p>
                        <p className="text-xs text-muted-foreground">Day {scene.day}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-success">{p?.avg_score ?? 0}</span>
                  </div>);

            })}
            </div>
          </div>
        }
      </div>
    </AppLayout>);

};

export default Index;