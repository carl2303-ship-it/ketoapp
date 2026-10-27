"use client";

import type { Food } from "@/lib/types";
import { SEED_FOODS } from "@/lib/mock/seed-foods";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import {
  mergeFoodLists,
  readPersistedPersonalFoods,
} from "@/store/food-merge";
import { defaultProfile } from "@/store/keto-profile";
import type { KetoGet, KetoSet } from "@/store/keto-state";
import { loadUserData } from "@/store/load-user-data";

export function createAuthActions(set: KetoSet, get: KetoGet) {
  return {
    initRemote: async () => {
      /** Pessoais actuais em memória + o que ainda estiver só no persist. */
      const personalSnapshot = (): Food[] => {
        const fromState = get().foods.filter((f) => f && !f.is_global);
        const fromStorage = readPersistedPersonalFoods();
        return mergeFoodLists(fromState, fromStorage);
      };

      const applyFoods = (base: Food[]) => {
        const hidden = new Set(get().hiddenGlobalIds);
        return mergeFoodLists(base, personalSnapshot()).filter(
          (f) => !hidden.has(f.id),
        );
      };

      if (!hasSupabaseCredentials()) {
        set({
          usingMock: true,
          supabaseReady: false,
          schemaMissing: false,
          foods: applyFoods(SEED_FOODS),
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
            foods: applyFoods(SEED_FOODS),
          });
          return;
        }

        const remoteFoods = (data ?? []) as Food[];
        const base = remoteFoods.length > 0 ? remoteFoods : SEED_FOODS;
        // Re-lê pessoais DEPOIS do await — o utilizador pode ter criado
        // alimentos enquanto o fetch corria.
        set({
          usingMock: false,
          supabaseReady: true,
          schemaMissing: false,
          foods: applyFoods(base),
        });

        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          await loadUserData(set, get, auth.user.id, auth.user.email ?? null);
        } else {
          set({ authUserId: null, authEmail: null });
        }
      } catch {
        set({
          usingMock: true,
          supabaseReady: false,
          foods: applyFoods(SEED_FOODS),
        });
      }
    },

    signIn: async (email: string, password: string) => {
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
  };
}
