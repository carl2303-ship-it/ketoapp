import type { Food } from "@/lib/types";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { isLocalFoodId, LOCAL_USER_ID, mergeFoodLists } from "@/store/food-merge";
import { uid } from "@/store/keto-profile";
import type { KetoGet, KetoSet } from "@/store/keto-state";

export function createFoodActions(set: KetoSet, get: KetoGet) {
  return {
    addFood: async (food: Omit<Food, "id" | "user_id" | "is_global">) => {
      const local: Food = {
        ...food,
        id: uid("food"),
        user_id: get().authUserId ?? get().profile.id,
        is_global: false,
      };
      set((s) => ({ foods: mergeFoodLists(s.foods, [local]) }));

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
            return { ok: true, synced: true };
          }
          return {
            ok: true,
            synced: false,
            warning:
              error?.message ||
              "Guardado neste dispositivo; sync Supabase falhou.",
          };
        } catch (e) {
          return {
            ok: true,
            synced: false,
            warning:
              e instanceof Error
                ? e.message
                : "Guardado neste dispositivo; sync Supabase falhou.",
          };
        }
      }

      return {
        ok: true,
        synced: false,
        warning: get().supabaseReady
          ? "Guardado neste dispositivo. Entra na conta para sincronizar com o Supabase."
          : "Guardado neste dispositivo (modo local).",
      };
    },

    canMutateFood: (food: Food) => {
      const state = get();
      if (state.usingMock || !state.supabaseReady) return true;
      if (food.is_global) return false;
      // Pessoais só locais (ainda sem UUID remoto) ou do dono.
      if (isLocalFoodId(food.id) || food.user_id === LOCAL_USER_ID) {
        return true;
      }
      if (!state.authUserId) return false;
      return food.user_id === state.authUserId;
    },

    updateFood: async (
      id: string,
      food: Omit<Food, "id" | "user_id" | "is_global">,
    ) => {
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

    deleteFood: async (id: string) => {
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
  };
}
