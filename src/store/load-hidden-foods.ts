"use client";

import { createClient } from "@/lib/supabase/client";
import type { KetoGet, KetoSet } from "@/store/keto-state";
import { mergeFoodLists } from "@/store/food-merge";

/**
 * Carrega alimentos ocultados por este user e aplica ao estado
 * (`hiddenGlobalIds` + filtra `foods`).
 * Também envia ocultações locais que ainda não estão na BD.
 */
export async function syncHiddenFoods(
  set: KetoSet,
  get: KetoGet,
  userId: string,
): Promise<string[]> {
  const supabase = createClient();
  const localHidden = get().hiddenGlobalIds.filter(
    (id) => id && !id.startsWith("food-"),
  );

  // Sobe ocultações locais (outros dispositivos ainda não as têm).
  for (const foodId of localHidden) {
    await supabase.from("user_hidden_foods").upsert(
      { user_id: userId, food_id: foodId },
      { onConflict: "user_id,food_id" },
    );
  }

  const { data, error } = await supabase
    .from("user_hidden_foods")
    .select("food_id")
    .eq("user_id", userId);

  if (error) {
    // Tabela ainda não existe → mantém só o local.
    return localHidden;
  }

  const remoteIds = (data ?? []).map(
    (r: { food_id: string }) => r.food_id,
  );
  const merged = Array.from(new Set([...localHidden, ...remoteIds]));
  const hidden = new Set(merged);

  set((s) => ({
    hiddenGlobalIds: merged,
    foods: mergeFoodLists(
      s.foods.filter((f) => !hidden.has(f.id)),
      [],
    ),
    foodsEpoch: s.foodsEpoch + 1,
  }));

  return merged;
}
