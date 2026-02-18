import { CheckCircle2, Lock, Circle, ChevronDown, Plus, Trash2, BookOpen, Sparkles } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useScenes, useSceneProgress, useCourses } from "@/hooks/use-scenes";
import { useAuth } from "@/contexts/AuthContext";
import { useCourse } from "@/contexts/CourseContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const StoryMapScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCourseId, setActiveCourse } = useCourse();
  const { data: courses } = useCourses(user?.id ?? null);
  const { data: scenes, isLoading } = useScenes(activeCourseId);
  const { data: progress } = useSceneProgress(user?.id ?? null);
  const queryClient = useQueryClient();
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteCourse = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    if (!confirm("确定要删除这个课程吗？删除后无法恢复。")) return;
    setDeletingId(courseId);
    await supabase.from("courses").delete().eq("id", courseId);
    if (activeCourseId === courseId) {
      const remaining = courses?.filter((c) => c.id !== courseId);
      const nextId = remaining && remaining.length > 0 ? remaining[0].id : null;
      setActiveCourse(nextId);
    }
    await queryClient.invalidateQueries({ queryKey: ["courses"] });
    setDeletingId(null);
  };

  const activeCourse = courses?.find((c) => c.id === activeCourseId);
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
          <h1 className="text-3xl font-bold font-serif text-foreground tracking-tight mb-10">Lesson</h1>
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <BookOpen size={32} className="text-muted-foreground opacity-30 mb-1" strokeWidth={1.5} />
            <p className="text-xl font-semibold font-serif text-foreground">No courses yet</p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Create a course tailored to your work and start practicing.
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

  const completedIds = new Set(progress?.filter(p => p.completed_at).map(p => p.scene_id) ?? []);

  let foundCurrent = false;
  const scenesWithStatus = sceneList.map(s => {
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
      <div className="max-w-3xl mx-auto px-10 py-12">
        {/* Course Switcher */}
        <div className="relative mb-10">
          <button
            onClick={() => setShowCoursePicker((v) => !v)}
            className="flex items-center gap-2 text-3xl font-bold font-serif text-foreground tracking-tight"
          >
            {activeCourse?.title ?? "Loading..."}
            <ChevronDown size={20} className={`text-muted-foreground transition-transform ${showCoursePicker ? "rotate-180" : ""}`} />
          </button>

          {showCoursePicker && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border/60 rounded-xl shadow-lg z-10 overflow-hidden">
              {courses?.filter((c) => !c.is_system).map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center border-b border-border/40 last:border-0 transition-colors ${
                    c.id === activeCourseId ? "bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <button
                    onClick={() => { setActiveCourse(c.id); setShowCoursePicker(false); }}
                    className={`flex-1 text-left px-4 py-3 text-sm ${
                      c.id === activeCourseId ? "text-primary font-semibold" : "text-foreground"
                    }`}
                  >
                    {c.title}
                  </button>
                  {!c.is_system && (
                    <button
                      onClick={(e) => handleDeleteCourse(e, c.id)}
                      disabled={deletingId === c.id}
                      className="px-3 py-3 text-muted-foreground/50 hover:text-destructive transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => { setShowCoursePicker(false); navigate("/courses/create"); }}
                className="w-full text-left px-4 py-3 text-sm text-primary font-medium flex items-center gap-2 hover:bg-primary/5 transition-colors"
              >
                <Plus size={14} /> New Course
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{doneCount} / {scenes.length} completed</p>
          <p className="text-xs font-medium text-primary">{scenes.length > 0 ? Math.round((doneCount / scenes.length) * 100) : 0}%</p>
        </div>
        <div className="w-full h-1.5 bg-border/60 rounded-full mb-10">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${scenes.length > 0 ? (doneCount / scenes.length) * 100 : 0}%` }} />
        </div>

        {/* Weeks */}
        {Array.from(new Set(scenesWithStatus.map((s) => s.week))).map((week) => (
          <div key={week} className="mb-8">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Week {week}</p>
            <div className="flex flex-col">
              {scenesWithStatus.filter((s) => s.week === week).map((scene) => (
                <div
                  key={scene.id}
                  className={`flex items-center gap-4 py-4 border-b border-border/40 last:border-0 ${
                    scene.status !== "locked" ? "cursor-pointer hover:bg-muted/30 -mx-3 px-3 rounded-xl transition-colors" : ""
                  }`}
                  onClick={() => scene.status !== "locked" && navigate(`/scene?id=${scene.id}`)}
                >
                  {scene.status === "done" && <CheckCircle2 size={20} className="text-success shrink-0" />}
                  {scene.status === "current" && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[9px] font-bold shrink-0">
                      {scene.day}
                    </div>
                  )}
                  {scene.status === "locked" && <Circle size={20} className="text-border shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      scene.status === "locked" ? "text-muted-foreground/40" :
                      scene.status === "current" ? "text-foreground font-semibold" : "text-foreground"
                    }`}>{scene.title}</p>
                  </div>
                  {scene.status === "done" && <span className="text-sm font-semibold text-success">{scene.score}</span>}
                  {scene.status === "locked" && <Lock size={14} className="text-border" />}
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
