import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Volume2, Mic, Pause, Play, RotateCcw, Check, Loader2 } from "lucide-react";
import { useAudio } from "@/hooks/use-audio";

type Step = "listen" | "record" | "feedback";

interface PracticeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sentence: string;
}

const PracticeSheet = ({ open, onOpenChange, sentence }: PracticeSheetProps) => {
  const words = sentence.split(/\s+/);
  const { playTTS, isPlaying, startRecording, stopRecording, playRecording, transcribe, stopPlayback, ensureStream } = useAudio();

  const [step, setStep] = useState<Step>("listen");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [listenDone, setListenDone] = useState(false);
  const listenStarted = useRef(false);

  const [highlightedWords, setHighlightedWords] = useState<Set<number>>(new Set());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [wordResults, setWordResults] = useState<("correct" | "wrong")[]>([]);
  const [playingType, setPlayingType] = useState<"tts" | "recording" | null>(null);

  // Reset when sheet opens
  useEffect(() => {
    if (open) {
      setStep("listen");
      setListenDone(false);
      listenStarted.current = false;
      setHighlightedWords(new Set());
      setWordResults([]);
      setPlayingType(null);
    } else {
      stopPlayback();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    }
  }, [open]);

  // ─── LISTEN: auto-play ───
  useEffect(() => {
    if (!open || step !== "listen") return;
    if (listenStarted.current) return;
    listenStarted.current = true;

    const doPlay = async () => {
      ensureStream().catch(() => {});
      setTtsLoading(true);
      try { await playTTS(sentence); } catch {}
      setTtsLoading(false);
      setListenDone(true);
    };
    doPlay();

    return () => { stopPlayback(); };
  }, [open, step]);

  // Auto-advance listen → record
  useEffect(() => {
    if (!listenDone || step !== "listen") return;
    setStep("record");
  }, [listenDone, step]);

  // ─── Match helper ───
  const matchSpokenWords = useCallback((spokenText: string) => {
    const spoken = spokenText.toLowerCase().replace(/[.,!?]/g, "");
    const spokenArr = spoken.split(/\s+/).filter(Boolean);
    const matched = new Set<number>();
    words.forEach((w, i) => {
      const clean = w.toLowerCase().replace(/[.,!?]/g, "");
      if (spokenArr.includes(clean)) matched.add(i);
    });
    return matched;
  }, [words]);

  // ─── RECORD ───
  useEffect(() => {
    if (!open || step !== "record") return;
    setHighlightedWords(new Set());

    let finished = false;

    // Score words strictly: sequential order matching
    const scoreWords = (spokenText: string): ("correct" | "wrong")[] => {
      const spoken = spokenText.toLowerCase().replace(/[.,!?—']/g, "");
      const spokenArr = spoken.split(/\s+/).filter(Boolean);
      const results: ("correct" | "wrong")[] = [];
      let spokenIdx = 0;
      for (const w of words) {
        const clean = w.toLowerCase().replace(/[.,!?—']/g, "");
        let found = false;
        for (let j = spokenIdx; j < Math.min(spokenIdx + 3, spokenArr.length); j++) {
          if (spokenArr[j] === clean) {
            found = true;
            spokenIdx = j + 1;
            break;
          }
        }
        results.push(found ? "correct" : "wrong");
      }
      return results;
    };

    const beginRecording = async () => {
      stopPlayback();
      try { await startRecording(); } catch {}

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;
        recognition.lang = "en-US";
        recognition.interimResults = true;
        recognition.continuous = true;
        let stopped = false;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
          const matched = matchSpokenWords(fullTranscript);
          setHighlightedWords(matched);

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopped = true;
            finishRecording(fullTranscript.trim());
          }, 2500);
        };

        recognition.onerror = (event) => {
          if (event.error !== "no-speech" && event.error !== "aborted") console.log("SR error:", event.error);
        };

        recognition.onend = () => {
          if (!stopped && recognitionRef.current === recognition) {
            try { recognition.start(); } catch { /* ignore */ }
          }
        };

        recognition.start();
      } else {
        setTimeout(() => finishRecording(""), 5000);
      }
    };

    const finishRecording = async (spokenText: string) => {
      if (finished) return;
      finished = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      const blob = await stopRecording();

      try {
        const result = await transcribe(blob);
        const text = result.text || spokenText || "";
        setWordResults(scoreWords(text));
      } catch {
        if (spokenText) {
          setWordResults(scoreWords(spokenText));
        } else {
          setWordResults(words.map(() => "correct"));
        }
      }

      setTimeout(() => setStep("feedback"), 400);
    };

    beginRecording();

    const maxTimer = setTimeout(() => finishRecording(""), 30000);

    return () => {
      clearTimeout(maxTimer);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [open, step]);

  const handleRetry = useCallback(() => {
    setWordResults([]);
    setHighlightedWords(new Set());
    setListenDone(false);
    listenStarted.current = false;
    setStep("listen");
  }, []);

  const replayTTS = useCallback(async () => {
    stopPlayback();
    setPlayingType("tts");
    setTtsLoading(true);
    try { await playTTS(sentence); } catch {}
    setTtsLoading(false);
    setPlayingType(null);
  }, [playTTS, stopPlayback, sentence]);

  const handlePlayRecording = useCallback(async () => {
    if (isPlaying) return;
    setPlayingType("recording");
    try { await playRecording(); } catch {}
    setPlayingType(null);
  }, [playRecording, isPlaying]);

  const allCorrect = wordResults.length > 0 && wordResults.every((r) => r === "correct");

  // Progress: listen=33%, record=66%, feedback=100%
  const progressPct = step === "listen" ? 33 : step === "record" ? 66 : 100;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 pt-10 min-h-[55vh] bg-card">
        <SheetTitle className="sr-only">Mimic Practice</SheetTitle>

        {/* ─── LISTEN ─── */}
        {step === "listen" && (
          <div className="flex flex-col items-center animate-fade-in">
            <p className="text-xl font-semibold text-foreground text-center leading-relaxed mb-6 px-2">
              {sentence}
            </p>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => { if (isPlaying) stopPlayback(); else replayTTS(); }}
                className="w-14 h-14 rounded-full bg-muted/20 flex items-center justify-center"
              >
                {ttsLoading && !isPlaying ? (
                  <Loader2 size={24} className="text-primary animate-spin" />
                ) : isPlaying ? (
                  <Pause size={24} className="text-primary" />
                ) : (
                  <Play size={24} className="text-primary ml-0.5" />
                )}
              </button>
            </div>
            
          </div>
        )}

        {/* ─── RECORD ─── */}
        {step === "record" && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-lg mb-4 animate-pulse">
              Speak now...
            </div>
            <p className="text-xl font-semibold text-center leading-relaxed mb-6 px-2">
              {words.map((word, i) => (
                <span
                  key={i}
                  className={`transition-colors duration-300 ${
                    highlightedWords.has(i) ? "text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  {word}{" "}
                </span>
              ))}
            </p>
            
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <RotateCcw size={14} />
              Listen again
            </button>
          </div>
        )}

        {/* ─── FEEDBACK ─── */}
        {step === "feedback" && (
          <div className="flex flex-col items-center animate-fade-in">
            {allCorrect ? (
              <div className="bg-success text-success-foreground w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                <Check size={22} strokeWidth={3} />
              </div>
            ) : (
              <div className="bg-warning text-warning-foreground w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-base font-bold">
                !
              </div>
            )}

            <p className="text-xl font-semibold text-center leading-relaxed mb-5 px-2">
              {words.map((word, i) => (
                <span
                  key={i}
                  className={
                    wordResults[i] === "correct"
                      ? "text-success"
                      : wordResults[i] === "wrong"
                      ? "text-destructive underline decoration-2 underline-offset-4"
                      : "text-muted-foreground/50"
                  }
                >
                  {word}{" "}
                </span>
              ))}
            </p>

            <div className="flex items-center gap-5 mb-4">
              <button
                onClick={replayTTS}
                disabled={isPlaying}
                className="flex items-center gap-1.5 text-xs text-primary font-medium disabled:opacity-50"
              >
                {playingType === "tts" ? <Pause size={14} /> : <Volume2 size={14} />}
                Model
              </button>
              <button
                onClick={handlePlayRecording}
                disabled={isPlaying}
                className="flex items-center gap-1.5 text-xs text-primary font-medium disabled:opacity-50"
              >
                {playingType === "recording" ? <Pause size={14} /> : <Play size={14} />}
                My recording
              </button>
            </div>

            <button
              onClick={handleRetry}
              className="flex items-center gap-2 bg-muted/20 text-muted-foreground px-5 py-2.5 rounded-full text-xs font-medium"
            >
              <RotateCcw size={14} />
              Try again
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PracticeSheet;
