import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { useScene } from "@/hooks/use-scenes";

const SceneIntro = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sceneId = searchParams.get("id");
  const { data: scene, isLoading } = useScene(sceneId);

  if (isLoading || !scene) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-xl min-h-screen relative flex flex-col px-10 pt-8">
        <button onClick={() => navigate(-1)} className="mb-8 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={17} className="text-foreground" />
        </button>

        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Week {scene.week} · Day {scene.day}
        </p>
        <h1 className="text-3xl font-bold font-serif text-foreground mb-5">{scene.title}</h1>

        <div className="rounded-2xl p-6 bg-card shadow-sm mb-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{scene.situation}</p>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
          <Clock size={14} />
          <span>{scene.duration_minutes} min</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => navigate(`/practice?sceneId=${scene.id}`)}
          className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-xl text-sm mb-12 flex items-center justify-center gap-2 shadow-sm"
        >
          Start Practice
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
};

export default SceneIntro;
