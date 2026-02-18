import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCourse } from "@/contexts/CourseContext";
import { useQueryClient } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const ROLES = [
  { id: "designer", label: "Product Designer", en: "Product Designer" },
  { id: "pm", label: "Product Manager", en: "Product Manager" },
  { id: "frontend", label: "Frontend Developer", en: "Frontend Developer" },
  { id: "backend", label: "Backend Developer", en: "Backend Developer" },
  { id: "data", label: "Data Analyst", en: "Data Analyst" },
  { id: "other", label: "Other", en: "Professional" },
];

const COMFORT_LEVELS = [
  {
    id: "freeze",
    label: "I freeze up when speaking English",
    sub: "I understand, but words fail me when I open my mouth",
    en: "understands English well but freezes when speaking, often losing words under pressure",
  },
  {
    id: "pressure",
    label: "Fine day-to-day, but I struggle under pressure",
    sub: "Design reviews, exec presentations, and pushback situations",
    en: "comfortable in day-to-day English but struggles under pressure — reviews, exec presentations, and pushback situations",
  },
  {
    id: "natural",
    label: "I speak fluently, but not naturally",
    sub: "I want to sound less like a direct translation",
    en: "speaks fluently but wants to sound more natural and less like a direct translation",
  },
];

const SCENARIOS_BY_ROLE: Record<string, string[]> = {
  designer: [
    "Defending my design when someone pushes back",
    "Explaining design decisions to PM or engineers",
    "Presenting user research findings",
    "Syncing progress in cross-timezone meetings",
    "Running a design critique session",
  ],
  pm: [
    "Getting team aligned on product direction",
    "Handling 'that's not feasible' from engineers",
    "Pushing back on stakeholder priority changes",
    "Making data-driven decisions in discussion",
    "Facilitating cross-team roadmap planning",
  ],
  frontend: [
    "Explaining technical decisions in code review",
    "Evaluating and responding to feature requests",
    "Advocating for fixing technical debt",
    "Discussing architecture with senior engineers",
    "Collaborating with designers and PMs",
  ],
  backend: [
    "Explaining technical decisions in code review",
    "Evaluating and responding to feature requests",
    "Advocating for fixing technical debt",
    "Discussing architecture with senior engineers",
    "Collaborating with designers and PMs",
  ],
  data: [
    "Presenting findings to non-technical stakeholders",
    "Explaining why data doesn't support a decision",
    "Discussing methodology with skeptical audiences",
    "Requesting cleaner data from engineering",
    "Turning insight into actionable recommendation",
  ],
  other: [
    "Speaking up confidently in team meetings",
    "Giving and receiving feedback professionally",
    "Presenting work to senior leadership",
    "Handling disagreement without sounding defensive",
    "Building rapport with international colleagues",
  ],
};

function buildContext(roleId: string, comfortId: string, scenarios: string[]): string {
  const role = ROLES.find((r) => r.id === roleId);
  const comfort = COMFORT_LEVELS.find((c) => c.id === comfortId);
  const roleEn = role?.en ?? "Professional";
  const comfortDesc = comfort?.en ?? "";
  const topScenario = scenarios[0] ?? "";
  const rest = scenarios.slice(1);
  const restStr = rest.length > 0 ? `, ${rest.join(", ").toLowerCase()}` : "";
  return `Alex is a ${roleEn} at a US tech company with a distributed international team. Alex ${comfortDesc}. The biggest challenge is: ${topScenario.toLowerCase()}. This course follows Alex through real workplace moments — including ${topScenario.toLowerCase()}${restStr}.`;
}

const TOTAL_STEPS = 4;

