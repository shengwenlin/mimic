import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Volume2, Mic, BookmarkCheck, Bookmark } from "lucide-react";
import { useAudio } from "@/hooks/use-audio";
import PracticeSheet from "@/components/PracticeSheet";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const ReviewScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [practiceText, setPracticeText] = useState<string | null>(null);
  const { playTTS } = useAudio();

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

  const handleListen = useCallback(async (id: string, text: string) => {
    if (playingId) return;
    setPlayingId(id);
    try { await playTTS(text); } finally { setPlayingId(null); }
  }, [playingId, playTTS]);

  const handleUnsave = async (vocabId: string, en: string) => {
    if (!user) return;
    await supabase.from("user_vocab").delete().eq("id", vocabId);
    queryClient.invalidateQueries({ queryKey: ["user_vocab", user.id] });
    toast("Removed from saved", {
      description: en.length > 30 ? en.slice(0, 30) + "..." : en,
    });
  };

  const cards = vocabItems?.map(v => ({
    id: v.id,
    en: (v.phrases as any)?.sentences?.text ?? (v.phrases as any)?.english ?? "",
    zh: (v.phrases as any)?.sentences?.translation ?? (v.phrases as any)?.chinese ?? "",
    tip: (v.phrases as any)?.usage_tip ?? "",
  })) ?? [];

  return (
    <AppLayout>
      <div className="px-6 pt-6 pb-4" style={{ minHeight: "calc(100vh - 64px)" }}>
        <h1 className="text-xl font-bold font-serif text-foreground mb-1">Saved</h1>
        <p className="text-[12px] text-muted-foreground mb-6">
          {cards.length} sentence{cards.length !== 1 ? "s" : ""}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <Bookmark size={28} className="text-muted-foreground opacity-30 mb-1" strokeWidth={1.5} />
            <p className="text-base font-semibold font-serif text-foreground">No saved sentences yet</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Bookmark sentences during practice to build your own phrase bank.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {cards.map((card) => {
              const isThisPlaying = playingId === card.id;
              return (
                <div key={card.id} className="rounded-2xl bg-card p-4 shadow-xs">
                  <p className="text-[13px] font-medium text-foreground mb-3 leading-relaxed">
                    {card.en}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleListen(card.id, card.en)}
                        disabled={!!playingId}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
                          isThisPlaying ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
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
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-primary text-primary-foreground disabled:opacity-50 shadow-xs"
                    >
                      <Mic size={12} className="text-primary-foreground" />
                      Practice
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PracticeSheet
        open={!!practiceText}
        onOpenChange={(open) => { if (!open) setPracticeText(null); }}
        sentence={practiceText || ""}
      />
    </AppLayout>
  );
};

export default ReviewScreen;
