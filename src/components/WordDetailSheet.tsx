import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Volume2, Mic, Check, X, Loader2, Bookmark, BookmarkCheck } from "lucide-react";
import { useAudio } from "@/hooks/use-audio";
import { getSavedWords, saveWord, removeSavedWord } from "@/lib/word-vocab";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const CARD_WIDTH = 288;
const MARGIN = 12;

interface WordDetailSheetProps {
  word: string | null;
  anchorRect: DOMRect | null;
  onClose: () => void;
}

type RecordState = "idle" | "recording" | "checking" | "correct" | "wrong";

const WordDetailSheet = ({ word, anchorRect, onClose }: WordDetailSheetProps) => {
  const { playTTS, isPlaying, startRecording, stopRecording, transcribe } = useAudio();

  const [translation, setTranslation] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [loading, setLoading] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [spokenPhonetic, setSpokenPhonetic] = useState("");
  const [tip, setTip] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const cleanWord = word?.replace(/[.,!?;:]/g, "") || "";

  // Check saved state
  useEffect(() => {
    if (!cleanWord) return;
    setIsSaved(getSavedWords().some((w) => w.word === cleanWord));
  }, [cleanWord]);

  // Fetch word details & auto-play
  useEffect(() => {
    if (!cleanWord) return;
    setRecordState("idle");
    setSpokenPhonetic("");
    setTip("");
    setLoading(true);

    fetch(`${SUPABASE_URL}/functions/v1/word-detail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ word: cleanWord }),
    })
      .then((r) => r.json())
      .then((data) => {
        setTranslation(data.translation || "—");
        setPhonetic(data.phonetic || cleanWord.toLowerCase());
      })
      .catch(() => {
        setTranslation("—");
        setPhonetic(cleanWord.toLowerCase());
      })
      .finally(() => setLoading(false));

    playTTS(cleanWord).catch(() => {});
  }, [cleanWord]);

  const handlePlayWord = useCallback(() => {
    if (isPlaying) return;
    playTTS(cleanWord).catch(() => {});
  }, [cleanWord, isPlaying, playTTS]);

  const handleSaveToggle = useCallback(() => {
    if (isSaved) {
      removeSavedWord(cleanWord);
      setIsSaved(false);
    } else {
      saveWord({ word: cleanWord, translation, phonetic, savedAt: new Date().toISOString() });
      setIsSaved(true);
    }
  }, [isSaved, cleanWord, translation, phonetic]);

  const finishWordRecording = useCallback(
    async (browserText: string) => {
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
        silenceTimer.current = null;
      }
      setRecordState("checking");
      const blob = await stopRecording();
      let spokenText = browserText;
      try {
        const result = await transcribe(blob);
        if (result.text) spokenText = result.text;
      } catch {}
      const spokenClean = spokenText.toLowerCase().replace(/[.,!?;:]/g, "").trim();
      const targetClean = cleanWord.toLowerCase().trim();
      const isCorrect =
        spokenClean === targetClean ||
        spokenClean.includes(targetClean) ||
        targetClean.includes(spokenClean);

      if (isCorrect && spokenClean.length > 0) {
        setRecordState("correct");
        setSpokenPhonetic(spokenClean);
      } else {
        setRecordState("wrong");
        setSpokenPhonetic(spokenClean || "(not detected)");
        setTip(
          spokenClean && spokenClean !== targetClean
            ? `Try saying "${targetClean}" instead of "${spokenClean}".`
            : "No speech detected. Please try again."
        );
      }
    },
    [stopRecording, transcribe, cleanWord]
  );

  const handleMicPress = useCallback(async () => {
    if (recordState === "recording") return;
    setRecordState("recording");
    setSpokenPhonetic("");
    setTip("");

    try {
      await startRecording();
    } catch {
      setRecordState("idle");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        const spoken = event.results[0]?.[0]?.transcript || "";
        await finishWordRecording(spoken);
      };
      recognition.onerror = async () => {
        await finishWordRecording("");
      };
      recognition.onend = () => {
        recognitionRef.current = null;
      };
      recognition.start();
    } else {
      setTimeout(async () => {
        await finishWordRecording("");
      }, 2000);
    }

    silenceTimer.current = setTimeout(async () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }, 5000);
  }, [recordState, startRecording, finishWordRecording]);

  // Compute popover position relative to anchor
  const pos = useMemo(() => {
    if (!anchorRect) return null;
    const left = Math.max(
      MARGIN,
      Math.min(
        window.innerWidth - CARD_WIDTH - MARGIN,
        anchorRect.left + anchorRect.width / 2 - CARD_WIDTH / 2
      )
    );
    const arrowLeft = Math.max(
      16,
      Math.min(CARD_WIDTH - 24, anchorRect.left + anchorRect.width / 2 - left)
    );
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const showBelow = spaceBelow >= 300;
    return {
      left,
      arrowLeft,
      showBelow,
      top: showBelow ? anchorRect.bottom + 10 : undefined,
      bottom: showBelow ? undefined : window.innerHeight - anchorRect.top + 10,
    };
  }, [anchorRect]);

  if (!word || !anchorRect) return null;

  return (
    <>
      {/* Transparent click-catcher backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} />

      {/* Floating popover card */}
      <div
        className="fixed z-[51] bg-card rounded-2xl shadow-lg border border-border animate-fade-in"
        style={{ width: CARD_WIDTH, left: pos?.left, top: pos?.top, bottom: pos?.bottom }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow indicator */}
        {pos?.showBelow ? (
          <div
            className="absolute w-3 h-3 bg-card rotate-45 border-l border-t border-border"
            style={{ left: (pos?.arrowLeft ?? 8) - 6, top: -7 }}
          />
        ) : (
          <div
            className="absolute w-3 h-3 bg-card rotate-45 border-r border-b border-border"
            style={{ left: (pos?.arrowLeft ?? 8) - 6, bottom: -7 }}
          />
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground capitalize">{cleanWord}</h2>
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleSaveToggle}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title={isSaved ? "Remove from words" : "Save to vocabulary"}
              >
                {isSaved ? (
                  <BookmarkCheck size={17} className="text-primary" />
                ) : (
                  <Bookmark size={17} className="text-muted-foreground" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={17} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="animate-spin text-primary" size={22} />
            </div>
          ) : (
            <>
              {/* Translation */}
              <p className="text-xs text-muted-foreground mb-0.5">Translation</p>
              <p className="text-base font-medium text-foreground mb-3">{translation}</p>

              {/* Phonetic */}
              <p className="text-xs text-muted-foreground mb-0.5">Pronunciation</p>
              <p className="text-base text-foreground mb-4">{phonetic}</p>

              {/* Recording feedback */}
              {recordState === "correct" && (
                <div className="flex items-center gap-2 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">You said</p>
                    <p className="text-base font-medium text-success">{spokenPhonetic}</p>
                  </div>
                  <Check size={24} strokeWidth={3} className="text-success ml-auto" />
                </div>
              )}

              {recordState === "wrong" && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-0.5">You said</p>
                  <p className="text-base font-medium text-destructive mb-2">{spokenPhonetic}</p>
                  {tip && (
                    <div className="rounded-xl p-2.5 bg-muted">
                      <p className="text-xs text-foreground">{tip}</p>
                    </div>
                  )}
                </div>
              )}

              {recordState === "checking" && (
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Analyzing...</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between mt-1">
                {recordState === "recording" ? (
                  <div className="flex items-center gap-[3px] h-8 mx-auto">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-primary"
                        style={{
                          animation: `waveform 0.8s ease-in-out ${i * 0.12}s infinite`,
                          height: "8px",
                        }}
                      />
                    ))}
                  </div>
                ) : recordState === "checking" ? null : (
                  <>
                    <button
                      onClick={handlePlayWord}
                      disabled={isPlaying}
                      className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 bg-muted"
                    >
                      {isPlaying ? (
                        <Loader2 size={18} className="animate-spin text-primary" />
                      ) : (
                        <Volume2 size={18} className="text-foreground" />
                      )}
                    </button>
                    <button
                      onClick={handleMicPress}
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-primary"
                    >
                      <Mic size={20} className="text-primary-foreground" />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default WordDetailSheet;
