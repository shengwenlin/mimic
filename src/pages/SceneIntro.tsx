import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useScene } from "@/hooks/use-scenes";

const SceneIntro = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sceneId = searchParams.get("id");
  const { data: scene, isLoading } = useScene(sceneId);

  if (isLoading || !scene) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">加载中...</p>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[390px] min-h-screen relative flex flex-col px-5 pt-5">
        <button onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={22} className="text-foreground" />
        </button>

        <p className="text-xs text-muted-foreground mb-1">
          Week {scene.week} · Day {scene.day} · {scene.skill_tags?.join(", ")}
        </p>
        <h1 className="text-xl font-bold text-foreground mb-4">{scene.title}</h1>

        <div className="rounded-xl p-4 mb-5 bg-white">
          <p className="text-sm text-muted-foreground leading-relaxed">{scene.situation}</p>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => navigate(`/practice?sceneId=${scene.id}`)}
          className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-[50px] text-sm mb-10">

          Let's go
        </button>
      </div>
    </div>);

};

export default SceneIntro;