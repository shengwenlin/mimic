import { CheckCircle2, Lock, Circle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useScenes, useSceneProgress } from "@/hooks/use-scenes";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const StoryMapScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: scenes, isLoading } = useScenes();
  const { data: progress } = useSceneProgress(user?.id ?? null);

  if (isLoading || !scenes) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground text-sm">加载中...</p>
        </div>
      </AppLayout>
    );
  }

  const completedIds = new Set(progress?.filter(p => p.completed_at).map(p => p.scene_id) ?? []);
  
  // Determine status: done, current (first incomplete), locked (after current)
  let foundCurrent = false;
  const scenesWithStatus = scenes.map(s => {
    if (completedIds.has(s.id)) {
      const p = progress?.find(pr => pr.scene_id === s.id);
      return { ...s, status: "done" as const, score: p?.avg_score ?? 0 };
    }
    if (!foundCurrent) {
      foundCurrent = true;
      return { ...s, status: "current" as const, score: 0 };
    }
    return { ...s, status: "locked" as const, score: 0 };
  });

  const week1 = scenesWithStatus.filter(s => s.week === 1);
  const doneCount = scenesWithStatus.filter(s => s.status === "done").length;

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-20">
        <h1 className="text-lg font-bold text-foreground mb-0.5">Alex's Journey</h1>
        <p className="text-xs text-muted-foreground mb-1">Week 1</p>
        <p className="text-xs text-muted-foreground mb-3">Progress: {doneCount} / {scenes.length}</p>

        <div className="w-full h-1 bg-muted rounded-full mb-6">
          <div className="h-full bg-primary rounded-full" style={{ width: `${(doneCount / scenes.length) * 100}%` }} />
        </div>

        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Week 1</h2>
        <div className="flex flex-col gap-0">
          {week1.map((scene) => (
            <div
              key={scene.id}
              className={`flex items-center gap-3 py-3 border-b border-border last:border-0 ${
                scene.status !== "locked" ? "cursor-pointer" : ""
              }`}
              onClick={() => scene.status !== "locked" && navigate(`/scene?id=${scene.id}`)}
            >
              {scene.status === "done" && <CheckCircle2 size={22} className="text-primary shrink-0" />}
              {scene.status === "current" && (
                <div className="w-[22px] h-[22px] rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                  {scene.day}
                </div>
              )}
              {scene.status === "locked" && <Circle size={22} className="text-muted-foreground/40 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  scene.status === "locked" ? "text-muted-foreground/50" :
                  scene.status === "current" ? "text-foreground font-bold" : "text-foreground"
                }`}>{scene.title}</p>
              </div>
              {scene.status === "done" && <span className="text-xs font-semibold text-success">{scene.score}</span>}
              {scene.status === "locked" && <Lock size={14} className="text-muted-foreground/40" />}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default StoryMapScreen;
