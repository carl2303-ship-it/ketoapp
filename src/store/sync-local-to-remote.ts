"use client";

import type { DailyLog, Food, MealEntry, WeeklyPlan } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  flushPersonalFoodsToStorage,
  foodKey,
  isLocalFoodId,
  mergeFoodLists,
} from "@/store/food-merge";
import type { KetoGet, KetoSet } from "@/store/keto-state";

function isLocalGeneratedId(id: string): boolean {
  return /^(food|log|meal|plan)-/i.test(id);
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

/**
 * Depois do login/signup: sobe rascunhos locais de alimentos (como partilhados),
 * diário e plano; remapeia IDs `food-*`/`log-*`/`meal-*`/`plan-*` → UUIDs.
 */
export async function syncLocalDataToRemote(
  set: KetoSet,
  get: KetoGet,
  userId: string,
): Promise<{ foodsSynced: number; mealsSynced: number; plansSynced: number }> {
  const supabase = createClient();
  let foodsSynced = 0;
  let mealsSynced = 0;
  let plansSynced = 0;

  // 1) Biblioteca remota completa (partilhada) — dedupe por nome|marca
  const { data: remoteAll } = await supabase
    .from("foods")
    .select("*")
    .order("name");

  const remoteByKey = new Map<string, Food>();
  for (const f of (remoteAll ?? []) as Food[]) {
    remoteByKey.set(foodKey(f), f);
  }

  const idRemap = new Map<string, string>();
  const localDrafts = get().foods.filter(
    (f) => f && (isLocalFoodId(f.id) || !isUuid(f.id)),
  );

  for (const local of localDrafts) {
    const existing = remoteByKey.get(foodKey(local));
    if (existing) {
      idRemap.set(local.id, existing.id);
      continue;
    }

    const { data, error } = await supabase
      .from("foods")
      .insert({
        name: local.name,
        brand: local.brand,
        category: local.category,
        calories: local.calories,
        fat_g: local.fat_g,
        protein_g: local.protein_g,
        carbs_total_g: local.carbs_total_g,
        fiber_g: local.fiber_g,
        polyols_g: local.polyols_g,
        sodium_mg: local.sodium_mg,
        potassium_mg: local.potassium_mg,
        magnesium_mg: local.magnesium_mg,
        saturated_fat_g: local.saturated_fat_g,
        user_id: null,
        is_global: true,
      })
      .select()
      .single();

    if (!error && data) {
      const remote = data as Food;
      idRemap.set(local.id, remote.id);
      remoteByKey.set(foodKey(remote), remote);
      foodsSynced += 1;
    } else if (error?.code === "23505") {
      // Unique race — procurar de novo
      const hit = remoteByKey.get(foodKey(local));
      if (hit) idRemap.set(local.id, hit.id);
    }
  }

  if (idRemap.size > 0) {
    set((s) => {
      const nextFoods = s.foods.map((f) => {
        const nextId = idRemap.get(f.id);
        if (!nextId) return f;
        return { ...f, id: nextId, user_id: null, is_global: true };
      });
      const merged = mergeFoodLists([], nextFoods);
      flushPersonalFoodsToStorage(merged);
      return {
        foods: merged,
        foodsEpoch: s.foodsEpoch + 1,
        mealEntries: s.mealEntries.map((e) =>
          e.food_id && idRemap.has(e.food_id)
            ? { ...e, food_id: idRemap.get(e.food_id)! }
            : e,
        ),
        weeklyPlans: s.weeklyPlans.map((p) =>
          idRemap.has(p.food_id)
            ? { ...p, food_id: idRemap.get(p.food_id)!, user_id: userId }
            : { ...p, user_id: userId },
        ),
      };
    });
  }

  // 2) Diário local → remoto
  const localLogs = get().dailyLogs.filter((l) => isLocalGeneratedId(l.id));
  const logRemap = new Map<string, string>();

  for (const log of localLogs) {
    const { data, error } = await supabase
      .from("daily_logs")
      .upsert(
        {
          user_id: userId,
          date: log.date,
          water_ml: log.water_ml ?? 0,
          blood_ketones: log.blood_ketones ?? null,
          blood_glucose: log.blood_glucose ?? null,
          sodium_mg: log.sodium_mg ?? 0,
          potassium_mg: log.potassium_mg ?? 0,
          magnesium_mg: log.magnesium_mg ?? 0,
        },
        { onConflict: "user_id,date" },
      )
      .select()
      .single();

    if (!error && data) {
      logRemap.set(log.id, (data as DailyLog).id);
    }
  }

  if (logRemap.size > 0) {
    set((s) => ({
      dailyLogs: s.dailyLogs.map((l) => {
        const nextId = logRemap.get(l.id);
        if (!nextId) return { ...l, user_id: userId };
        return { ...l, id: nextId, user_id: userId };
      }),
      mealEntries: s.mealEntries.map((e) =>
        logRemap.has(e.daily_log_id)
          ? { ...e, daily_log_id: logRemap.get(e.daily_log_id)! }
          : e,
      ),
    }));
  }

  const localMeals = get().mealEntries.filter((e) => isLocalGeneratedId(e.id));
  for (const entry of localMeals) {
    const logId = entry.daily_log_id;
    if (!isUuid(logId)) continue;
    if (entry.food_id && !isUuid(entry.food_id)) continue;

    const { data, error } = await supabase
      .from("meal_entries")
      .insert({
        daily_log_id: logId,
        meal_type: entry.meal_type,
        food_id: entry.food_id,
        recipe_id: entry.recipe_id,
        amount_grams: entry.amount_grams,
        is_tkd_workout_carb: entry.is_tkd_workout_carb,
      })
      .select()
      .single();

    if (!error && data) {
      const remote = data as MealEntry;
      mealsSynced += 1;
      set((s) => ({
        mealEntries: s.mealEntries.map((e) =>
          e.id === entry.id ? remote : e,
        ),
      }));
    }
  }

  // 3) Plano semanal local → remoto
  const localPlans = get().weeklyPlans.filter((p) => isLocalGeneratedId(p.id));
  for (const plan of localPlans) {
    if (!isUuid(plan.food_id)) continue;

    const { data, error } = await supabase
      .from("weekly_plans")
      .insert({
        user_id: userId,
        day_of_week: plan.day_of_week,
        meal_type: plan.meal_type,
        food_id: plan.food_id,
        amount_grams: plan.amount_grams,
      })
      .select()
      .single();

    if (!error && data) {
      const remote = data as WeeklyPlan;
      plansSynced += 1;
      set((s) => ({
        weeklyPlans: s.weeklyPlans.map((p) =>
          p.id === plan.id ? remote : p,
        ),
      }));
    }
  }

  // 4) Refetch biblioteca partilhada completa
  const { data: allFoods } = await supabase
    .from("foods")
    .select("*")
    .order("name");

  if (allFoods && allFoods.length > 0) {
    const stillLocal = get().foods.filter((f) => f && isLocalFoodId(f.id));
    const merged = mergeFoodLists(allFoods as Food[], stillLocal);
    flushPersonalFoodsToStorage(merged);
    set((s) => ({
      foods: merged,
      foodsEpoch: s.foodsEpoch + 1,
      usingMock: false,
      supabaseReady: true,
      hiddenGlobalIds: [],
    }));
  }

  return { foodsSynced, mealsSynced, plansSynced };
}
