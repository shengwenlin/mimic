import { useState, useCallback, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Volume2, Mic, BookmarkCheck, Bookmark } from "lucide-react";
import { useAudio } from "@/hooks/use-audio";
import PracticeSheet from "@/components/PracticeSheet";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSavedWords, saveWord, removeSavedWord, type SavedWordEntry } from "@/lib/word-vocab";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Tab = "sentences" | "words";

const ReviewScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [practiceText, setPracticeText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("sentences");
  const [savedWords, setSavedWords] = useState<SavedWordEntry[]>(() => getSavedWords());
  const { playTTS } = useAudio();
  const refreshedRef = useRef(false);

  // Listen for word save/remove events from the popover
  useEffect(() => {
    const handleChange = () => setSavedWords(getSavedWords());
    window.addEventListener("mimic_words_changed", handleChange);
    return () => window.removeEventListener("mimic_words_changed", handleChange);
  }, []);

  // Auto-refresh stale words (translation === "—") once on mount
  useEffect(() => {
    if (refreshedRef.current) return;
    refreshedRef.current = true;
    const stale = getSavedWords().filter((w) => !w.translation || w.translation === "—");
    if (stale.length === 0) return;
    stale.forEach(async (entry) => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/word-detail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ word: entry.word }),
        });
        const data = await resp.json();
        if (data.translation && data.translation !== "—") {
          saveWord({ ...entry, translation: data.translation, phonetic: data.phonetic });
        }
      } catch {}
    });
  }, []);

  const { data: vocabItems, isLoading } = useQuery({
    queryKey: ["user_vocab", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_vocab")
        .select("*, phrases(*, sentences(text, translation))")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleListen = useCallback(
    async (id: string, text: string) => {
      if (playingId) return;
      setPlayingId(id);
      try {
        await playTTS(text);
      } finally {
        setPlayingId(null);
      }
    },
    [playingId, playTTS]
  );

  const handleUnsave = async (vocabId: string, en: string) => {
    if (!user) return;
    await supabase.from("user_vocab").delete().eq("id", vocabId);
    queryClient.invalidateQueries({ queryKey: ["user_vocab", user.id] });
    toast("Removed from saved", {
      description: en.length > 30 ? en.slice(0, 30) + "..." : en,
    });
  };

  const handleRemoveWord = (word: string) => {
    removeSavedWord(word);
    toast("Removed from words", { description: word });
  };

  const cards =
    vocabItems?.map((v) => ({
      id: v.id,
      en: (v.phrases as any)?.sentences?.text ?? (v.phrases as any)?.english ?? "",
      zh: (v.phrases as any)?.sentences?.translation ?? (v.phrases as any)?.chinese ?? "",
      tip: (v.phrases as any)?.usage_tip ?? "",
    })) ?? [];

  const sentenceCount = cards.length;
  const wordCount = savedWords.length;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-10 py-12">
        <h1 className="text-3xl font-bold font-serif text-foreground tracking-tight mb-6">Saved</h1>

        {/* Filter tabs */}
        <div className="flex gap-6 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab("sentences")}
            className={`text-sm font-medium pb-2.5 border-b-2 -mb-px transition-colors ${
              activeTab === "sentences"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Sentences
            <span className="ml-1.5 text-xs opacity-60">{sentenceCount}</span>
          </button>
          <button
            onClick={() => setActiveTab("words")}
            className={`text-sm font-medium pb-2.5 border-b-2 -mb-px transition-colors ${
              activeTab === "words"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Words
            <span className="ml-1.5 text-xs opacity-60">{wordCount}</span>
          </button>
        </div>

        {/* Sentences tab */}
        {activeTab === "sentences" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                <Bookmark size={32} className="text-muted-foreground opacity-30 mb-1" strokeWidth={1.5} />
                <p className="text-xl font-semibold font-serif text-foreground">No saved sentences yet</p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  Bookmark sentences during practice to build your own phrase bank.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {cards.map((card) => {
                  const isThisPlaying = playingId === card.id;
                  return (
                    <div key={card.id} className="rounded-2xl bg-card p-5 shadow-xs flex flex-col">
                      <p className="text-sm font-medium text-foreground mb-1 leading-relaxed">
                        {card.en}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{card.zh}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleListen(card.id, card.en)}
                            disabled={!!playingId}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
                              isThisPlaying
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isThisPlaying ? (
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Volume2 size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleUnsave(card.id, card.en)}
                            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary"
                          >
                            <BookmarkCheck size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => setPracticeText(card.en)}
                          disabled={!!playingId}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 shadow-xs"
                        >
                          <Mic size={13} className="text-primary-foreground" />
                          Practice
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Words tab */}
        {activeTab === "words" && (
          <>
            {savedWords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                <Bookmark size={32} className="text-muted-foreground opacity-30 mb-1" strokeWidth={1.5} />
                <p className="text-xl font-semibold font-serif text-foreground">No saved words yet</p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  Tap any word during practice to look it up and save it to your vocabulary.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {savedWords.map((w) => {
                  const isThisPlaying = playingId === w.word;
                  return (
                    <div key={w.word} className="rounded-2xl bg-card p-4 shadow-xs flex flex-col">
                      <p className="text-base font-bold text-foreground capitalize">{w.word}</p>
                      {w.translation && w.translation !== "—" && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{w.translation}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-3">
                        <button
                          onClick={() => handleListen(w.word, w.word)}
                          disabled={!!playingId}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
                            isThisPlaying
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isThisPlaying ? (
                            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Volume2 size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveWord(w.word)}
                          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary"
                        >
                          <BookmarkCheck size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <PracticeSheet
        open={!!practiceText}
        onOpenChange={(open) => {
          if (!open) setPracticeText(null);
        }}
        sentence={practiceText || ""}
      />
    </AppLayout>
  );
};

export default ReviewScreen;
