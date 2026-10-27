"use client";

import type { MealType, WeeklyPlan } from "@/lib/types";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { uid } from "@/store/keto-profile";
import type { KetoGet, KetoSet } from "@/store/keto-state";

export function createPlanActions(set: KetoSet, get: KetoGet) {
  return {
    addWeeklyPlan: async (input: {
      day_of_week: number;
      meal_type: MealType;
      food_id: string;
      amount_grams: number;
    }) => {
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

    removeWeeklyPlan: async (id: string) => {
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

    copyDay: async (fromDay: number, toDay: number) => {
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

    copyMeal: async (input: {
      fromDay: number;
      toDay: number;
      meal_type: MealType;
      replace?: boolean;
    }) => {
      const { fromDay, toDay, meal_type, replace = true } = input;
      if (fromDay === toDay) return { ok: false, copied: 0 };

      const source = get().weeklyPlans.filter(
        (p) => p.day_of_week === fromDay && p.meal_type === meal_type,
      );
      if (source.length === 0) return { ok: false, copied: 0 };

      if (replace) {
        const existing = get().weeklyPlans.filter(
          (p) => p.day_of_week === toDay && p.meal_type === meal_type,
        );
        for (const p of existing) {
          await get().removeWeeklyPlan(p.id);
        }
      }

      for (const p of source) {
        await get().addWeeklyPlan({
          day_of_week: toDay,
          meal_type: p.meal_type,
          food_id: p.food_id,
          amount_grams: p.amount_grams,
        });
      }
      return { ok: true, copied: source.length };
    },
  };
}
