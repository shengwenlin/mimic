import { CheckCircle2, Lock, Circle, ChevronDown, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useScenes, useSceneProgress, useCourses } from "@/hooks/use-scenes";
import { useAuth } from "@/contexts/AuthContext";
import { useCourse } from "@/contexts/CourseContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const StoryMapScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCourseId, setActiveCourse } = useCourse();
  const { data: courses } = useCourses(user?.id ?? null);
  const { data: scenes, isLoading } = useScenes(activeCourseId);
  const { data: progress } = useSceneProgress(user?.id ?? null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  const activeCourse = courses?.find((c) => c.id === activeCourseId);

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

  const doneCount = scenesWithStatus.filter(s => s.status === "done").length;

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-20">
        {/* Course Switcher */}
        <div className="relative mb-4">
          <button
            onClick={() => setShowCoursePicker((v) => !v)}
            className="flex items-center gap-2 text-lg font-bold text-foreground"
          >
            {activeCourse?.title ?? "Loading..."}
            <ChevronDown size={18} className={`text-muted-foreground transition-transform ${showCoursePicker ? "rotate-180" : ""}`} />
          </button>

          {showCoursePicker && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-lg z-10 overflow-hidden">
              {courses?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setActiveCourse(c.id); setShowCoursePicker(false); }}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-border last:border-0 transition-colors ${
                    c.id === activeCourseId ? "text-primary font-semibold bg-primary/5" : "text-foreground hover:bg-muted/30"
                  }`}
                >
                  {c.title}
                  {c.is_system && <span className="ml-2 text-xs text-muted-foreground">系统</span>}
                </button>
              ))}
              <button
                onClick={() => { setShowCoursePicker(false); navigate("/courses/create"); }}
                className="w-full text-left px-4 py-3 text-sm text-primary font-medium flex items-center gap-2 hover:bg-primary/5 transition-colors"
              >
                <Plus size={14} /> 创建新课程
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mb-3">进度：{doneCount} / {scenes.length}</p>

        <div className="w-full h-1 bg-muted rounded-full mb-6">
          <div className="h-full bg-primary rounded-full" style={{ width: `${scenes.length > 0 ? (doneCount / scenes.length) * 100 : 0}%` }} />
        </div>

        {Array.from(new Set(scenesWithStatus.map((s) => s.week))).map((week) => (
          <div key={week} className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Week {week}</h2>
            <div className="flex flex-col gap-0">
              {scenesWithStatus.filter((s) => s.week === week).map((scene) => (
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
        ))}
      </div>
    </AppLayout>
  );
};

export default StoryMapScreen;
