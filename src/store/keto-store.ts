"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_FOODS } from "@/lib/mock/seed-foods";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { isLocalFoodId, mergeFoodLists } from "@/store/food-merge";
import { createAuthActions } from "@/store/keto-auth-actions";
import { createFoodActions } from "@/store/keto-food-actions";
import { createMealActions } from "@/store/keto-meal-actions";
import { createPlanActions } from "@/store/keto-plan-actions";
import { defaultProfile } from "@/store/keto-profile";
import type { KetoState } from "@/store/keto-state";
import { loadUserData } from "@/store/load-user-data";
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
      syncing: false,
      syncStatus: null,
      lastSyncedAt: null,
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
      setSelectedDate: (date) => {
        set({ selectedDate: date });
        const userId = get().authUserId;
        if (userId) {
          void loadUserData(set, get, userId, get().authEmail);
        }
      },
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
        // Só rascunhos locais (food-*) — a biblioteca partilhada vem do Supabase.
        foods: s.foods.filter((f) => f && isLocalFoodId(f.id)),
        hiddenGlobalIds: [] as string[],
        dailyLogs: s.dailyLogs,
        mealEntries: s.mealEntries,
        weeklyPlans: s.weeklyPlans,
        selectedDate: s.selectedDate,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<KetoState>;
        const drafts = (p.foods ?? []).filter((f) => f && isLocalFoodId(f.id));
        return {
          ...current,
          ...p,
          hiddenGlobalIds: [],
          foods: mergeFoodLists(current.foods, drafts),
          hydrated: false,
        };
      },
    },
  ),
);
