import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Volume2, Mic, BookmarkCheck, Loader2 } from "lucide-react";
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

  // Fetch user_vocab joined with phrases
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
    toast("已取消收藏", {
      description: en.length > 30 ? en.slice(0, 30) + "…" : en,
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
      <div className="px-4 pt-6 pb-4" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div className="flex items-center gap-2 mb-1">
          <BookmarkCheck size={18} className="text-primary" />
          <h1 className="text-lg font-bold text-foreground">已收藏句子</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          共 {cards.length} 个句子
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookmarkCheck size={40} className="mb-3 opacity-30" />
            <p className="text-sm">还没有收藏的句子</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((card) => {
              const isThisPlaying = playingId === card.id;
              return (
                <div key={card.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-base font-semibold text-foreground mb-3 leading-snug">
                    {card.en}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleListen(card.id, card.en)}
                        disabled={!!playingId}
                        className={`p-2 rounded-full border transition-colors disabled:opacity-50 ${
                          isThisPlaying ? "border-primary text-primary" : "border-border text-muted-foreground"
                        }`}
                        aria-label="听一遍"
                      >
                        {isThisPlaying ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                      </button>
                      <button
                        onClick={() => handleUnsave(card.id, card.en)}
                        className="p-2 rounded-full border border-border text-primary transition-colors"
                        aria-label="取消收藏"
                      >
                        <BookmarkCheck size={16} fill="currentColor" />
                      </button>
                    </div>
                    <button
                      onClick={() => setPracticeText(card.en)}
                      disabled={!!playingId}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      <Mic size={14} />
                      跟读
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
