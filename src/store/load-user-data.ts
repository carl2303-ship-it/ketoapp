"use client";

import { format, subDays } from "date-fns";
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
  const today = get().selectedDate || format(new Date(), "yyyy-MM-dd");
  const from = format(subDays(new Date(today), 45), "yyyy-MM-dd");
  const to = format(new Date(today), "yyyy-MM-dd");

  const [{ data: profile }, { data: logs }, { data: plans }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("daily_logs")
      .select("*, meal_entries(*)")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to)
      .order("date"),
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

    if (logs && logs.length > 0) {
      const remoteDates = new Set(
        (logs as Array<{ date: string }>).map((l) => l.date),
      );
      const keptLogs = s.dailyLogs.filter((l) => !remoteDates.has(l.date));
      const keptLogIds = new Set(keptLogs.map((l) => l.id));
      const keptEntries = s.mealEntries.filter((e) =>
        keptLogIds.has(e.daily_log_id),
      );

      const remoteLogs: DailyLog[] = [];
      const remoteEntries: MealEntry[] = [];
      for (const row of logs as Array<
        DailyLog & { meal_entries?: MealEntry[] }
      >) {
        const { meal_entries, ...log } = row;
        remoteLogs.push(log as DailyLog);
        remoteEntries.push(...(meal_entries ?? []));
      }

      next.dailyLogs = [...keptLogs, ...remoteLogs];
      next.mealEntries = [...keptEntries, ...remoteEntries];
    }

    return next;
  });
}
