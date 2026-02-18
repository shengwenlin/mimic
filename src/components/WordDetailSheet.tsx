import { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, Mic, Check, X, Loader2 } from "lucide-react";
import { useAudio } from "@/hooks/use-audio";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface WordDetailSheetProps {
  word: string | null;
  onClose: () => void;
}

type RecordState = "idle" | "recording" | "checking" | "correct" | "wrong";

const WordDetailSheet = ({ word, onClose }: WordDetailSheetProps) => {
  const { playTTS, isPlaying, startRecording, stopRecording, transcribe, stopPlayback } = useAudio();

  const [translation, setTranslation] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [loading, setLoading] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [spokenPhonetic, setSpokenPhonetic] = useState("");
  const [tip, setTip] = useState("");
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const cleanWord = word?.replace(/[.,!?;:]/g, "") || "";

  // Fetch word details & auto-play
  useEffect(() => {
    if (!cleanWord) return;
    setRecordState("idle");
    setSpokenPhonetic("");
    setTip("");
    setLoading(true);

    // Fetch translation
    fetch(`${SUPABASE_URL}/functions/v1/word-detail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ word: cleanWord })
    }).
    then((r) => r.json()).
    then((data) => {
      setTranslation(data.translation || "—");
      setPhonetic(data.phonetic || cleanWord.toLowerCase());
    }).
    catch(() => {
      setTranslation("—");
      setPhonetic(cleanWord.toLowerCase());
    }).
    finally(() => setLoading(false));

    // Auto-play pronunciation
    playTTS(cleanWord).catch(() => {});
  }, [cleanWord]);

  const handlePlayWord = useCallback(() => {
    if (isPlaying) return;
    playTTS(cleanWord).catch(() => {});
  }, [cleanWord, isPlaying, playTTS]);

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

    // Use Web Speech API for real-time detection
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

      recognition.onspeechend = () => {

        // Will trigger onresult or onerror
      };
      recognition.onerror = async () => {
        await finishWordRecording("");
      };

      recognition.onend = () => {
        recognitionRef.current = null;
      };

      recognition.start();
    } else {
      // Fallback: record for 2 seconds
      setTimeout(async () => {
        await finishWordRecording("");
      }, 2000);
    }

    // Safety timeout
    silenceTimer.current = setTimeout(async () => {
      if (recognitionRef.current) {
        try {recognitionRef.current.stop();} catch {}
      }
    }, 5000);
  }, [recordState, startRecording, cleanWord]);

  const finishWordRecording = useCallback(async (browserText: string) => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }

    setRecordState("checking");

    const blob = await stopRecording();

    // Use ElevenLabs STT for accuracy
    let spokenText = browserText;
    try {
      const result = await transcribe(blob);
      if (result.text) spokenText = result.text;
    } catch {}

    const spokenClean = spokenText.toLowerCase().replace(/[.,!?;:]/g, "").trim();
    const targetClean = cleanWord.toLowerCase().trim();

    const isCorrect = spokenClean === targetClean ||
    spokenClean.includes(targetClean) ||
    targetClean.includes(spokenClean);

    if (isCorrect && spokenClean.length > 0) {
      setRecordState("correct");
      setSpokenPhonetic(spokenClean);
    } else {
      setRecordState("wrong");
      setSpokenPhonetic(spokenClean || "(not detected)");
      if (spokenClean && spokenClean !== targetClean) {
        setTip(`Try saying "${targetClean}" instead of "${spokenClean}".`);
      } else {
        setTip("No speech detected. Please try again.");
      }
    }
  }, [stopRecording, transcribe, cleanWord]);

  if (!word) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] rounded-t-3xl z-50 p-6 pb-8 animate-slide-up bg-card">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground capitalize">{cleanWord}</h2>
          <button onClick={onClose} className="p-1">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {loading ?
        <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div> :

        <>
            {/* Translation */}
            <p className="text-xs text-muted-foreground mb-1">Translation</p>
            <p className="text-xl font-semibold text-foreground mb-4">{translation}</p>

            {/* Phonetic */}
            <p className="text-xs text-muted-foreground mb-1">Pronunciation</p>
            <p className="text-lg font-semibold text-foreground mb-4">{phonetic}</p>

            {/* Spoken result */}
            {recordState === "correct" &&
          <div className="flex items-center gap-3 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">You said</p>
                  <p className="text-lg font-semibold text-success">{spokenPhonetic}</p>
                </div>
                <Check size={32} className="text-success ml-auto" strokeWidth={3} />
              </div>
          }

            {recordState === "wrong" &&
          <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-0.5">You said</p>
                <p className="text-lg font-semibold text-destructive mb-2">{spokenPhonetic}</p>
                {tip &&
            <div className="rounded-xl p-3 bg-secondary-foreground">
                    <p className="text-sm text-foreground">{tip}</p>
                  </div>
            }
              </div>
          }

            {recordState === "checking" &&
          <div className="flex items-center gap-2 mb-4 py-2">
                <Loader2 size={18} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analyzing pronunciation...</p>
              </div>
          }

            {/* Action buttons */}
            <div className="flex items-center justify-center mt-4">
              {recordState === "recording" ? (
                <div className="flex items-center gap-[4px] h-10">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full bg-primary"
                      style={{
                        animation: `waveform 0.8s ease-in-out ${i * 0.12}s infinite`,
                        height: '8px',
                      }}
                    />
                  ))}
                </div>
              ) : recordState === "checking" ? null : (
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={handlePlayWord}
                    disabled={isPlaying}
                    className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 bg-primary-foreground"
                  >
                    {isPlaying ? (
                      <Loader2 size={20} className="animate-spin text-primary" />
                    ) : (
                      <Volume2 size={20} className="text-accent-foreground" />
                    )}
                  </button>

                  <button
                    onClick={handleMicPress}
                    className="w-14 h-14 rounded-full flex items-center justify-center bg-primary disabled:opacity-70"
                  >
                    <Mic size={24} className="text-primary-foreground" />
                  </button>
                </div>
              )}
            </div>
          </>
        }
      </div>
    </>);

};

export default WordDetailSheet;