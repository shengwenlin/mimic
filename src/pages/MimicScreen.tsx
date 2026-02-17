import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Volume2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { mimicSentence, stressLabels } from "@/data/lessons";

const MimicScreen = () => {
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);

  return (
    <AppLayout showTabs={false}>
      <div className="px-5 pt-5 flex flex-col min-h-screen">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <span className="text-xs text-muted-foreground">Step 2 of 4 — Your Turn</span>
        </div>

        <div className="w-full h-1 bg-muted rounded-full mb-8">
          <div className="h-full bg-primary rounded-full" style={{ width: "50%" }} />
        </div>

        {/* Sentence */}
        <div className="border border-border rounded-xl p-5 mb-3">
          <p className="text-base leading-relaxed">
            {mimicSentence.map((w, i) => (
              <span
                key={i}
                className={
                  w.stressed ? "font-bold text-primary" : "text-foreground"
                }
              >
                {w.word}{" "}
              </span>
            ))}
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center mb-2">{stressLabels}</p>

        <button className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium mb-8">
          <Volume2 size={14} />
          Listen again
        </button>

        {/* Recording zone */}
        <button
          onClick={() => setRecording(!recording)}
          className={`rounded-2xl flex flex-col items-center justify-center py-10 mb-6 transition-all ${
            recording
              ? "border-2 border-primary bg-background"
              : "bg-muted"
          }`}
          style={recording ? { animation: "pulse-ring 1.5s infinite" } : undefined}
        >
          <Mic size={32} className={recording ? "text-primary" : "text-muted-foreground"} />
          <span
            className={`text-sm font-semibold mt-2 ${
              recording ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {recording ? "Recording..." : "Tap to speak"}
          </span>
          {!recording && (
            <span className="text-xs text-muted-foreground mt-1">Match the rhythm</span>
          )}
        </button>

        <div className="mt-auto pb-8">
          <button
            onClick={() => navigate("/feedback")}
            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-[50px] text-sm"
          >
            See Feedback →
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default MimicScreen;
