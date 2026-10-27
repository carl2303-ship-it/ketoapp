"use client";

import type { Food } from "@/lib/types";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { mergeFoodLists } from "@/store/food-merge";
import { uid } from "@/store/keto-profile";
import type { KetoGet, KetoSet } from "@/store/keto-state";

function withoutHidden(foods: Food[], hidden: string[]): Food[] {
  if (!hidden.length) return foods;
  const set = new Set(hidden);
  return foods.filter((f) => !set.has(f.id));
}

export function createFoodActions(set: KetoSet, get: KetoGet) {
  return {
    addFood: async (food: Omit<Food, "id" | "user_id" | "is_global">) => {
      const local: Food = {
        ...food,
        id: uid("food"),
        user_id: get().authUserId ?? get().profile.id,
        is_global: false,
      };
      // Merge imediato — Dashboard / Diário / Plano vêem o alimento já.
      set((s) => ({
        foods: mergeFoodLists(s.foods, [local]),
      }));

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

    /** Qualquer alimento na lista pode ser editado/apagado neste dispositivo. */
    canMutateFood: (_food: Food) => true,

    updateFood: async (
      id: string,
      food: Omit<Food, "id" | "user_id" | "is_global">,
    ) => {
      const existing = get().foods.find((f) => f.id === id);
      if (!existing) {
        return { ok: false, error: "Alimento não encontrado." };
      }

      // Global: criar cópia pessoal e ocultar o original (não altera o remoto).
      if (existing.is_global) {
        const local: Food = {
          ...existing,
          ...food,
          id: uid("food"),
          user_id: get().authUserId ?? get().profile.id,
          is_global: false,
        };
        set((s) => {
          const hidden = Array.from(
            new Set([...s.hiddenGlobalIds, existing.id]),
          );
          return {
            hiddenGlobalIds: hidden,
            foods: withoutHidden(
              mergeFoodLists(
                s.foods.filter((f) => f.id !== existing.id),
                [local],
              ),
              hidden,
            ),
            mealEntries: s.mealEntries.map((e) =>
              e.food_id === existing.id ? { ...e, food_id: local.id } : e,
            ),
            weeklyPlans: s.weeklyPlans.map((p) =>
              p.food_id === existing.id ? { ...p, food_id: local.id } : p,
            ),
          };
        });

        if (
          get().supabaseReady &&
          get().authUserId &&
          hasSupabaseCredentials()
        ) {
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
              const remote = data as Food;
              set((s) => ({
                foods: s.foods.map((f) => (f.id === local.id ? remote : f)),
                mealEntries: s.mealEntries.map((e) =>
                  e.food_id === local.id ? { ...e, food_id: remote.id } : e,
                ),
                weeklyPlans: s.weeklyPlans.map((p) =>
                  p.food_id === local.id ? { ...p, food_id: remote.id } : p,
                ),
              }));
            }
          } catch {
            // mantém cópia local
          }
        }
        return { ok: true };
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

      // Global: só esconder neste dispositivo (RLS não deixa apagar seed remoto).
      if (existing.is_global) {
        set((s) => {
          const hidden = Array.from(new Set([...s.hiddenGlobalIds, id]));
          return {
            hiddenGlobalIds: hidden,
            foods: s.foods.filter((f) => f.id !== id),
          };
        });
        return { ok: true };
      }

      if (
        get().supabaseReady &&
        get().authUserId &&
        hasSupabaseCredentials()
      ) {
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from("foods")
            .delete()
            .eq("id", id)
            .eq("user_id", get().authUserId);
          if (error) {
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
