import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
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

// ─── Scoring utilities ────────────────────────────────────────────────────────
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const curr = a[i - 1] === b[j - 1] ? row[j - 1] : 1 + Math.min(row[j], prev, row[j - 1]);
      row[j - 1] = prev;
      prev = curr;
    }
    row[b.length] = prev;
  }
  return row[b.length];
};

const fuzzyWordMatch = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a.length <= 2 || b.length <= 2) return false; // short words: exact only
  const maxDist = Math.max(a.length, b.length) <= 6 ? 1 : 2;
  return levenshtein(a, b) <= maxDist;
};

/** LCS-based alignment: returns indices of targetWords that were spoken */
const lcsMatch = (targetWords: string[], spokenWords: string[]): Set<number> => {
  const n = targetWords.length, m = spokenWords.length;
  if (m === 0 || n === 0) return new Set();
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = fuzzyWordMatch(targetWords[i - 1], spokenWords[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const matched = new Set<number>();
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (fuzzyWordMatch(targetWords[i - 1], spokenWords[j - 1])) { matched.add(i - 1); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return matched;
};

const cleanWord = (w: string) => w.toLowerCase().replace(/[.,!?—'"]/g, "").trim();
// ─────────────────────────────────────────────────────────────────────────────

function CompleteScreen({ totalSentences, avgScore, onHome, onMap }: {
  totalSentences: number;
  avgScore: number;
  onHome: () => void;
  onMap: () => void;
}) {
  useEffect(() => {
    // Subtle confetti with warm, muted colors matching the UI
    const colors = ["#d4c4b0", "#c9b99a", "#a8d5ba", "#e8dcc8", "#b8a082"];

    // First burst - gentle center spray
    confetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.6 },
      colors,
      gravity: 0.8,
      scalar: 1.2,
      drift: 0,
      ticks: 200,
    });

    // Second burst - delayed side sprays
    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors,
        gravity: 0.7,
        scalar: 1,
        ticks: 180,
      });
      confetti({
        particleCount: 30,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors,
        gravity: 0.7,
        scalar: 1,
        ticks: 180,
      });
    }, 200);
  }, []);

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
          View lesson
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
  const [selectedWordInfo, setSelectedWordInfo] = useState<{ word: string; rect: DOMRect } | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [listenDone, setListenDone] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const listenStarted = useRef(false);

  const [highlightedWords, setHighlightedWords] = useState<Set<number>>(new Set());
  const [scoring, setScoring] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const pausedRef = useRef(false);
  const accumulatedTranscriptRef = useRef("");
  const currentSessionTranscriptRef = useRef("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leavingRecordRef = useRef(false);

  const [wordResults, setWordResults] = useState<("correct" | "wrong")[]>([]);
  const [feedbackReady, setFeedbackReady] = useState(false);

  const TOTAL_SENTENCES = sentences?.length ?? 0;
  const currentSentence = sentences?.[sentenceIndex];
  const sentenceWords = currentSentence?.text.split(" ") ?? [];
  const sentenceText = currentSentence?.text ?? "";

  // Pre-load already-saved bookmarks when sentences are available
  useEffect(() => {
    if (!user || !sentences || sentences.length === 0) return;
    const loadSaved = async () => {
      const sentenceIds = sentences.map((s) => s.id);
      const { data: phrases } = await supabase
        .from("phrases")
        .select("id, sentence_id")
        .in("sentence_id", sentenceIds);
      if (!phrases || phrases.length === 0) return;
      const phraseIds = phrases.map((p) => p.id);
      const { data: vocab } = await supabase
        .from("user_vocab")
        .select("phrase_id")
        .eq("user_id", user.id)
        .in("phrase_id", phraseIds);
      if (!vocab || vocab.length === 0) return;
      const savedPhraseIds = new Set(vocab.map((v) => v.phrase_id));
      const savedSentenceIds = new Set(
        phrases.filter((p) => savedPhraseIds.has(p.id)).map((p) => p.sentence_id)
      );
      setBookmarked(new Set(
        sentences.map((s, i) => (savedSentenceIds.has(s.id) ? i : -1)).filter((i) => i >= 0)
      ));
    };
    loadSaved();
  }, [user, sentences]);

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
    const spokenArr = spokenText.toLowerCase().replace(/[.,!?—'"]/g, "").split(/\s+/).filter(Boolean);
    const targetArr = sentenceWords.map(cleanWord);
    return lcsMatch(targetArr, spokenArr);
  }, [sentenceWords]);

  useEffect(() => {
    if (step !== "record" || !sentenceText) return;
    // Reset the leaving flag when entering record step
    leavingRecordRef.current = false;
    setHighlightedWords(new Set());
    setRecordingPaused(false);
    pausedRef.current = false;
    accumulatedTranscriptRef.current = "";

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
          if (pausedRef.current) return;
          let sessionTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            sessionTranscript += event.results[i][0].transcript + " ";
          }
          currentSessionTranscriptRef.current = sessionTranscript.trim();
          const fullTranscript = (accumulatedTranscriptRef.current + " " + sessionTranscript).trim();
          lastTranscript = fullTranscript;
          const matched = matchSpokenWords(fullTranscript);
          setHighlightedWords(matched);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => { if (!pausedRef.current) { stopped = true; finishRecording(lastTranscript); } }, 2500);
        };
        recognition.onspeechend = () => {
          if (pausedRef.current) return;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => { if (!pausedRef.current) { stopped = true; finishRecording(lastTranscript); } }, 2000);
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

    // LCS + fuzzy scoring: finds best global alignment, no cascade failures
    const scoreWords = (spokenText: string): ("correct" | "wrong")[] => {
      const spokenArr = spokenText.toLowerCase().replace(/[.,!?—'"]/g, "").split(/\s+/).filter(Boolean);
      const targetArr = sentenceWords.map(cleanWord);
      const matched = lcsMatch(targetArr, spokenArr);
      return targetArr.map((_, idx) => matched.has(idx) ? "correct" : "wrong");
    };

    const finishRecording = async (spokenText: string) => {
      if (finished || leavingRecordRef.current) return;
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
    // Mark that we're intentionally leaving record step
    leavingRecordRef.current = true;
    // Stop any ongoing recognition
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    stopPlayback();
    setFeedbackReady(false);
    setWordResults([]);
    setHighlightedWords(new Set());
    setScoring(false);
    setListenDone(false);
    listenStarted.current = false;
    setStep("listen");
  }, [stopPlayback]);

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
        <div className="relative pt-5 pb-2">
          {/* Close button - positioned at left edge */}
          <button onClick={() => setShowExitConfirm(true)} className="absolute left-4 top-5 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <X size={16} className="text-muted-foreground" />
          </button>
          {/* Progress bar - centered */}
          <div className="max-w-2xl mx-auto w-full px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 shrink-0" />
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
              <div className="w-10 shrink-0" />
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
                  {(isPlaying || ttsLoading) && <div className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-lg">Listening...</div>}
                  <button onClick={toggleBookmark} className="absolute right-0">
                    {isBookmarked ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} className="text-muted-foreground/40" />}
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <p className="text-3xl font-medium text-center leading-relaxed text-muted-foreground/40">{sentenceText}</p>
                </div>
                <p className="text-sm text-muted-foreground text-center mb-20">{currentSentence?.translation}</p>
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
                    <div className="bg-foreground text-background text-xs font-medium px-3 py-1 rounded-lg">Speak now...</div>
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
                <div className="relative flex items-center justify-center mb-2">
                  <button disabled={scoring} onClick={() => { stopPlayback(); setScoring(false); handleRetry(); }} className="absolute right-[calc(50%+52px)] w-11 h-11 flex items-center justify-center disabled:opacity-30">
                    <RotateCcw size={24} className="text-muted-foreground" />
                  </button>
                  <button
                    disabled={scoring}
                    onClick={() => {
                      if (recordingPaused) {
                        // Resume: reset current session ref and restart recognition
                        currentSessionTranscriptRef.current = "";
                        pausedRef.current = false;
                        setRecordingPaused(false);
                        if (recognitionRef.current) try { recognitionRef.current.start(); } catch {}
                      } else {
                        // Pause: save current session transcript to accumulated
                        accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + " " + currentSessionTranscriptRef.current).trim();
                        currentSessionTranscriptRef.current = "";
                        pausedRef.current = true;
                        setRecordingPaused(true);
                        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
                        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
                      }
                    }}
                    className="w-16 h-16 rounded-full bg-[#8c7d73] flex items-center justify-center disabled:opacity-30 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                  >
                    {recordingPaused ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="ml-0.5">
                        <path d="M6.906 4.537A1 1 0 0 0 5.5 5.41v13.18a1 1 0 0 0 1.406.873l12.5-6.59a1 1 0 0 0 0-1.746l-12.5-6.59z" />
                      </svg>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                        <rect x="6" y="5" width="4" height="14" rx="1.5" />
                        <rect x="14" y="5" width="4" height="14" rx="1.5" />
                      </svg>
                    )}
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
                    <div className="bg-success w-10 h-10 rounded-xl flex items-center justify-center"><Check size={22} strokeWidth={3} className="text-white" /></div>
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
                      <span
                        key={i}
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setSelectedWordInfo({ word, rect });
                        }}
                        className={`cursor-pointer active:opacity-70 ${
                          wordResults[i] === "correct" ? "text-success" : wordResults[i] === "wrong" ? "text-destructive underline decoration-2 underline-offset-4" : "text-muted-foreground/35"
                        }`}
                      >
                        {word}{" "}
                      </span>
                    ))}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  {currentSentence?.translation}
                </p>
                <div className="flex items-center justify-center gap-8 mb-5">
                  <button onClick={replayTTS} disabled={isPlaying} className="flex items-center gap-1.5 text-sm text-foreground font-medium disabled:opacity-50">
                    {playingType === "tts" ? <Pause size={15} /> : <Volume2 size={15} />} Example
                  </button>
                  <button onClick={handlePlayRecording} disabled={isPlaying} className="flex items-center gap-1.5 text-sm text-foreground font-medium disabled:opacity-50">
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
      <WordDetailSheet
        word={selectedWordInfo?.word ?? null}
        anchorRect={selectedWordInfo?.rect ?? null}
        onClose={() => setSelectedWordInfo(null)}
      />
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
