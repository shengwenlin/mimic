import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Play, Pause } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { transcriptText } from "@/data/lessons";

const ListenScreen = () => {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState("1x");

  const toggleSpeed = () => {
    setSpeed((s) => (s === "1x" ? "0.75x" : s === "0.75x" ? "1.5x" : "1x"));
  };

  return (
    <AppLayout showTabs={false}>
      <div className="px-5 pt-5 flex flex-col min-h-screen">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <span className="text-xs text-muted-foreground">Step 1 of 4 — Listen</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-muted rounded-full mb-8">
          <div className="h-full bg-primary rounded-full" style={{ width: "25%" }} />
        </div>

        <p className="text-xs text-muted-foreground text-center mb-6">Alex · Design Lead</p>

        {/* Waveform */}
        <div className="flex items-end justify-center gap-1.5 h-10 mb-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 bg-primary rounded-full"
              style={{
                animation: playing ? `waveform 0.8s ease-in-out ${i * 0.1}s infinite` : "none",
                height: playing ? undefined : "8px",
              }}
            />
          ))}
        </div>

        {/* Transcript */}
        <div className="border border-border rounded-xl p-5 mb-8">
          <p className="text-sm text-foreground leading-relaxed">
            {transcriptText.before}
            <span className="underline decoration-primary underline-offset-2 decoration-2">
              {transcriptText.highlight1}
            </span>
            {transcriptText.middle}
            <span className="underline decoration-primary underline-offset-2 decoration-2">
              {transcriptText.highlight2}
            </span>
            {transcriptText.after}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <button className="text-muted-foreground">
            <RotateCcw size={22} />
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
          >
            {playing ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button
            onClick={toggleSpeed}
            className="text-sm font-semibold text-muted-foreground min-w-[40px]"
          >
            {speed}
          </button>
        </div>

        <div className="mt-auto pb-8">
          <button
            onClick={() => navigate("/mimic")}
            className="w-full text-sm font-semibold text-primary py-3"
          >
            Ready to Speak →
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default ListenScreen;
