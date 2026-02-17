import { useEffect, useState } from "react";
import { Flame, BookOpen, Target, TrendingUp, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, subDays, isSameDay } from "date-fns";

interface WeeklyStats {
  sessions: number;
  minutes: number;
  phrases: number;
}

const ProgressScreen = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState<WeeklyStats>({ sessions: 0, minutes: 0, phrases: 0 });
  const [streakDays, setStreakDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);

      // Get all completed scene_progress for this user
      const { data: progress } = await supabase
        .from("scene_progress")
        .select("completed_at, avg_score, scene_id")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      // Get user_vocab count for phrases learned
      const { count: phraseCount } = await supabase
        .from("user_vocab")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const completedDates = (progress ?? []).map(p => format(new Date(p.completed_at!), "yyyy-MM-dd"));
      const uniqueDates = new Set(completedDates);
      setStreakDays(uniqueDates);

      // Calculate streak (consecutive days ending today or yesterday)
      let currentStreak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const day = format(subDays(today, i), "yyyy-MM-dd");
        if (uniqueDates.has(day)) {
          currentStreak++;
        } else if (i === 0) {
          // today not practiced yet, that's ok, continue checking
          continue;
        } else {
          break;
        }
      }
      setStreak(currentStreak);

      // This week stats
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const thisWeekProgress = (progress ?? []).filter(p => {
        const d = new Date(p.completed_at!);
        return d >= weekStart && d <= weekEnd;
      });

      // Sessions = unique days with practice this week
      const thisWeekDays = new Set(thisWeekProgress.map(p => format(new Date(p.completed_at!), "yyyy-MM-dd")));

      // Get scenes for duration estimation
      const sceneIds = [...new Set(thisWeekProgress.map(p => p.scene_id))];
      let totalMinutes = 0;
      if (sceneIds.length > 0) {
        const { data: scenes } = await supabase
          .from("scenes")
          .select("id, duration_minutes")
          .in("id", sceneIds);
        const durationMap = new Map((scenes ?? []).map(s => [s.id, s.duration_minutes]));
        totalMinutes = thisWeekProgress.reduce((sum, p) => sum + (durationMap.get(p.scene_id) ?? 5), 0);
      }

      setStats({
        sessions: thisWeekDays.size,
        minutes: totalMinutes,
        phrases: phraseCount ?? 0,
      });

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Build this week's day indicators
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyStatCards = [
    { label: "Sessions", value: stats.sessions, icon: Target },
    { label: "Minutes", value: stats.minutes, icon: TrendingUp },
    { label: "Phrases", value: stats.phrases, icon: BookOpen },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">Progress</h1>

        {/* Streak */}
        <div className="flex items-center gap-2.5 mb-2">
          <Flame size={28} className="text-warning" />
          <span className="text-2xl font-bold text-foreground">{streak} day streak</span>
        </div>

        {/* Week day indicators */}
        <div className="flex gap-2 mb-8 ml-1">
          {weekDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const practiced = streakDays.has(dayStr);
            const isToday = isSameDay(day, now);
            return (
              <div key={dayStr} className="flex flex-col items-center gap-1.5">
                <span className={`text-[11px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, "EEE").charAt(0)}
                </span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    practiced
                      ? "bg-primary"
                      : isToday
                      ? "border-2 border-primary bg-background"
                      : "bg-muted/40"
                  }`}
                >
                  {practiced && <Flame size={14} className="text-primary-foreground" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* This Week Stats */}
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          This Week
        </h2>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {weeklyStatCards.map((stat) => (
            <div key={stat.label} className="border border-border rounded-2xl p-4 text-center">
              <stat.icon size={18} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Motivational message */}
        {streak > 0 ? (
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <p className="text-base font-medium text-foreground mb-1">
              {streak >= 7 ? "🔥 Amazing consistency!" : streak >= 3 ? "💪 Keep it up!" : "🌱 Great start!"}
            </p>
            <p className="text-sm text-muted-foreground">
              {streak >= 7
                ? "You've been practicing every day. Your English is improving fast!"
                : streak >= 3
                ? `${streak} days in a row! You're building a great habit.`
                : "Every journey starts with a single step. Come back tomorrow!"}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <p className="text-base font-medium text-foreground mb-1">🎯 Start your streak</p>
            <p className="text-sm text-muted-foreground">
              Complete a practice session today to begin your streak!
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProgressScreen;