const CreateCourse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActiveCourse } = useCourse();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedComfort, setSelectedComfort] = useState("");
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auto-generate context when entering step 4
  useEffect(() => {
    if (step === 4 && selectedRole && selectedComfort && selectedScenarios.length > 0) {
      setContext(buildContext(selectedRole, selectedComfort, selectedScenarios));
    }
  }, [step]);

  const scenarios = SCENARIOS_BY_ROLE[selectedRole] ?? SCENARIOS_BY_ROLE.other;

  const toggleScenario = (s: string) => {
    setSelectedScenarios((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= 3) return prev;
      return [...prev, s];
    });
  };

  const selectRole = (id: string) => {
    if (id !== selectedRole) setSelectedScenarios([]);
    setSelectedRole(id);
  };

  const canNext = () => {
    if (step === 1) return !!selectedRole;
    if (step === 2) return !!selectedComfort;
    if (step === 3) return selectedScenarios.length > 0;
    return context.trim().length >= 20;
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else navigate(-1);
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const handleGenerate = async () => {
    if (!user || context.trim().length < 20) return;
    setLoading(true);
    setProgress(0);
    setProgressStep("Connecting to server...");
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-course`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ context: context.trim(), user_id: user.id }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Unable to read response stream");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error);
          if (data.progress !== undefined) setProgress(data.progress);
          if (data.step) setProgressStep(data.step);
          if (data.done && data.course_id) {
            await queryClient.invalidateQueries({ queryKey: ["courses"] });
            await queryClient.invalidateQueries({ queryKey: ["scenes"] });
            setActiveCourse(data.course_id);
            navigate("/map");
            return;
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed, please try again");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout showTabs={false}>
        <div className="flex-1 flex flex-col items-center justify-center gap-5 min-h-screen px-10">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles size={28} className="text-primary animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold font-serif text-foreground mb-1">Generating your course</p>
            <p className="text-sm text-muted-foreground">{progressStep}</p>
          </div>
          <div className="w-full max-w-sm">
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">{progress}%</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showTabs={false}>
      <div className="flex flex-col min-h-screen">
        {/* Header + Progress */}
        <div className="max-w-xl mx-auto w-full px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handleBack}>
              <ArrowLeft size={22} className="text-foreground" />
            </button>
            <span className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS}</span>
          </div>
          <div className="w-full h-1 bg-muted rounded-full">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 max-w-xl mx-auto w-full px-8 pt-4 pb-8 overflow-y-auto">

          {/* Step 1: Role */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold font-serif text-foreground">What's your role?</h2>
                <p className="text-sm text-muted-foreground mt-1">We'll tailor scenarios to your work</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectRole(r.id)}
                    className={`px-4 py-3.5 rounded-2xl text-sm font-medium border transition-colors text-center ${
                      selectedRole === r.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Comfort level */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold font-serif text-foreground">How's your English right now?</h2>
                <p className="text-sm text-muted-foreground mt-1">Be honest — this helps us create the right course for you</p>
              </div>
              <div className="flex flex-col gap-3">
                {COMFORT_LEVELS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedComfort(c.id)}
                    className={`w-full text-left px-4 py-4 rounded-2xl border transition-colors ${
                      selectedComfort === c.id
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${selectedComfort === c.id ? "text-primary-foreground" : "text-foreground"}`}>
                      {c.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${selectedComfort === c.id ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                      {c.sub}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Scenarios */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold font-serif text-foreground">Which situations do you want to master?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pick up to 3
                  {selectedScenarios.length > 0 && (
                    <span className="text-primary font-medium"> · {selectedScenarios.length} selected</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {scenarios.map((s) => {
                  const isSelected = selectedScenarios.includes(s);
                  const isDisabled = !isSelected && selectedScenarios.length >= 3;
                  return (
                    <button
                      key={s}
                      onClick={() => !isDisabled && toggleScenario(s)}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl text-sm border transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : isDisabled
                          ? "bg-card text-muted-foreground/40 border-border"
                          : "bg-card text-foreground border-border"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Character description */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-bold font-serif text-foreground">Meet your character</h2>
                <p className="text-sm text-muted-foreground mt-1">Your course will be built around this persona</p>
              </div>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={7}
                className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none leading-relaxed"
              />
              <p className="text-xs text-muted-foreground -mt-2">You can edit this description before generating</p>
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={context.trim().length < 20}
                className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} className="text-primary-foreground" />
                Generate My Course
              </button>
            </div>
          )}
        </div>

        {/* Next button (steps 1–3) */}
        {step < 4 && (
          <div className="max-w-xl mx-auto w-full px-8 pb-10">
            <button
              onClick={handleNext}
              disabled={!canNext()}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl text-sm disabled:opacity-35 disabled:cursor-not-allowed transition-opacity"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CreateCourse;
