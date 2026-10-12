"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";
import { SEED_FOODS } from "@/lib/mock/seed-foods";
import type {
  DailyLog,
  Food,
  MealEntry,
  MealType,
  Profile,
} from "@/lib/types";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const LOCAL_USER_ID = "local-demo-user";

function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

const defaultProfile: Profile = {
  id: LOCAL_USER_ID,
  email: "demo@ketotrack.local",
  daily_calories_target: 2000,
  fat_ratio: 75,
  protein_ratio: 20,
  net_carb_target_g: 25,
  water_target_l: 3,
  sodium_target_mg: 5000,
  potassium_target_mg: 3500,
  magnesium_target_mg: 400,
  keto_variation: "skd",
};

interface KetoState {
  hydrated: boolean;
  usingMock: boolean;
  supabaseReady: boolean | null;
  schemaMissing: boolean;
  profile: Profile;
  foods: Food[];
  dailyLogs: DailyLog[];
  mealEntries: MealEntry[];
  selectedDate: string;
  searchQuery: string;
  categoryFilter: string;
  setHydrated: (v: boolean) => void;
  setSelectedDate: (date: string) => void;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: string) => void;
  initRemote: () => Promise<void>;
  ensureDailyLog: (date?: string) => string;
  addMealEntry: (input: {
    meal_type: MealType;
    food_id: string;
    amount_grams: number;
    is_tkd_workout_carb?: boolean;
    date?: string;
  }) => Promise<void>;
  removeMealEntry: (id: string) => Promise<void>;
  addFood: (food: Omit<Food, "id" | "user_id" | "is_global">) => Promise<void>;
  updateWater: (ml: number, date?: string) => Promise<void>;
  getLogForDate: (date?: string) => DailyLog | undefined;
  getEntriesForDate: (date?: string) => MealEntry[];
}

export const useKetoStore = create<KetoState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      usingMock: true,
      supabaseReady: null,
      schemaMissing: false,
      profile: defaultProfile,
      foods: SEED_FOODS,
      dailyLogs: [],
      mealEntries: [],
      selectedDate: today(),
      searchQuery: "",
      categoryFilter: "all",

      setHydrated: (v) => set({ hydrated: v }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setCategoryFilter: (c) => set({ categoryFilter: c }),

      initRemote: async () => {
        if (!hasSupabaseCredentials()) {
          set({ usingMock: true, supabaseReady: false, schemaMissing: false });
          return;
        }

        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("foods")
            .select("*")
            .or("is_global.eq.true")
            .order("name");

          if (error) {
            const missing =
              error.code === "PGRST205" ||
              error.message?.toLowerCase().includes("schema cache") ||
              error.message?.toLowerCase().includes("could not find");
            set({
              usingMock: true,
              supabaseReady: false,
              schemaMissing: missing,
            });
            return;
          }

          const remoteFoods = (data ?? []) as Food[];
          set({
            usingMock: false,
            supabaseReady: true,
            schemaMissing: false,
            foods: remoteFoods.length > 0 ? remoteFoods : SEED_FOODS,
          });

          const { data: auth } = await supabase.auth.getUser();
          if (auth.user) {
            const date = get().selectedDate;
            const { data: logs } = await supabase
              .from("daily_logs")
              .select("*, meal_entries(*)")
              .eq("user_id", auth.user.id)
              .eq("date", date)
              .maybeSingle();

            if (logs) {
              const { meal_entries, ...log } = logs as DailyLog & {
                meal_entries: MealEntry[];
              };
              set((s) => ({
                profile: { ...s.profile, id: auth.user!.id, email: auth.user!.email ?? null },
                dailyLogs: [
                  ...s.dailyLogs.filter((l) => l.date !== date),
                  log as DailyLog,
                ],
                mealEntries: [
                  ...s.mealEntries.filter((e) => e.daily_log_id !== log.id),
                  ...(meal_entries ?? []),
                ],
              }));
            }
          }
        } catch {
          set({ usingMock: true, supabaseReady: false });
        }
      },

      ensureDailyLog: (date) => {
        const d = date ?? get().selectedDate;
        const existing = get().dailyLogs.find((l) => l.date === d);
        if (existing) return existing.id;
        const log: DailyLog = {
          id: uid("log"),
          user_id: get().profile.id,
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

      addMealEntry: async (input) => {
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

        if (!get().usingMock && hasSupabaseCredentials()) {
          try {
            const supabase = createClient();
            const { data: auth } = await supabase.auth.getUser();
            if (!auth.user) return;

            const { data: logRow, error: logErr } = await supabase
              .from("daily_logs")
              .upsert(
                { user_id: auth.user.id, date, water_ml: 0 },
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
                  l.id === logId ? ({ ...l, id: logRow.id } as DailyLog) : l,
                ),
              }));
            }
          } catch {
            // keep local entry
          }
        }
      },

      removeMealEntry: async (id) => {
        set((s) => ({
          mealEntries: s.mealEntries.filter((e) => e.id !== id),
        }));
        if (!get().usingMock && hasSupabaseCredentials()) {
          try {
            const supabase = createClient();
            await supabase.from("meal_entries").delete().eq("id", id);
          } catch {
            // ignore
          }
        }
      },

      addFood: async (food) => {
        const local: Food = {
          ...food,
          id: uid("food"),
          user_id: get().profile.id,
          is_global: false,
        };
        set((s) => ({ foods: [...s.foods, local] }));

        if (!get().usingMock && hasSupabaseCredentials()) {
          try {
            const supabase = createClient();
            const { data: auth } = await supabase.auth.getUser();
            if (!auth.user) return;
            const { data, error } = await supabase
              .from("foods")
              .insert({
                ...food,
                user_id: auth.user.id,
                is_global: false,
              })
              .select()
              .single();
            if (!error && data) {
              set((s) => ({
                foods: s.foods.map((f) => (f.id === local.id ? (data as Food) : f)),
              }));
            }
          } catch {
            // keep local
          }
        }
      },

      updateWater: async (ml, date) => {
        const d = date ?? get().selectedDate;
        const logId = get().ensureDailyLog(d);
        set((s) => ({
          dailyLogs: s.dailyLogs.map((l) =>
            l.id === logId ? { ...l, water_ml: ml } : l,
          ),
        }));
      },

      getLogForDate: (date) => {
        const d = date ?? get().selectedDate;
        return get().dailyLogs.find((l) => l.date === d);
      },

      getEntriesForDate: (date) => {
        const d = date ?? get().selectedDate;
        const log = get().dailyLogs.find((l) => l.date === d);
        if (!log) return [];
        return get().mealEntries.filter((e) => e.daily_log_id === log.id);
      },
    }),
    {
      name: "ketotrack-v1",
      partialize: (s) => ({
        profile: s.profile,
        foods: s.foods,
        dailyLogs: s.dailyLogs,
        mealEntries: s.mealEntries,
        selectedDate: s.selectedDate,
      }),
      onRehydrateStorage: () => () => {
        useKetoStore.setState({ hydrated: true });
      },
    },
  ),
);
