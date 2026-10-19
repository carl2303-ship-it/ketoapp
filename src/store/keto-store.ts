"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_FOODS } from "@/lib/mock/seed-foods";
import type {
  DailyLog,
  Food,
  MealEntry,
  MealType,
  Profile,
  WeeklyPlan,
} from "@/lib/types";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const LOCAL_USER_ID = "local-demo-user";

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function isLocalFoodId(id: string): boolean {
  return id.startsWith("food-");
}

/** Une listas por id sem perder alimentos pessoais locais. */
function mergeFoodLists(base: Food[], extras: Food[]): Food[] {
  const byId = new Map<string, Food>();
  for (const f of base) byId.set(f.id, f);
  for (const f of extras) {
    if (!byId.has(f.id)) byId.set(f.id, f);
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pt"),
  );
}

const defaultProfile: Profile = {
  id: LOCAL_USER_ID,
  email: null,
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
  authUserId: string | null;
  authEmail: string | null;
  authError: string | null;
  profile: Profile;
  foods: Food[];
  dailyLogs: DailyLog[];
  mealEntries: MealEntry[];
  weeklyPlans: WeeklyPlan[];
  selectedDate: string;
  searchQuery: string;
  categoryFilter: string;
  setHydrated: (v: boolean) => void;
  setSelectedDate: (date: string) => void;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: string) => void;
  initRemote: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  ensureDailyLog: (date?: string) => string;
  addMealEntry: (input: {
    meal_type: MealType;
    food_id: string;
    amount_grams: number;
    is_tkd_workout_carb?: boolean;
    date?: string;
  }) => Promise<void>;
  removeMealEntry: (id: string) => Promise<void>;
  addFood: (
    food: Omit<Food, "id" | "user_id" | "is_global">,
  ) => Promise<{ ok: boolean; synced: boolean; error?: string; warning?: string }>;
  updateFood: (
    id: string,
    food: Omit<Food, "id" | "user_id" | "is_global">,
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteFood: (id: string) => Promise<{ ok: boolean; error?: string }>;
  canMutateFood: (food: Food) => boolean;
  updateWater: (ml: number, date?: string) => Promise<void>;
  updateBiometrics: (input: {
    blood_ketones?: number | null;
    blood_glucose?: number | null;
    date?: string;
  }) => Promise<void>;
  addWeeklyPlan: (input: {
    day_of_week: number;
    meal_type: MealType;
    food_id: string;
    amount_grams: number;
  }) => Promise<void>;
  removeWeeklyPlan: (id: string) => Promise<void>;
  copyDay: (fromDay: number, toDay: number) => Promise<void>;
  getLogForDate: (date?: string) => DailyLog | undefined;
  getEntriesForDate: (date?: string) => MealEntry[];
  getPlansForDay: (day: number) => WeeklyPlan[];
}

// NOTE: truncated in tool call - see follow-up
export const useKetoStore = create<KetoState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      usingMock: !hasSupabaseCredentials(),
      supabaseReady: null,
      schemaMissing: false,
      authUserId: null,
      authEmail: null,
      authError: null,
      profile: defaultProfile,
      foods: SEED_FOODS,
      dailyLogs: [],
      mealEntries: [],
      weeklyPlans: [],
      selectedDate: "2020-01-01",
      searchQuery: "",
      categoryFilter: "all",
      setHydrated: (v) => set({ hydrated: v }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setCategoryFilter: (c) => set({ categoryFilter: c }),
      initRemote: async () => {
        const personalSnapshot = (): Food[] => {
          const fromState = get().foods.filter((f) => f && !f.is_global);
          let fromStorage: Food[] = [];
          if (typeof window !== "undefined") {
            try {
              const raw = window.localStorage.getItem("ketotrack-v4");
              if (raw) {
                const parsed = JSON.parse(raw) as { state?: { foods?: Food[] } };
                fromStorage = (parsed.state?.foods ?? []).filter((f) => f && !f.is_global);
              }
            } catch {}
          }
          return mergeFoodLists(fromState, fromStorage);
        };
        if (!hasSupabaseCredentials()) {
          set({ usingMock: true, supabaseReady: false, schemaMissing: false, foods: mergeFoodLists(SEED_FOODS, personalSnapshot()) });
          return;
        }
        try {
          const supabase = createClient();
          const { data, error } = await supabase.from("foods").select("*").order("name");
          if (error) {
            set({ usingMock: true, supabaseReady: false, schemaMissing: true, foods: mergeFoodLists(SEED_FOODS, personalSnapshot()) });
            return;
          }
          const remoteFoods = (data ?? []) as Food[];
          const base = remoteFoods.length > 0 ? remoteFoods : SEED_FOODS;
          set({ usingMock: false, supabaseReady: true, schemaMissing: false, foods: mergeFoodLists(base, personalSnapshot()) });
        } catch {
          set({ usingMock: true, supabaseReady: false, foods: mergeFoodLists(SEED_FOODS, personalSnapshot()) });
        }
      },
      signIn: async () => false,
      signOut: async () => {},
      ensureDailyLog: () => "",
      addMealEntry: async () => {},
      removeMealEntry: async () => {},
      addFood: async () => ({ ok: false, synced: false }),
      updateFood: async () => ({ ok: false }),
      deleteFood: async () => ({ ok: false }),
      canMutateFood: () => false,
      updateWater: async () => {},
      updateBiometrics: async () => {},
      addWeeklyPlan: async () => {},
      removeWeeklyPlan: async () => {},
      copyDay: async () => {},
      getLogForDate: () => undefined,
      getEntriesForDate: () => [],
      getPlansForDay: () => [],
    }),
    {
      name: "ketotrack-v4",
      skipHydration: true,
      partialize: (s) => ({ profile: s.profile, foods: s.foods.filter((f) => f && !f.is_global), dailyLogs: s.dailyLogs, mealEntries: s.mealEntries, weeklyPlans: s.weeklyPlans, selectedDate: s.selectedDate }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<KetoState>;
        const personal = (p.foods ?? []).filter((f) => f && !f.is_global);
        return { ...current, ...p, foods: mergeFoodLists(current.foods, personal), hydrated: false };
      },
    },
  ),
);

export function migrateLegacyKetoPersist(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem("ketotrack-v4")) return;
    for (const key of ["ketotrack-v3", "ketotrack-v2"] as const) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      window.localStorage.setItem("ketotrack-v4", raw);
      return;
    }
  } catch {}
}
