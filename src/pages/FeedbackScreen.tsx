import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { wordScores, savedPhrases } from "@/data/lessons";

const getColor = (score: number) => {
  if (score >= 80) return { bg: "bg-success/15", text: "text-success", border: "border-success/30" };
  if (score >= 55) return { bg: "bg-warning/15", text: "text-warning", border: "border-warning/30" };
  return { bg: "bg-destructive/15", text: "text-destructive", border: "border-destructive/30" };
};

const FeedbackScreen = () => {
  const navigate = useNavigate();
  const [expandedWord, setExpandedWord] = useState<number | null>(null);
  const overallScore = 82;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (overallScore / 100) * circumference;

  const lowestWord = wordScores.reduce((a, b) => (a.score < b.score ? a : b));

  return (
    <AppLayout showTabs={false}>
      <div className="px-5 pt-5 flex flex-col min-h-screen">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <span className="text-xs text-muted-foreground">Step 3 of 4 — Feedback</span>
        </div>

        <div className="w-full h-1 bg-muted rounded-full mb-6">
          <div className="h-full bg-primary rounded-full" style={{ width: "75%" }} />
        </div>

        {/* Score circle */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ animation: "score-fill 1s ease-out forwards" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-foreground">{overallScore}</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground mt-2 bg-muted px-3 py-1 rounded-full">
            Good rhythm!
          </span>
        </div>

        {/* Word by word */}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Word by word
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {wordScores.map((w, i) => {
            const c = getColor(w.score);
            return (
              <button
                key={i}
                onClick={() => setExpandedWord(expandedWord === i ? null : i)}
                className={`${c.bg} ${c.text} border ${c.border} rounded-full px-3 py-1 text-xs font-semibold`}
              >
                {w.word} {w.score}
              </button>
            );
          })}
        </div>
        {expandedWord !== null && (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3 mb-4">
            💡 {wordScores[expandedWord].tip}
          </p>
        )}

        {/* Improvement */}
        <div className="bg-muted rounded-xl p-4 mb-6 mt-2">
          <h4 className="text-xs font-semibold text-foreground mb-1">One thing to improve</h4>
          <p className="text-sm text-muted-foreground">{lowestWord.tip}</p>
        </div>

        {/* Saved phrases */}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Phrases saved
        </h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {savedPhrases.map((p, i) => (
            <span
              key={i}
              className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5 font-medium"
            >
              {p.en} — {p.zh}
            </span>
          ))}
        </div>

        <div className="mt-auto pb-8">
          <button
            onClick={() => navigate("/")}
            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-[50px] text-sm"
          >
            Next Sentence →
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default FeedbackScreen;
