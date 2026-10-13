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
  WeeklyPlan,
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
  /** True only when foods cannot be loaded from Supabase. */
  usingMock: boolean;
  supabaseReady: boolean | null;
  schemaMissing: boolean;
  /** Authenticated user id, or null if browsing anonymously. */
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
  addFood: (food: Omit<Food, "id" | "user_id" | "is_global">) => Promise<void>;
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

async function loadUserData(
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
      selectedDate: today(),
      searchQuery: "",
      categoryFilter: "all",

      setHydrated: (v) => set({ hydrated: v }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setCategoryFilter: (c) => set({ categoryFilter: c }),

      initRemote: async () => {
        if (!hasSupabaseCredentials()) {
          set({
            usingMock: true,
            supabaseReady: false,
            schemaMissing: false,
            foods: SEED_FOODS,
          });
          return;
        }

        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("foods")
            .select("*")
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
              foods: SEED_FOODS,
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
            await loadUserData(set, get, auth.user.id, auth.user.email ?? null);
          } else {
            set({ authUserId: null, authEmail: null });
          }
        } catch {
          set({ usingMock: true, supabaseReady: false, foods: SEED_FOODS });
        }
      },

      signIn: async (email, password) => {
        if (!hasSupabaseCredentials()) {
          set({ authError: "Credenciais Supabase em falta." });
          return false;
        }
        set({ authError: null });
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error || !data.user) {
            set({
              authError:
                error?.message === "Email not confirmed"
                  ? "Confirma o email na caixa de entrada antes de entrar."
                  : error?.message ?? "Falha no login.",
            });
            return false;
          }
          await loadUserData(set, get, data.user.id, data.user.email ?? null);
          return true;
        } catch (e) {
          set({
            authError: e instanceof Error ? e.message : "Falha no login.",
          });
          return false;
        }
      },

      signOut: async () => {
        if (hasSupabaseCredentials()) {
          try {
            const supabase = createClient();
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
        }
        set({
          authUserId: null,
          authEmail: null,
          authError: null,
          profile: defaultProfile,
          weeklyPlans: [],
        });
      },

      ensureDailyLog: (date) => {
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

      removeMealEntry: async (id) => {
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

      addFood: async (food) => {
        const local: Food = {
          ...food,
          id: uid("food"),
          user_id: get().authUserId ?? get().profile.id,
          is_global: false,
        };
        set((s) => ({ foods: [...s.foods, local] }));

        if (get().supabaseReady && get().authUserId && hasSupabaseCredentials()) {
          try {
            const supabase = createClient();
            const { data, error } = await supabase
              .from("foods")
              .insert({
                ...food,
                user_id: get().authUserId,
                is_global: false,
              })
              .select()
              .single();
            if (!error && data) {
              set((s) => ({
                foods: s.foods.map((f) =>
                  f.id === local.id ? (data as Food) : f,
                ),
              }));
            }
          } catch {
            // keep local
          }
        }
      },

      canMutateFood: (food) => {
        const state = get();
        // Modo mock: tudo editável/apagável com confirmação na UI.
        if (state.usingMock || !state.supabaseReady) return true;
        // Remoto: globais só leitura; pessoais só do dono.
        if (food.is_global) return false;
        if (!state.authUserId) return false;
        return food.user_id === state.authUserId;
      },

      updateFood: async (id, food) => {
        const existing = get().foods.find((f) => f.id === id);
        if (!existing) {
          return { ok: false, error: "Alimento não encontrado." };
        }
        if (!get().canMutateFood(existing)) {
          return {
            ok: false,
            error:
              "Alimentos globais são só de leitura. Cria um alimento pessoal para o personalizar.",
          };
        }

        set((s) => ({
          foods: s.foods.map((f) =>
            f.id === id
              ? {
                  ...f,
                  ...food,
                }
              : f,
          ),
        }));

        if (
          get().supabaseReady &&
          get().authUserId &&
          hasSupabaseCredentials() &&
          !existing.is_global
        ) {
          try {
            const supabase = createClient();
            const { error } = await supabase
              .from("foods")
              .update({
                ...food,
                user_id: get().authUserId,
                is_global: false,
              })
              .eq("id", id)
              .eq("user_id", get().authUserId);
            if (error) {
              return {
                ok: false,
                error: error.message || "Falha ao actualizar no Supabase.",
              };
            }
          } catch (e) {
            return {
              ok: false,
              error:
                e instanceof Error ? e.message : "Falha ao actualizar no Supabase.",
            };
          }
        }
        return { ok: true };
      },

      deleteFood: async (id) => {
        const existing = get().foods.find((f) => f.id === id);
        if (!existing) {
          return { ok: false, error: "Alimento não encontrado." };
        }
        if (!get().canMutateFood(existing)) {
          return {
            ok: false,
            error:
              "Alimentos globais são só de leitura e não podem ser apagados.",
          };
        }

        const mealCount = get().mealEntries.filter((e) => e.food_id === id)
          .length;
        const planCount = get().weeklyPlans.filter((p) => p.food_id === id)
          .length;
        if (mealCount > 0 || planCount > 0) {
          const parts: string[] = [];
          if (mealCount > 0) {
            parts.push(
              `${mealCount} registo${mealCount === 1 ? "" : "s"} no diário`,
            );
          }
          if (planCount > 0) {
            parts.push(
              `${planCount} item${planCount === 1 ? "" : "s"} no plano`,
            );
          }
          return {
            ok: false,
            error: `Não podes apagar este alimento: está em ${parts.join(" e ")}. Remove essas entradas primeiro.`,
          };
        }

        if (
          get().supabaseReady &&
          get().authUserId &&
          hasSupabaseCredentials() &&
          !existing.is_global
        ) {
          try {
            const supabase = createClient();
            const { error } = await supabase
              .from("foods")
              .delete()
              .eq("id", id)
              .eq("user_id", get().authUserId);
            if (error) {
              // recipe_items ON DELETE RESTRICT, etc.
              return {
                ok: false,
                error:
                  error.message.includes("restrict") ||
                  error.code === "23503"
                    ? "Este alimento está a ser usado noutra tabela (ex. receita) e não pode ser apagado."
                    : error.message || "Falha ao apagar no Supabase.",
              };
            }
          } catch (e) {
            return {
              ok: false,
              error:
                e instanceof Error ? e.message : "Falha ao apagar no Supabase.",
            };
          }
        }

        set((s) => ({ foods: s.foods.filter((f) => f.id !== id) }));
        return { ok: true };
      },

      updateWater: async (ml, date) => {
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

      updateBiometrics: async (input) => {
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

      addWeeklyPlan: async (input) => {
        const item: WeeklyPlan = {
          id: uid("plan"),
          user_id: get().authUserId ?? get().profile.id,
          day_of_week: input.day_of_week,
          meal_type: input.meal_type,
          food_id: input.food_id,
          amount_grams: input.amount_grams,
        };
        set((s) => ({ weeklyPlans: [...s.weeklyPlans, item] }));

        if (get().supabaseReady && get().authUserId && hasSupabaseCredentials()) {
          try {
            const supabase = createClient();
            const { data, error } = await supabase
              .from("weekly_plans")
              .insert({
                user_id: get().authUserId,
                day_of_week: item.day_of_week,
                meal_type: item.meal_type,
                food_id: item.food_id,
                amount_grams: item.amount_grams,
              })
              .select()
              .single();
            if (!error && data) {
              set((s) => ({
                weeklyPlans: s.weeklyPlans.map((p) =>
                  p.id === item.id ? (data as WeeklyPlan) : p,
                ),
              }));
            }
          } catch {
            // keep local
          }
        }
      },

      removeWeeklyPlan: async (id) => {
        set((s) => ({
          weeklyPlans: s.weeklyPlans.filter((p) => p.id !== id),
        }));
        if (get().supabaseReady && get().authUserId && hasSupabaseCredentials()) {
          try {
            const supabase = createClient();
            await supabase.from("weekly_plans").delete().eq("id", id);
          } catch {
            // ignore
          }
        }
      },

      copyDay: async (fromDay, toDay) => {
        if (fromDay === toDay) return;
        const source = get().weeklyPlans.filter((p) => p.day_of_week === fromDay);
        const existingTarget = get().weeklyPlans.filter(
          (p) => p.day_of_week === toDay,
        );
        for (const p of existingTarget) {
          await get().removeWeeklyPlan(p.id);
        }
        for (const p of source) {
          await get().addWeeklyPlan({
            day_of_week: toDay,
            meal_type: p.meal_type,
            food_id: p.food_id,
            amount_grams: p.amount_grams,
          });
        }
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

      getPlansForDay: (day) =>
        get().weeklyPlans.filter((p) => p.day_of_week === day),
    }),
    {
      name: "ketotrack-v2",
      partialize: (s) => ({
        profile: s.profile,
        dailyLogs: s.dailyLogs,
        mealEntries: s.mealEntries,
        weeklyPlans: s.weeklyPlans,
        selectedDate: s.selectedDate,
      }),
      onRehydrateStorage: () => () => {
        useKetoStore.setState({ hydrated: true });
      },
    },
  ),
);
