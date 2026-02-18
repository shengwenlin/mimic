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
        <div className="px-6 pt-6">
          <div className="mb-5">
            <h1 className="text-base font-bold font-serif text-foreground">Lesson</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[60vh] px-10 text-center">
          <BookOpen size={28} className="text-muted-foreground opacity-30 mb-1" strokeWidth={1.5} />
          <p className="text-base font-semibold font-serif text-foreground">No courses yet</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Create a course tailored to your work and start practicing.
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
      <div className="px-6 pt-6 pb-20">
        {/* Course Switcher */}
        <div className="relative mb-5">
          <button
            onClick={() => setShowCoursePicker((v) => !v)}
            className="flex items-center gap-1.5 text-base font-bold font-serif text-foreground"
          >
            {activeCourse?.title ?? "Loading..."}
            <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showCoursePicker ? "rotate-180" : ""}`} />
          </button>

          {showCoursePicker && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border/60 rounded-xl shadow-lg z-10 overflow-hidden">
              {courses?.filter((c) => !c.is_system).map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center border-b border-border/40 last:border-0 transition-colors ${
                    c.id === activeCourseId ? "bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <button
                    onClick={() => { setActiveCourse(c.id); setShowCoursePicker(false); }}
                    className={`flex-1 text-left px-4 py-2.5 text-[13px] ${
                      c.id === activeCourseId ? "text-primary font-semibold" : "text-foreground"
                    }`}
                  >
                    {c.title}
                  </button>
                  {!c.is_system && (
                    <button
                      onClick={(e) => handleDeleteCourse(e, c.id)}
                      disabled={deletingId === c.id}
                      className="px-3 py-2.5 text-muted-foreground/50 hover:text-destructive transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => { setShowCoursePicker(false); navigate("/courses/create"); }}
                className="w-full text-left px-4 py-2.5 text-[13px] text-primary font-medium flex items-center gap-1.5 hover:bg-primary/5 transition-colors"
              >
                <Plus size={13} /> New Course
              </button>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-muted-foreground">{doneCount} / {scenes.length} completed</p>
          <p className="text-[11px] font-medium text-primary">{scenes.length > 0 ? Math.round((doneCount / scenes.length) * 100) : 0}%</p>
        </div>
        <div className="w-full h-1 bg-border/60 rounded-full mb-6">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${scenes.length > 0 ? (doneCount / scenes.length) * 100 : 0}%` }} />
        </div>

        {/* Weeks */}
        {Array.from(new Set(scenesWithStatus.map((s) => s.week))).map((week) => (
          <div key={week} className="mb-5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Week {week}</p>
            <div className="flex flex-col">
              {scenesWithStatus.filter((s) => s.week === week).map((scene) => (
                <div
                  key={scene.id}
                  className={`flex items-center gap-3 py-3 border-b border-border/40 last:border-0 ${
                    scene.status !== "locked" ? "cursor-pointer" : ""
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
                    <p className={`text-[13px] font-medium truncate ${
                      scene.status === "locked" ? "text-muted-foreground/40" :
                      scene.status === "current" ? "text-foreground font-semibold" : "text-foreground"
                    }`}>{scene.title}</p>
                  </div>
                  {scene.status === "done" && <span className="text-[12px] font-semibold text-success">{scene.score}</span>}
                  {scene.status === "locked" && <Lock size={13} className="text-border" />}
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
