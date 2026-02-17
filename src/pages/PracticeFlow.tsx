import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X, Bookmark, BookmarkCheck, RotateCcw, Volume2, Check, Pause, Play, Loader2, PartyPopper, Home, ArrowRight } from "lucide-react";
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

const PracticeFlow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sceneId = searchParams.get("sceneId");
  const { user } = useAuth();
  const { playTTS, isPlaying, startRecording, stopRecording, playRecording, transcribe, stopPlayback } = useAudio();

  const { data: scene } = useScene(sceneId);
  const { data: sentences, isLoading } = useSentences(sceneId);

  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [step, setStep] = useState<Step>("listen");
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Listen state
  const [listenDone, setListenDone] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const listenStarted = useRef(false);

  // Record state
  const [highlightedWords, setHighlightedWords] = useState<Set<number>>(new Set());
  const [scoring, setScoring] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feedback state
  const [wordResults, setWordResults] = useState<("correct" | "wrong")[]>([]);
  const [feedbackReady, setFeedbackReady] = useState(false);

  const TOTAL_SENTENCES = sentences?.length ?? 0;
  const currentSentence = sentences?.[sentenceIndex];
  const sentenceWords = currentSentence?.text.split(" ") ?? [];
  const sentenceText = currentSentence?.text ?? "";

  // ─── INTRO ───
  const handleIntroContinue = () => setStep("listen");

  // ─── LISTEN: auto-play TTS ───
  useEffect(() => {
    if (step !== "listen" || !sentenceText) return;
    setListenDone(false);
    listenStarted.current = false;
    const doPlay = async () => {
      if (listenStarted.current) return;
      listenStarted.current = true;
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
    // Only highlight words sequentially - a word can only match if all previous words have been matched
    let spokenIdx = 0;
    sentenceWords.forEach((w, i) => {
      const clean = w.toLowerCase().replace(/[.,!?—]/g, "");
      // Search for this word starting from current position in spoken words
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

  // ─── RECORD ───
  useEffect(() => {
    if (step !== "record" || !sentenceText) return;
    setHighlightedWords(new Set());
    setRecordingPaused(false);

    const beginRecording = async () => {
      stopPlayback();
      try { await startRecording(); } catch {}
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        await new Promise(r => setTimeout(r, 300));
        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;
        recognition.lang = "en-US";
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;
        let lastTranscript = "";
        let fatalError = false;
        let restartCount = 0;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
          lastTranscript = fullTranscript.trim();
          const matched = matchSpokenWords(fullTranscript);
          setHighlightedWords(matched);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => finishRecording(lastTranscript), 1200);
        };
        recognition.onspeechend = () => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => finishRecording(lastTranscript), 800);
        };
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === "no-speech") return;
          if (event.error === "not-allowed" || event.error === "audio-capture" || event.error === "service-not-allowed") {
            fatalError = true;
          }
        };
        recognition.onend = () => {
          // Restart if recognition stopped unexpectedly (not via finishRecording)
          if (!fatalError && recognitionRef.current === recognition && restartCount < 3) {
            restartCount++;
            try { recognition.start(); } catch { fatalError = true; }
          }
        };
        recognition.start();
      } else {
        setTimeout(() => finishRecording(""), 5000);
      }
    };

    const finishRecording = async (spokenText: string) => {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      // Sync highlighted words from SpeechRecognition before scoring starts
      if (spokenText) setHighlightedWords(matchSpokenWords(spokenText));
      setScoring(true);
      const blob = await stopRecording();
      try {
        const result = await transcribe(blob);
        const spoken = (result.text || spokenText || "").toLowerCase().replace(/[.,!?—]/g, "");
        const spokenW = spoken.split(/\s+/).filter(Boolean);
        // Update highlighted words with ElevenLabs result (more accurate than browser STT)
        if (result.text) setHighlightedWords(matchSpokenWords(result.text));
        const results = sentenceWords.map((w) => {
          const clean = w.toLowerCase().replace(/[.,!?—]/g, "");
          return spokenW.includes(clean) ? "correct" as const : "wrong" as const;
        });
        setWordResults(results);
        const score = Math.round((results.filter(r => r === "correct").length / results.length) * 100);
        setScores(prev => [...prev, score]);
      } catch {
        if (spokenText) {
          const matched = matchSpokenWords(spokenText);
          setHighlightedWords(matched);
          setWordResults(sentenceWords.map((_, i) => matched.has(i) ? "correct" as const : "wrong" as const));
        } else {
          setWordResults(sentenceWords.map(() => "correct"));
        }
        setScores(prev => [...prev, 100]);
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

  // Save progress when complete
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

  // Save bookmarked phrases to user_vocab
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

  const toggleBookmark = async () => {
    const isCurrentlyBookmarked = bookmarked.has(sentenceIndex);
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(sentenceIndex)) next.delete(sentenceIndex);
      else next.add(sentenceIndex);
      return next;
    });

    // Immediately save/remove from user_vocab
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
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showTabs={false}>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Top bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowExitConfirm(true)} className="p-1">
              <X size={20} className="text-muted-foreground" />
            </button>
            <div className="flex-1 flex gap-1">
              {Array.from({ length: TOTAL_SENTENCES }).map((_, i) => {
                const stepOrder: Record<Step, number> = { intro: 0, listen: 1, record: 2, feedback: 4, complete: 4 };
                const subSteps = 4;
                let fillPercent = 0;
                if (i < sentenceIndex) fillPercent = 100;
                else if (i === sentenceIndex) fillPercent = Math.min((stepOrder[step] / subSteps) * 100, 100);
                return (
                  <div key={i} className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${fillPercent}%`, backgroundColor: fillPercent > 0 ? "hsl(var(--primary))" : "transparent" }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* INTRO */}
        {step === "intro" && currentSentence && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
            <div className="bg-card rounded-3xl p-8 w-full flex flex-col items-center justify-center min-h-[60vh]">
              <h1 className="text-2xl font-bold text-foreground text-center mb-3">
                {scene?.title ?? ""}
              </h1>
              <p className="text-base text-muted-foreground text-center leading-relaxed">
                {currentSentence.translation}
              </p>
            </div>
            <button onClick={handleIntroContinue} className="mt-8 text-sm text-muted-foreground">点击继续</button>
          </div>
        )}

        {/* LISTEN */}
        {step === "listen" && (
          <div className="flex-1 flex flex-col px-4 animate-fade-in">
            <div className="flex-1 flex flex-col">
              <div className="bg-card rounded-3xl p-6 mt-4 flex-1 flex flex-col">
                <div className="relative flex items-center justify-center">
                  {!isPlaying && !ttsLoading && <div className="bg-muted text-muted-foreground text-sm font-semibold px-4 py-1.5 rounded-lg">已暂停</div>}
                  <button onClick={toggleBookmark} className="absolute right-0">
                    {isBookmarked ? <BookmarkCheck size={20} className="text-primary" /> : <Bookmark size={20} className="text-muted-foreground" />}
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <p className="text-3xl font-medium text-center leading-relaxed text-muted-foreground/50">{sentenceText}</p>
                </div>
                <p className="text-base text-muted-foreground text-center mb-6">{currentSentence?.translation}</p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button onClick={() => { stopPlayback(); setListenDone(false); listenStarted.current = false; replayTTS(); }} className="w-11 h-11 rounded-full bg-muted/20 flex items-center justify-center">
                    <RotateCcw size={18} className="text-primary" />
                  </button>
                  <button onClick={() => { if (isPlaying) { stopPlayback(); } else { replayTTS(); } }} className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                    {ttsLoading && !isPlaying ? <Loader2 size={28} className="text-primary animate-spin" /> : isPlaying ? <Pause size={28} className="text-primary" /> : <Play size={28} className="text-primary ml-0.5" />}
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => setStep("record")} className="mt-4 mb-8 text-sm text-muted-foreground text-center">点击继续</button>
          </div>
        )}

        {/* RECORD */}
        {step === "record" && (
          <div className="flex-1 flex flex-col px-4 animate-fade-in">
            <div className="flex-1 flex flex-col">
              <div className="bg-card rounded-3xl p-6 mt-4 flex-1 flex flex-col">
                <div className="relative flex items-center justify-center">
                  {scoring ? (
                    <div className="bg-muted text-muted-foreground text-sm font-semibold px-4 py-1.5 rounded-lg">评分中...</div>
                  ) : recordingPaused ? (
                    <div className="bg-muted text-muted-foreground text-sm font-semibold px-4 py-1.5 rounded-lg">已暂停</div>
                  ) : (
                    <div className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-lg animate-pulse">现在请说...</div>
                  )}
                  <button onClick={toggleBookmark} className="absolute right-0">
                    {isBookmarked ? <BookmarkCheck size={20} className="text-primary" /> : <Bookmark size={20} className="text-muted-foreground" />}
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <p className="text-3xl font-medium text-center leading-relaxed">
                    {sentenceWords.map((word, i) => (
                      <span key={i} className={`transition-colors duration-300 ${highlightedWords.has(i) ? "text-primary" : "text-muted-foreground/50"}`}>{word} </span>
                    ))}
                  </p>
                </div>
                <p className="text-base text-muted-foreground text-center mb-6">{currentSentence?.translation}</p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button disabled={scoring} onClick={() => { stopPlayback(); setScoring(false); handleRetry(); }} className="w-11 h-11 rounded-full bg-muted/20 flex items-center justify-center disabled:opacity-30">
                    <RotateCcw size={18} className="text-primary" />
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
                    className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center disabled:opacity-30"
                  >
                    {recordingPaused ? <Play size={28} className="text-primary ml-0.5" /> : <Pause size={28} className="text-primary" />}
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-4 mb-8 text-sm text-muted-foreground text-center">说完后自动进入下一步</p>
          </div>
        )}

        {/* FEEDBACK */}
        {step === "feedback" && feedbackReady && (
          <div className="flex-1 flex flex-col px-4 animate-fade-in">
            <div className="flex-1 flex flex-col">
              <div className="bg-card rounded-3xl p-6 mt-4 flex-1 flex flex-col">
                <div className="relative flex items-center justify-center">
                  {isPlaying ? (
                    <div className="bg-muted text-muted-foreground text-sm font-semibold px-4 py-1.5 rounded-lg">播放中...</div>
                  ) : allCorrect ? (
                    <div className="bg-success text-success-foreground w-12 h-12 rounded-2xl flex items-center justify-center"><Check size={28} strokeWidth={3} /></div>
                  ) : (
                    <div className="bg-warning text-warning-foreground w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold">!</div>
                  )}
                  <button onClick={toggleBookmark} className="absolute right-0">
                    {isBookmarked ? <BookmarkCheck size={20} className="text-primary" /> : <Bookmark size={20} className="text-muted-foreground" />}
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <p className="text-3xl font-medium text-center leading-relaxed">
                    {sentenceWords.map((word, i) => (
                      <span key={i} onClick={() => setSelectedWord(word)} className={`cursor-pointer active:opacity-70 ${
                        wordResults[i] === "correct" ? "text-success" : wordResults[i] === "wrong" ? "text-destructive underline decoration-2 underline-offset-4" : "text-muted-foreground/50"
                      }`}>{word} </span>
                    ))}
                  </p>
                </div>
                <p className="text-base text-muted-foreground text-center mb-4">{currentSentence?.translation}</p>
                <div className="flex items-center justify-center gap-6 mb-4">
                  <button onClick={replayTTS} disabled={isPlaying} className="flex items-center gap-1.5 text-sm text-primary font-medium disabled:opacity-50">
                    {playingType === "tts" ? <Pause size={16} /> : <Volume2 size={16} />} 例子
                  </button>
                  <button onClick={handlePlayRecording} disabled={isPlaying} className="flex items-center gap-1.5 text-sm text-primary font-medium disabled:opacity-50">
                    {playingType === "recording" ? <Pause size={16} /> : <Play size={16} />} 您
                  </button>
                </div>
                <div className="flex items-center justify-center mb-2">
                  <button onClick={handleRetry} className="flex items-center gap-2 bg-muted/20 text-muted-foreground px-6 py-3 rounded-full text-sm font-medium">
                    <RotateCcw size={16} /> 重新开始
                  </button>
                </div>
              </div>
            </div>
            <button onClick={handleNextSentence} className="mt-4 mb-8 text-sm text-muted-foreground text-center">点击继续</button>
          </div>
        )}

        {/* COMPLETE */}
        {step === "complete" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
            <div className="bg-card rounded-3xl p-8 w-full flex flex-col items-center justify-center min-h-[50vh]">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
                <PartyPopper size={40} className="text-success" />
              </div>
              <h1 className="text-2xl font-bold text-foreground text-center mb-2">🎉 太棒了！</h1>
              <p className="text-lg text-muted-foreground text-center mb-2">你已完成本课全部练习</p>
              <p className="text-sm text-muted-foreground text-center">
                共练习了 {TOTAL_SENTENCES} 个句子 · 平均分 {scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0}
              </p>
            </div>
            <div className="w-full flex flex-col gap-3 mt-8">
              <button onClick={() => navigate("/")} className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2">
                <Home size={18} /> 返回首页
              </button>
              <button onClick={() => navigate("/map")} className="w-full bg-muted text-foreground font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2">
                <ArrowRight size={18} /> 查看地图
              </button>
            </div>
          </div>
        )}
      </div>
      <WordDetailSheet word={selectedWord} onClose={() => setSelectedWord(null)} />
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-[300px]">
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出</AlertDialogTitle>
            <AlertDialogDescription>
              当前练习进度将不会保存，确定要退出吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续练习</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate("/map", { replace: true });
              }
            }}>确认退出</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default PracticeFlow;
