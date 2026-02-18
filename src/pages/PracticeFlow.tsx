import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X, Bookmark, BookmarkCheck, RotateCcw, Volume2, Check, Pause, Play, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import WordDetailSheet from "@/components/WordDetailSheet";
import { useAudio } from "@/hooks/use-audio";
import { useSentences, useScene } from "@/hooks/use-scenes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Step = "intro" | "listen" | "record" | "feedback" | "complete";

function CompleteScreen({ totalSentences, avgScore, onHome, onMap }: {
  totalSentences: number;
  avgScore: number;
  onHome: () => void;
  onMap: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mb-6">
          <Check size={40} className="text-success" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold font-serif text-foreground mb-3">Well done!</h1>
        <p className="text-sm text-muted-foreground mb-1">You completed all sentences</p>
        <p className="text-[12px] text-muted-foreground">
          {totalSentences} sentences · Avg score {avgScore}
        </p>
      </div>
      <div className="w-full flex flex-col gap-3 mt-12">
        <button onClick={onHome} className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl text-sm shadow-sm">
          Home
        </button>
        <button onClick={onMap} className="w-full bg-muted text-foreground font-medium py-3.5 rounded-xl text-sm">
          View Map
        </button>
      </div>
    </div>
  );
}

const PracticeFlow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sceneId = searchParams.get("sceneId");
  const { user } = useAuth();
  const { playTTS, isPlaying, startRecording, stopRecording, playRecording, transcribe, stopPlayback, ensureStream } = useAudio();

  const { data: scene } = useScene(sceneId);
  const { data: sentences, isLoading } = useSentences(sceneId);

  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [step, setStep] = useState<Step>("listen");
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [listenDone, setListenDone] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const listenStarted = useRef(false);

  const [highlightedWords, setHighlightedWords] = useState<Set<number>>(new Set());
  const [scoring, setScoring] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [wordResults, setWordResults] = useState<("correct" | "wrong")[]>([]);
  const [feedbackReady, setFeedbackReady] = useState(false);

  const TOTAL_SENTENCES = sentences?.length ?? 0;
  const currentSentence = sentences?.[sentenceIndex];
  const sentenceWords = currentSentence?.text.split(" ") ?? [];
  const sentenceText = currentSentence?.text ?? "";

  const handleIntroContinue = () => setStep("listen");

  useEffect(() => {
    if (step !== "listen" || !sentenceText) return;
    setListenDone(false);
    listenStarted.current = false;
    const doPlay = async () => {
      if (listenStarted.current) return;
      listenStarted.current = true;
      // Pre-warm mic while TTS plays so recording starts instantly
      ensureStream().catch(() => {});
      setTtsLoading(true);
      try { await playTTS(sentenceText); } catch {}
      setTtsLoading(false);
      setListenDone(true);
    };
    doPlay();
    return () => { stopPlayback(); };
  }, [step, sentenceIndex, sentenceText]);

  useEffect(() => {
    if (!listenDone || step !== "listen") return;
    setStep("record");
  }, [listenDone, step]);

  const matchSpokenWords = useCallback((spokenText: string) => {
    const spoken = spokenText.toLowerCase().replace(/[.,!?—]/g, "");
    const spokenWords = spoken.split(/\s+/).filter(Boolean);
    const matched = new Set<number>();
    let spokenIdx = 0;
    sentenceWords.forEach((w, i) => {
      const clean = w.toLowerCase().replace(/[.,!?—]/g, "");
      for (let j = spokenIdx; j < spokenWords.length; j++) {
        if (spokenWords[j] === clean) {
          matched.add(i);
          spokenIdx = j + 1;
          break;
        }
      }
    });
    return matched;
  }, [sentenceWords]);

  useEffect(() => {
    if (step !== "record" || !sentenceText) return;
    setHighlightedWords(new Set());
    setRecordingPaused(false);

    let finished = false;

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
        recognition.maxAlternatives = 1;
        let lastTranscript = "";
        let fatalError = false;
        let stopped = false;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
          lastTranscript = fullTranscript.trim();
          const matched = matchSpokenWords(fullTranscript);
          setHighlightedWords(matched);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => { stopped = true; finishRecording(lastTranscript); }, 2500);
        };
        recognition.onspeechend = () => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => { stopped = true; finishRecording(lastTranscript); }, 2000);
        };
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === "no-speech" || event.error === "aborted") return;
          if (event.error === "not-allowed" || event.error === "audio-capture" || event.error === "service-not-allowed") {
            fatalError = true;
          }
        };
        recognition.onend = () => {
          if (!fatalError && !stopped && recognitionRef.current === recognition) {
            try { recognition.start(); } catch { /* ignore */ }
          }
        };
        recognition.start();
      } else {
        setTimeout(() => finishRecording(""), 5000);
      }
    };

    // Score words strictly: sequential order matching
    const scoreWords = (spokenText: string): ("correct" | "wrong")[] => {
      const spoken = spokenText.toLowerCase().replace(/[.,!?—']/g, "");
      const spokenArr = spoken.split(/\s+/).filter(Boolean);
      const results: ("correct" | "wrong")[] = [];
      let spokenIdx = 0;
      for (const w of sentenceWords) {
        const clean = w.toLowerCase().replace(/[.,!?—']/g, "");
        let found = false;
        // Look ahead up to 2 positions to allow minor insertions (e.g. "uh", "um")
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

    const finishRecording = async (spokenText: string) => {
      if (finished) return;
      finished = true;
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      setScoring(true);
      const blob = await stopRecording();
      try {
        const result = await transcribe(blob);
        const text = result.text || spokenText || "";
        const results = scoreWords(text);
        setWordResults(results);
        const score = Math.round((results.filter(r => r === "correct").length / results.length) * 100);
        setScores(prev => [...prev, score]);
      } catch {
        if (spokenText) {
          const results = scoreWords(spokenText);
          setWordResults(results);
          const score = Math.round((results.filter(r => r === "correct").length / results.length) * 100);
          setScores(prev => [...prev, score]);
        } else {
          setWordResults(sentenceWords.map(() => "correct"));
          setScores(prev => [...prev, 100]);
        }
      }
      setTimeout(() => { setScoring(false); setFeedbackReady(true); setStep("feedback"); }, 500);
    };

    beginRecording();
    const maxTimer = setTimeout(() => finishRecording(""), 30000);
    return () => {
      clearTimeout(maxTimer);
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    };
  }, [step, sentenceIndex, sentenceText]);

  useEffect(() => {
    if (step !== "feedback") return;
    setFeedbackReady(true);
  }, [step]);

  useEffect(() => {
    if (step !== "complete" || !user || !sceneId) return;
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    supabase.from("scene_progress").upsert({
      user_id: user.id,
      scene_id: sceneId,
      avg_score: avgScore,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,scene_id" }).then(() => {});
  }, [step, user, sceneId, scores]);

  const saveBookmarks = useCallback(async () => {
    if (!user || !sentences) return;
    for (const idx of bookmarked) {
      const sentenceId = sentences[idx]?.id;
      if (!sentenceId) continue;
      const { data: phrases } = await supabase.from("phrases").select("id").eq("sentence_id", sentenceId);
      if (phrases) {
        for (const phrase of phrases) {
          await supabase.from("user_vocab").upsert({
            user_id: user.id,
            phrase_id: phrase.id,
          }, { onConflict: "user_id,phrase_id" }).select();
        }
      }
    }
  }, [user, sentences, bookmarked]);

  useEffect(() => {
    if (step === "complete") saveBookmarks();
  }, [step, saveBookmarks]);

  const handleNextSentence = useCallback(() => {
    setFeedbackReady(false);
    setWordResults([]);
    setHighlightedWords(new Set());
    if (sentenceIndex + 1 >= TOTAL_SENTENCES) {
      setStep("complete");
    } else {
      setListenDone(false);
      listenStarted.current = false;
      setSentenceIndex((i) => i + 1);
      setStep("listen");
    }
  }, [sentenceIndex, TOTAL_SENTENCES]);

  const handleRetry = useCallback(() => {
    setFeedbackReady(false);
    setWordResults([]);
    setHighlightedWords(new Set());
    setScoring(false);
    setListenDone(false);
    listenStarted.current = false;
    setStep("listen");
  }, []);

  const handlePrevSentence = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    stopPlayback();
    setFeedbackReady(false);
    setWordResults([]);
    setHighlightedWords(new Set());
    setScoring(false);
    setListenDone(false);
    listenStarted.current = false;
    setSentenceIndex((i) => i - 1);
    setStep("listen");
  }, [stopPlayback]);

  const handleGoNext = useCallback(() => {
    if (step === "listen") {
      stopPlayback();
      setListenDone(false);
      setStep("record");
    } else if (step === "feedback") {
      handleNextSentence();
    }
  }, [step, stopPlayback, handleNextSentence]);

  const isNavigationLocked = step === "record" || scoring;
  const canGoPrev = !isNavigationLocked && sentenceIndex > 0;
  const canGoNext = !isNavigationLocked && (step === "listen" || step === "feedback");

  const toggleBookmark = async () => {
    const isCurrentlyBookmarked = bookmarked.has(sentenceIndex);
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(sentenceIndex)) next.delete(sentenceIndex);
      else next.add(sentenceIndex);
      return next;
    });

    if (user && sentences) {
      const sentenceId = sentences[sentenceIndex]?.id;
      if (sentenceId) {
        const { data: phrases } = await supabase.from("phrases").select("id").eq("sentence_id", sentenceId);
        if (phrases) {
          for (const phrase of phrases) {
            if (isCurrentlyBookmarked) {
              await supabase.from("user_vocab").delete().eq("user_id", user.id).eq("phrase_id", phrase.id);
            } else {
              await supabase.from("user_vocab").upsert({
                user_id: user.id,
                phrase_id: phrase.id,
              }, { onConflict: "user_id,phrase_id" }).select();
            }
          }
        }
      }
    }
  };

  const [playingType, setPlayingType] = useState<"tts" | "recording" | null>(null);
  const replayTTS = useCallback(async () => {
    stopPlayback();
    setPlayingType("tts");
    setTtsLoading(true);
    setListenDone(false);
    try { await playTTS(sentenceText); } catch {}
    setTtsLoading(false);
    setPlayingType(null);
    if (step === "listen") setListenDone(true);
  }, [playTTS, stopPlayback, sentenceText, step]);

  const handlePlayRecording = useCallback(async () => {
    if (isPlaying) return;
    setPlayingType("recording");
    try { await playRecording(); } catch {}
    setPlayingType(null);
  }, [playRecording, isPlaying]);

  const isBookmarked = bookmarked.has(sentenceIndex);
  const allCorrect = wordResults.length > 0 && wordResults.every((r) => r === "correct");

  if (isLoading || !sentences) {
    return (
      <AppLayout showTabs={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showTabs={false}>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Top bar */}
        <div className="max-w-2xl mx-auto w-full px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowExitConfirm(true)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <X size={16} className="text-muted-foreground" />
            </button>
            <div className="flex-1 flex gap-1.5">
              {Array.from({ length: TOTAL_SENTENCES }).map((_, i) => {
                const stepOrder: Record<Step, number> = { intro: 0, listen: 1, record: 2, feedback: 4, complete: 4 };
                const subSteps = 4;
                let fillPercent = 0;
                if (i < sentenceIndex) fillPercent = 100;
                else if (i === sentenceIndex) fillPercent = Math.min((stepOrder[step] / subSteps) * 100, 100);
                return (
                  <div key={i} className="flex-1 h-1 rounded-full bg-border/60 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${fillPercent}%`, opacity: fillPercent > 0 ? 1 : 0 }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* INTRO */}
        {step === "intro" && currentSentence && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
            <div className="max-w-2xl w-full bg-card rounded-2xl p-10 flex flex-col items-center justify-center min-h-[55vh] shadow-xs">
              <h1 className="text-2xl font-bold font-serif text-foreground text-center mb-4">{scene?.title ?? ""}</h1>
              <p className="text-base text-muted-foreground text-center leading-relaxed">{currentSentence.translation}</p>
            </div>
            <button onClick={handleIntroContinue} className="mt-8 text-sm text-muted-foreground">Tap to continue</button>
          </div>
        )}

        {/* LISTEN */}
        {step === "listen" && (
          <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 animate-fade-in">
            <div className="flex-1 flex flex-row items-stretch gap-3 mt-4 mb-8">
              <button disabled={!canGoPrev} onClick={handlePrevSentence} className="self-center w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-colors disabled:opacity-25 hover:bg-muted/70">
                <ChevronLeft size={20} className="text-foreground" />
              </button>
              <div className="bg-card rounded-2xl p-8 flex-1 flex flex-col shadow-xs">
                <div className="relative flex items-center justify-center">
                  {!isPlaying && !ttsLoading && <div className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-lg">Paused</div>}
                  <button onClick={toggleBookmark} className="absolute right-0">
                    {isBookmarked ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} className="text-muted-foreground/40" />}
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                  <p className="text-3xl font-medium text-center leading-relaxed text-muted-foreground/40">{sentenceText}</p>
                </div>
                <p className="text-sm text-muted-foreground text-center mb-7">{currentSentence?.translation}</p>
                <div className="flex items-center justify-center gap-5 mb-2">
                  <button onClick={() => { stopPlayback(); setListenDone(false); listenStarted.current = false; replayTTS(); }} className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                    <RotateCcw size={17} className="text-primary" />
                  </button>
                  <button onClick={() => { if (isPlaying) { stopPlayback(); } else { replayTTS(); } }} className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {ttsLoading && !isPlaying ? <Loader2 size={26} className="text-primary animate-spin" /> : isPlaying ? <Pause size={26} className="text-primary" /> : <Play size={26} className="text-primary ml-0.5" />}
                  </button>
                </div>
              </div>
              <button disabled={!canGoNext} onClick={handleGoNext} className="self-center w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-colors disabled:opacity-25 hover:bg-muted/70">
                <ChevronRight size={20} className="text-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* RECORD */}
        {step === "record" && (
          <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 animate-fade-in">
            <div className="flex-1 flex flex-row items-stretch gap-3 mt-4 mb-8">
              <button disabled className="self-center w-10 h-10 rounded-full bg-muted flex items-center justify-center opacity-25">
                <ChevronLeft size={20} className="text-foreground" />
              </button>
              <div className="bg-card rounded-2xl p-8 flex-1 flex flex-col shadow-xs">
                <div className="relative flex items-center justify-center">
                  {scoring ? (
                    <div className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-lg">Scoring...</div>
                  ) : recordingPaused ? (
                    <div className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-lg">Paused</div>
                  ) : (
                    <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-lg animate-pulse">Speak now...</div>
                  )}
                  <button onClick={toggleBookmark} className="absolute right-0">
                    {isBookmarked ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} className="text-muted-foreground/40" />}
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                  <p className="text-3xl font-medium text-center leading-relaxed">
                    {sentenceWords.map((word, i) => (
                      <span key={i} className={`transition-colors duration-300 ${highlightedWords.has(i) ? "text-primary" : "text-muted-foreground/35"}`}>{word} </span>
                    ))}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground text-center mb-7">{currentSentence?.translation}</p>
                <div className="flex items-center justify-center gap-5 mb-2">
                  <button disabled={scoring} onClick={() => { stopPlayback(); setScoring(false); handleRetry(); }} className="w-11 h-11 rounded-full bg-muted flex items-center justify-center disabled:opacity-30">
                    <RotateCcw size={17} className="text-primary" />
                  </button>
                  <button
                    disabled={scoring}
                    onClick={() => {
                      if (recordingPaused) {
                        setRecordingPaused(false);
                        if (recognitionRef.current) try { recognitionRef.current.start(); } catch {}
                      } else {
                        setRecordingPaused(true);
                        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
                        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
                      }
                    }}
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center disabled:opacity-30"
                  >
                    {recordingPaused ? <Play size={26} className="text-primary ml-0.5" /> : <Pause size={26} className="text-primary" />}
                  </button>
                </div>
              </div>
              <button disabled className="self-center w-10 h-10 rounded-full bg-muted flex items-center justify-center opacity-25">
                <ChevronRight size={20} className="text-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* FEEDBACK */}
        {step === "feedback" && feedbackReady && (
          <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 animate-fade-in">
            <div className="flex-1 flex flex-row items-stretch gap-3 mt-4 mb-8">
              <button disabled={!canGoPrev} onClick={handlePrevSentence} className="self-center w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-colors disabled:opacity-25 hover:bg-muted/70">
                <ChevronLeft size={20} className="text-foreground" />
              </button>
              <div className="bg-card rounded-2xl p-8 flex-1 flex flex-col shadow-xs">
                <div className="relative flex items-center justify-center">
                  {isPlaying ? (
                    <div className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-lg">Playing...</div>
                  ) : allCorrect ? (
                    <div className="bg-success/10 text-success w-10 h-10 rounded-xl flex items-center justify-center"><Check size={22} strokeWidth={3} /></div>
                  ) : (
                    <div className="bg-warning/10 text-warning w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold">!</div>
                  )}
                  <button onClick={toggleBookmark} className="absolute right-0">
                    {isBookmarked ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} className="text-muted-foreground/40" />}
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                  <p className="text-3xl font-medium text-center leading-relaxed">
                    {sentenceWords.map((word, i) => (
                      <span key={i} onClick={() => setSelectedWord(word)} className={`cursor-pointer active:opacity-70 ${
                        wordResults[i] === "correct" ? "text-success" : wordResults[i] === "wrong" ? "text-destructive underline decoration-2 underline-offset-4" : "text-muted-foreground/35"
                      }`}>{word} </span>
                    ))}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  {currentSentence?.translation}
                </p>
                <div className="flex items-center justify-center gap-8 mb-5">
                  <button onClick={replayTTS} disabled={isPlaying} className="flex items-center gap-1.5 text-sm text-primary font-medium disabled:opacity-50">
                    {playingType === "tts" ? <Pause size={15} /> : <Volume2 size={15} />} Example
                  </button>
                  <button onClick={handlePlayRecording} disabled={isPlaying} className="flex items-center gap-1.5 text-sm text-primary font-medium disabled:opacity-50">
                    {playingType === "recording" ? <Pause size={15} /> : <Play size={15} />} Yours
                  </button>
                </div>
                <div className="flex items-center justify-center mb-1">
                  <button onClick={handleRetry} className="flex items-center gap-1.5 bg-muted text-muted-foreground px-5 py-2.5 rounded-full text-sm font-medium">
                    <RotateCcw size={14} /> Retry
                  </button>
                </div>
              </div>
              <button disabled={!canGoNext} onClick={handleGoNext} className="self-center w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-colors disabled:opacity-25 hover:bg-muted/70">
                <ChevronRight size={20} className="text-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* COMPLETE */}
        {step === "complete" && (
          <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6">
            <CompleteScreen
              totalSentences={TOTAL_SENTENCES}
              avgScore={scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0}
              onHome={() => navigate("/")}
              onMap={() => navigate("/map")}
            />
          </div>
        )}
      </div>
      <WordDetailSheet word={selectedWord} onClose={() => setSelectedWord(null)} />
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-[300px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave practice?</AlertDialogTitle>
            <AlertDialogDescription>Your current progress won't be saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (window.history.length > 2) navigate(-1);
              else navigate("/map", { replace: true });
            }}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default PracticeFlow;
