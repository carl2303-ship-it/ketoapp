import type { DailyLog, MealEntry, MealType } from "@/lib/types";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { uid } from "@/store/keto-profile";
import type { KetoGet, KetoSet } from "@/store/keto-state";

export function createMealActions(set: KetoSet, get: KetoGet) {
  return {
    ensureDailyLog: (date?: string) => {
      const d = date ?? get().selectedDate;
      const existing = get().dailyLogs.find((l) => l.date === d);
      if (existing) return existing.id;
      const log: DailyLog = {
        id: uid("log"),
        user_id: get().authUserId ?? get().profile.id,
        date: d,
        water_ml: 0,
        blood_ketones: null,
        blood_glucose: null,
        sodium_mg: 0,
        potassium_mg: 0,
        magnesium_mg: 0,
      };
      set((s) => ({ dailyLogs: [...s.dailyLogs, log] }));
      return log.id;
    },

    addMealEntry: async (input: {
      meal_type: MealType;
      food_id: string;
      amount_grams: number;
      is_tkd_workout_carb?: boolean;
      date?: string;
    }) => {
      const date = input.date ?? get().selectedDate;
      const logId = get().ensureDailyLog(date);
      const entry: MealEntry = {
        id: uid("meal"),
        daily_log_id: logId,
        meal_type: input.meal_type,
        food_id: input.food_id,
        recipe_id: null,
        amount_grams: input.amount_grams,
        is_tkd_workout_carb: Boolean(input.is_tkd_workout_carb),
      };

      set((s) => ({ mealEntries: [...s.mealEntries, entry] }));

      if (get().supabaseReady && get().authUserId && hasSupabaseCredentials()) {
        try {
          const supabase = createClient();
          const userId = get().authUserId!;
          const existingLog = get().getLogForDate(date);
          const { data: logRow, error: logErr } = await supabase
            .from("daily_logs")
            .upsert(
              {
                user_id: userId,
                date,
                water_ml: existingLog?.water_ml ?? 0,
                blood_ketones: existingLog?.blood_ketones ?? null,
                blood_glucose: existingLog?.blood_glucose ?? null,
              },
              { onConflict: "user_id,date" },
            )
            .select()
            .single();
          if (logErr || !logRow) return;

          const { data: remote, error } = await supabase
            .from("meal_entries")
            .insert({
              daily_log_id: logRow.id,
              meal_type: entry.meal_type,
              food_id: entry.food_id,
              amount_grams: entry.amount_grams,
              is_tkd_workout_carb: entry.is_tkd_workout_carb,
            })
            .select()
            .single();

          if (!error && remote) {
            set((s) => ({
              mealEntries: s.mealEntries.map((e) =>
                e.id === entry.id ? (remote as MealEntry) : e,
              ),
              dailyLogs: s.dailyLogs.map((l) =>
                l.id === logId ? ({ ...logRow } as DailyLog) : l,
              ),
            }));
          }
        } catch {
          // keep local
        }
      }
    },

    removeMealEntry: async (id: string) => {
      set((s) => ({
        mealEntries: s.mealEntries.filter((e) => e.id !== id),
      }));
      if (get().supabaseReady && get().authUserId && hasSupabaseCredentials()) {
        try {
          const supabase = createClient();
          await supabase.from("meal_entries").delete().eq("id", id);
        } catch {
          // ignore
        }
      }
    },

    updateWater: async (ml: number, date?: string) => {
      const d = date ?? get().selectedDate;
      const logId = get().ensureDailyLog(d);
      set((s) => ({
        dailyLogs: s.dailyLogs.map((l) =>
          l.id === logId ? { ...l, water_ml: ml } : l,
        ),
      }));

      if (get().supabaseReady && get().authUserId && hasSupabaseCredentials()) {
        try {
          const supabase = createClient();
          await supabase.from("daily_logs").upsert(
            {
              user_id: get().authUserId,
              date: d,
              water_ml: ml,
            },
            { onConflict: "user_id,date" },
          );
        } catch {
          // ignore
        }
      }
    },

    updateBiometrics: async (input: {
      blood_ketones?: number | null;
      blood_glucose?: number | null;
      date?: string;
    }) => {
      const d = input.date ?? get().selectedDate;
      const logId = get().ensureDailyLog(d);
      set((s) => ({
        dailyLogs: s.dailyLogs.map((l) =>
          l.id === logId
            ? {
                ...l,
                blood_ketones:
                  input.blood_ketones !== undefined
                    ? input.blood_ketones
                    : l.blood_ketones,
                blood_glucose:
                  input.blood_glucose !== undefined
                    ? input.blood_glucose
                    : l.blood_glucose,
              }
            : l,
        ),
      }));

      if (get().supabaseReady && get().authUserId && hasSupabaseCredentials()) {
        try {
          const log = get().getLogForDate(d);
          const supabase = createClient();
          await supabase.from("daily_logs").upsert(
            {
              user_id: get().authUserId,
              date: d,
              water_ml: log?.water_ml ?? 0,
              blood_ketones: log?.blood_ketones ?? null,
              blood_glucose: log?.blood_glucose ?? null,
            },
            { onConflict: "user_id,date" },
          );
        } catch {
          // ignore
        }
      }
    },
  };
}
