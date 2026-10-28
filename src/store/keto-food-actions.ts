"use client";

import type { Food } from "@/lib/types";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import {
  flushPersonalFoodsToStorage,
  foodKey,
  mergeFoodLists,
} from "@/store/food-merge";
import { uid } from "@/store/keto-profile";
import type { KetoGet, KetoSet } from "@/store/keto-state";

function commitFoods(set: KetoSet, get: KetoGet, foods: Food[]) {
  set((s) => ({ foods, foodsEpoch: s.foodsEpoch + 1 }));
  flushPersonalFoodsToStorage(foods);
}

function sharedPayload(food: Omit<Food, "id" | "user_id" | "is_global">) {
  return {
    ...food,
    user_id: null,
    is_global: true,
  };
}

export function createFoodActions(set: KetoSet, get: KetoGet) {
  return {
    addFood: async (food: Omit<Food, "id" | "user_id" | "is_global">) => {
      // Reutilizar se já existir na lista (evita duplicados nome|marca).
      const existingLocal = get().foods.find((f) => foodKey(f) === foodKey(food));
      if (existingLocal) {
        return {
          ok: true,
          synced: !existingLocal.id.startsWith("food-"),
          foodId: existingLocal.id,
          warning: "Já existia na biblioteca — reutilizei o existente.",
        };
      }

      const local: Food = {
        ...food,
        id: uid("food"),
        user_id: null,
        is_global: true,
      };
      commitFoods(set, get, mergeFoodLists(get().foods, [local]));

      if (get().supabaseReady && get().authUserId && hasSupabaseCredentials()) {
        try {
          const supabase = createClient();

          // Já na nuvem com o mesmo nome|marca?
          const { data: found } = await supabase
            .from("foods")
            .select("*")
            .ilike("name", food.name.trim())
            .limit(20);
          const match = ((found ?? []) as Food[]).find(
            (f) => foodKey(f) === foodKey(food),
          );
          if (match) {
            commitFoods(
              set,
              get,
              mergeFoodLists(
                get().foods.filter((f) => f.id !== local.id),
                [match],
              ),
            );
            set({
              syncStatus: {
                type: "ok",
                message: `"${match.name}" já estava na biblioteca partilhada.`,
              },
            });
            return { ok: true, synced: true, foodId: match.id };
          }

          const { data, error } = await supabase
            .from("foods")
            .insert(sharedPayload(food))
            .select()
            .single();
          if (!error && data) {
            const remote = data as Food;
            commitFoods(
              set,
              get,
              get().foods.map((f) => (f.id === local.id ? remote : f)),
            );
            set({
              syncStatus: {
                type: "ok",
                message: `"${remote.name}" adicionado à biblioteca de todos.`,
              },
            });
            return { ok: true, synced: true, foodId: remote.id };
          }
          // Unique violation → refetch match
          if (error?.code === "23505") {
            const { data: again } = await supabase
              .from("foods")
              .select("*")
              .ilike("name", food.name.trim())
              .limit(20);
            const hit = ((again ?? []) as Food[]).find(
              (f) => foodKey(f) === foodKey(food),
            );
            if (hit) {
              commitFoods(
                set,
                get,
                mergeFoodLists(
                  get().foods.filter((f) => f.id !== local.id),
                  [hit],
                ),
              );
              return { ok: true, synced: true, foodId: hit.id };
            }
          }
          const warning =
            error?.message ||
            "Guardado neste dispositivo; sync Supabase falhou.";
          set({ syncStatus: { type: "error", message: warning } });
          return {
            ok: true,
            synced: false,
            foodId: local.id,
            warning,
          };
        } catch (e) {
          const warning =
            e instanceof Error
              ? e.message
              : "Guardado neste dispositivo; sync Supabase falhou.";
          set({ syncStatus: { type: "error", message: warning } });
          return {
            ok: true,
            synced: false,
            foodId: local.id,
            warning,
          };
        }
      }

      const warning = get().supabaseReady
        ? "Guardado neste dispositivo. Entra na conta para partilhar com todos e sincronizar o diário."
        : "Guardado neste dispositivo (modo local).";
      if (get().supabaseReady && !get().authUserId) {
        set({
          syncStatus: { type: "info", message: warning },
        });
      }
      return {
        ok: true,
        synced: false,
        foodId: local.id,
        warning,
      };
    },

    canMutateFood: (_food: Food) => true,

    updateFood: async (
      id: string,
      food: Omit<Food, "id" | "user_id" | "is_global">,
    ) => {
      const existing = get().foods.find((f) => f.id === id);
      if (!existing) {
        return { ok: false, error: "Alimento não encontrado." };
      }

      const updated: Food = {
        ...existing,
        ...food,
        user_id: null,
        is_global: true,
      };
      commitFoods(
        set,
        get,
        mergeFoodLists(
          get().foods.filter((f) => f.id !== id),
          [updated],
        ),
      );

      if (
        get().supabaseReady &&
        get().authUserId &&
        hasSupabaseCredentials() &&
        !id.startsWith("food-")
      ) {
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from("foods")
            .update(sharedPayload(food))
            .eq("id", id);
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
              e instanceof Error
                ? e.message
                : "Falha ao actualizar no Supabase.",
          };
        }
      }
      return { ok: true };
    },

    deleteFood: async (id: string) => {
      const existing = get().foods.find((f) => f.id === id);
      if (!existing) {
        return { ok: false, error: "Alimento não encontrado." };
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
        !id.startsWith("food-")
      ) {
        try {
          const supabase = createClient();
          const { error } = await supabase.from("foods").delete().eq("id", id);
          if (error) {
            return {
              ok: false,
              error:
                error.message.includes("restrict") || error.code === "23503"
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

      commitFoods(
        set,
        get,
        get().foods.filter((f) => f.id !== id),
      );
      return { ok: true };
    },
  };
}
