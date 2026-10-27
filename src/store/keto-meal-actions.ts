"use client";

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

      // Optimistic — UI (totais, cartões, refeições) actualiza já.
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

          const remoteLog = logRow as DailyLog;
          // Remapear TODAS as entradas locais deste dia para o id remoto do log.
          if (remoteLog.id !== logId) {
            set((s) => ({
              dailyLogs: s.dailyLogs.map((l) =>
                l.id === logId ? remoteLog : l,
              ),
              mealEntries: s.mealEntries.map((e) =>
                e.daily_log_id === logId
                  ? { ...e, daily_log_id: remoteLog.id }
                  : e,
              ),
            }));
          }

          const { data: remote, error } = await supabase
            .from("meal_entries")
            .insert({
              daily_log_id: remoteLog.id,
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

    copyMealToDate: async (input: {
      fromDate: string;
      toDate: string;
      meal_type: MealType;
      replace?: boolean;
    }) => {
      const { fromDate, toDate, meal_type, replace = true } = input;
      if (fromDate === toDate) {
        return { ok: false, copied: 0, error: "Escolhe um dia destino diferente." };
      }

      const source = get()
        .getEntriesForDate(fromDate)
        .filter((e) => e.meal_type === meal_type);

      if (source.length === 0) {
        return {
          ok: false,
          copied: 0,
          error: "Não há itens nesta refeição no dia de origem.",
        };
      }

      if (replace) {
        const dest = get()
          .getEntriesForDate(toDate)
          .filter((e) => e.meal_type === meal_type);
        for (const e of dest) {
          await get().removeMealEntry(e.id);
        }
      }

      for (const e of source) {
        if (!e.food_id) continue;
        await get().addMealEntry({
          meal_type: e.meal_type,
          food_id: e.food_id,
          amount_grams: e.amount_grams,
          is_tkd_workout_carb: e.is_tkd_workout_carb,
          date: toDate,
        });
      }

      return { ok: true, copied: source.length };
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
