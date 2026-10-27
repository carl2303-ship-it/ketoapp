"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_FOODS } from "@/lib/mock/seed-foods";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { mergeFoodLists } from "@/store/food-merge";
import { createAuthActions } from "@/store/keto-auth-actions";
import { createFoodActions } from "@/store/keto-food-actions";
import { createMealActions } from "@/store/keto-meal-actions";
import { createPlanActions } from "@/store/keto-plan-actions";
import { defaultProfile } from "@/store/keto-profile";
import type { KetoState } from "@/store/keto-state";
import { KETO_PERSIST_KEY } from "@/store/persist-migrate";

export type { KetoState } from "@/store/keto-state";

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
      authDialogOpen: false,
      profile: defaultProfile,
      foods: SEED_FOODS,
      foodsEpoch: 0,
      hiddenGlobalIds: [],
      dailyLogs: [],
      mealEntries: [],
      weeklyPlans: [],
      // Placeholder estável SSR/cliente — StoreBootstrap põe o dia real após rehydrate.
      selectedDate: "2020-01-01",
      searchQuery: "",
      categoryFilter: "all",

      setHydrated: (v) => set({ hydrated: v }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setCategoryFilter: (c) => set({ categoryFilter: c }),

      ...createAuthActions(set, get),
      ...createMealActions(set, get),
      ...createFoodActions(set, get),
      ...createPlanActions(set, get),

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
      name: KETO_PERSIST_KEY,
      // Next.js SSR: nunca rehidratar durante o paint inicial (evita #418 + flash).
      skipHydration: true,
      partialize: (s) => ({
        profile: s.profile,
        // Persistir só pessoais — categorias novas vivem nestes alimentos.
        foods: s.foods.filter((f) => f && !f.is_global),
        hiddenGlobalIds: s.hiddenGlobalIds,
        dailyLogs: s.dailyLogs,
        mealEntries: s.mealEntries,
        weeklyPlans: s.weeklyPlans,
        selectedDate: s.selectedDate,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<KetoState>;
        const personal = (p.foods ?? []).filter((f) => f && !f.is_global);
        const hidden = p.hiddenGlobalIds ?? [];
        return {
          ...current,
          ...p,
          hiddenGlobalIds: hidden,
          // Sempre partir do seed/remoto actual + pessoais; respeita globais ocultos.
          foods: mergeFoodLists(current.foods, personal).filter(
            (f) => !hidden.includes(f.id),
          ),
          hydrated: false,
        };
      },
    },
  ),
);
