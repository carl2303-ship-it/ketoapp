"use client";

import type { DailyLog, MealEntry, Profile, WeeklyPlan } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { defaultProfile } from "@/store/keto-profile";
import type { KetoState } from "@/store/keto-state";

export async function loadUserData(
  set: (partial: Partial<KetoState> | ((s: KetoState) => Partial<KetoState>)) => void,
  get: () => KetoState,
  userId: string,
  email: string | null,
) {
  const supabase = createClient();
  const date = get().selectedDate;

  const [{ data: profile }, { data: logs }, { data: plans }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("daily_logs")
      .select("*, meal_entries(*)")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle(),
    supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", userId)
      .order("day_of_week"),
  ]);

  set((s) => {
    const next: Partial<KetoState> = {
      authUserId: userId,
      authEmail: email,
      profile: profile
        ? ({ ...defaultProfile, ...profile, email } as Profile)
        : { ...s.profile, id: userId, email },
      weeklyPlans: (plans ?? []) as WeeklyPlan[],
    };

    if (logs) {
      const { meal_entries, ...log } = logs as DailyLog & {
        meal_entries: MealEntry[];
      };
      next.dailyLogs = [
        ...s.dailyLogs.filter((l) => l.date !== date),
        log as DailyLog,
      ];
      next.mealEntries = [
        ...s.mealEntries.filter((e) => e.daily_log_id !== log.id),
        ...(meal_entries ?? []),
      ];
    }

    return next;
  });
}
