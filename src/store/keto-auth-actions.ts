"use client";

import type { Food } from "@/lib/types";
import { SEED_FOODS } from "@/lib/mock/seed-foods";
import { hasSupabaseCredentials } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import {
  isLocalFoodId,
  mergeFoodLists,
  readPersistedPersonalFoods,
} from "@/store/food-merge";
import { defaultProfile } from "@/store/keto-profile";
import type { KetoGet, KetoSet } from "@/store/keto-state";
import { loadUserData } from "@/store/load-user-data";
import { syncLocalDataToRemote } from "@/store/sync-local-to-remote";

/** Gerações de initRemote — respostas stale não sobrescrevem estado mais novo. */
let initRemoteGeneration = 0;

async function afterAuth(
  set: KetoSet,
  get: KetoGet,
  userId: string,
  email: string | null,
  options?: { quiet?: boolean },
) {
  const quiet = options?.quiet ?? false;
  set({ syncing: true });
  try {
    // 1) Sobe dados locais (alimentos / diário / plano) e remapeia IDs.
    let uploaded = { foodsSynced: 0, mealsSynced: 0, plansSynced: 0 };
    try {
      uploaded = await syncLocalDataToRemote(set, get, userId);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Falha ao enviar dados locais para o Supabase.";
      set({
        syncStatus: {
          type: "error",
          message: `Sync parcial: ${msg}`,
        },
      });
    }

    // 2) Perfil + diário + plano remotos.
    await loadUserData(set, get, userId, email);

    // 3) Biblioteca partilhada + rascunhos locais ainda sem UUID; limpar hidden.
    set((s) => ({
      foods: mergeFoodLists(
        s.foods,
        readPersistedPersonalFoods().filter((f) => isLocalFoodId(f.id)),
      ),
      foodsEpoch: s.foodsEpoch + 1,
      hiddenGlobalIds: [],
      authDialogOpen: false,
      syncing: false,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: quiet
        ? s.syncStatus?.type === "error"
          ? s.syncStatus
          : null
        : {
            type: "ok",
            message:
              uploaded.foodsSynced + uploaded.mealsSynced + uploaded.plansSynced >
              0
                ? `Sincronizado: ${uploaded.foodsSynced} alimento(s), ${uploaded.mealsSynced} refeição(ões), ${uploaded.plansSynced} plano(s) enviados.`
                : "Dados sincronizados com o Supabase.",
          },
    }));
  } catch (e) {
    set({
      syncing: false,
      syncStatus: {
        type: "error",
        message:
          e instanceof Error
            ? `Falha na sincronização: ${e.message}`
            : "Falha na sincronização com o Supabase.",
      },
    });
  }
}

export function createAuthActions(set: KetoSet, get: KetoGet) {
  return {
    setAuthDialogOpen: (open: boolean) => set({ authDialogOpen: open }),
    clearSyncStatus: () => set({ syncStatus: null }),

    syncNow: async (opts?: { quiet?: boolean }) => {
      const quiet = opts?.quiet ?? false;
      const userId = get().authUserId;
      if (!userId || !hasSupabaseCredentials()) {
        if (!quiet) {
          set({
            syncStatus: {
              type: "info",
              message:
                "Entra na conta para sincronizar alimentos, diário e plano entre dispositivos.",
            },
            authDialogOpen: true,
          });
        }
        return false;
      }
      try {
        await afterAuth(set, get, userId, get().authEmail, { quiet });
        return true;
      } catch {
        return false;
      }
    },

    initRemote: async () => {
      const generation = ++initRemoteGeneration;

      /** Rascunhos locais (food-*) + persist — a biblioteca remota é a fonte. */
      const draftSnapshot = (): Food[] => {
        const fromState = get().foods.filter((f) => f && isLocalFoodId(f.id));
        const fromStorage = readPersistedPersonalFoods().filter((f) =>
          isLocalFoodId(f.id),
        );
        return mergeFoodLists(fromState, fromStorage);
      };

      const applyFoods = (base: Food[]) =>
        mergeFoodLists(base, draftSnapshot());

      const commitFoods = (partial: {
        usingMock: boolean;
        supabaseReady: boolean;
        schemaMissing?: boolean;
        foods: Food[];
      }) => {
        if (generation !== initRemoteGeneration) return;
        set({
          ...partial,
          foodsEpoch: get().foodsEpoch + 1,
        });
      };

      if (!hasSupabaseCredentials()) {
        commitFoods({
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

        if (generation !== initRemoteGeneration) return;

        if (error) {
          const missing =
            error.code === "PGRST205" ||
            error.message?.toLowerCase().includes("schema cache") ||
            error.message?.toLowerCase().includes("could not find");
          commitFoods({
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
        commitFoods({
          usingMock: false,
          supabaseReady: true,
          schemaMissing: false,
          foods: applyFoods(base),
        });

        const { data: auth } = await supabase.auth.getUser();
        if (generation !== initRemoteGeneration) return;

        if (auth.user) {
          await afterAuth(set, get, auth.user.id, auth.user.email ?? null, {
            quiet: true,
          });
        } else {
          set({ authUserId: null, authEmail: null });
        }
      } catch {
        if (generation !== initRemoteGeneration) return;
        commitFoods({
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
                : error?.message === "Invalid login credentials"
                  ? "Email ou password incorrectos."
                  : error?.message ?? "Falha no login.",
          });
          return false;
        }
        await afterAuth(set, get, data.user.id, data.user.email ?? null);
        return true;
      } catch (e) {
        set({
          authError: e instanceof Error ? e.message : "Falha no login.",
        });
        return false;
      }
    },

    signUp: async (email: string, password: string) => {
      if (!hasSupabaseCredentials()) {
        set({ authError: "Credenciais Supabase em falta." });
        return false;
      }
      if (password.length < 6) {
        set({ authError: "A password precisa de pelo menos 6 caracteres." });
        return false;
      }
      set({ authError: null });
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          set({
            authError:
              error.message.includes("already registered") ||
              error.message.includes("User already registered")
                ? "Este email já tem conta. Usa Entrar."
                : error.message || "Falha ao criar conta.",
          });
          return false;
        }
        if (!data.user) {
          set({ authError: "Falha ao criar conta." });
          return false;
        }
        // Sem sessão = confirmação de email obrigatória no projecto Supabase.
        if (!data.session) {
          set({
            authError:
              "Conta criada. Confirma o email na caixa de entrada e depois entra para sincronizar telemóvel e PC.",
          });
          return false;
        }
        await afterAuth(set, get, data.user.id, data.user.email ?? null);
        return true;
      } catch (e) {
        set({
          authError: e instanceof Error ? e.message : "Falha ao criar conta.",
        });
        return false;
      }
    },

    signOut: async () => {
      // Limpa sessão local (PWA/standalone incluído). Não desinstala a app.
      if (hasSupabaseCredentials()) {
        try {
          const supabase = createClient();
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // Mesmo se a rede falhar, limpa estado local abaixo.
        }
      }
      set({
        authUserId: null,
        authEmail: null,
        authError: null,
        authDialogOpen: false,
        profile: defaultProfile,
        // Plano remoto era da conta — evita mostrar dados de outro user.
        weeklyPlans: [],
      });
    },
  };
}
