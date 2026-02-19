import { useEffect, useState } from "react";
import { Flame, BookOpen, Target, TrendingUp } from "lucide-react";
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

      const { data: progress } = await supabase
        .from("scene_progress")
        .select("completed_at, avg_score, scene_id")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      const { count: phraseCount } = await supabase
        .from("user_vocab")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const completedDates = (progress ?? []).map(p => format(new Date(p.completed_at!), "yyyy-MM-dd"));
      const uniqueDates = new Set(completedDates);
      setStreakDays(uniqueDates);

      let currentStreak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const day = format(subDays(today, i), "yyyy-MM-dd");
        if (uniqueDates.has(day)) {
          currentStreak++;
        } else if (i === 0) {
          continue;
        } else {
          break;
        }
      }
      setStreak(currentStreak);

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const thisWeekProgress = (progress ?? []).filter(p => {
        const d = new Date(p.completed_at!);
        return d >= weekStart && d <= weekEnd;
      });

      const thisWeekDays = new Set(thisWeekProgress.map(p => format(new Date(p.completed_at!), "yyyy-MM-dd")));

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

      setStats({ sessions: thisWeekDays.size, minutes: totalMinutes, phrases: phraseCount ?? 0 });
      setLoading(false);
    };

    fetchData();
  }, [user]);

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
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-10 py-12">
        <h1 className="text-3xl font-bold font-serif text-foreground tracking-tight mb-10">Progress</h1>

        {/* Streak card */}
        <div className="rounded-2xl bg-card p-7 shadow-xs mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Flame size={26} className="text-warning" />
            <span className="text-4xl font-bold text-foreground">{streak}</span>
            <span className="text-base text-muted-foreground">day streak</span>
          </div>

          <div className="flex justify-between">
            {weekDays.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const practiced = streakDays.has(dayStr);
              const isToday = isSameDay(day, now);
              return (
                <div key={dayStr} className="flex flex-col items-center gap-2">
                  <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground/60"}`}>
                    {format(day, "EEE")}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      practiced ? "bg-primary" : "bg-muted/60"
                    }`}
                  >
                    <Flame
                      size={15}
                      className={practiced ? "text-primary-foreground" : "text-muted-foreground/60"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* This Week Stats */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          This Week
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {weeklyStatCards.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-card p-6 text-center shadow-xs">
              <stat.icon size={20} className="mx-auto mb-3 text-primary" />
              <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Motivation */}
        <div className="rounded-2xl bg-card p-6 shadow-xs">
          <p className="text-base font-medium text-foreground mb-2">
            {streak >= 7 ? "Amazing consistency!" : streak >= 3 ? "Keep it up!" : streak > 0 ? "Great start!" : "Start your streak"}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {streak >= 7
              ? "You've been practicing every day. Your English is improving fast!"
              : streak >= 3
              ? `${streak} days in a row! You're building a great habit.`
              : streak > 0
              ? "Every journey starts with a single step. Come back tomorrow!"
              : "Complete a practice session today to begin your streak."}
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProgressScreen;
