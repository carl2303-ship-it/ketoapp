"use client";

import type { Food } from "@/lib/types";
import { KETO_PERSIST_KEY } from "@/store/persist-migrate";

export const LOCAL_USER_ID = "local-demo-user";

export function isLocalFoodId(id: string): boolean {
  return id.startsWith("food-");
}

/**
 * Une listas por id. Extras ganham (pessoais / updates),
 * e alimentos pessoais aparecem primeiro na lista.
 */
export function mergeFoodLists(base: Food[], extras: Food[]): Food[] {
  const byId = new Map<string, Food>();
  for (const f of base) {
    if (f?.id) byId.set(f.id, f);
  }
  for (const f of extras) {
    if (f?.id) byId.set(f.id, f);
  }
  return Array.from(byId.values()).sort((a, b) => {
    if (a.is_global !== b.is_global) return a.is_global ? 1 : -1;
    return a.name.localeCompare(b.name, "pt");
  });
}

/** Pessoais em `current` que ainda não existem em `remote` (por id). */
export function personalNotInRemote(current: Food[], remote: Food[]): Food[] {
  const remoteIds = new Set(remote.map((f) => f.id));
  return current.filter((f) => f && !f.is_global && !remoteIds.has(f.id));
}

/** Lê pessoais guardados no localStorage (v6…v3) sem depender do estado Zustand. */
export function readPersistedPersonalFoods(): Food[] {
  if (typeof window === "undefined") return [];
  const keys = [
    KETO_PERSIST_KEY,
    "ketotrack-v5",
    "ketotrack-v4",
    "ketotrack-v3",
  ] as const;
  const collected: Food[] = [];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { state?: { foods?: Food[] } };
      for (const f of parsed.state?.foods ?? []) {
        if (f && !f.is_global) collected.push(f);
      }
    } catch {
      // tenta a chave seguinte
    }
  }
  return mergeFoodLists([], collected);
}

/**
 * Actualiza só a lista de pessoais no blob Zustand já existente.
 * Não cria blob incompleto (evita wipe de dailyLogs/etc.).
 */
export function flushPersonalFoodsToStorage(foods: Food[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KETO_PERSIST_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      state?: Record<string, unknown>;
      version?: number;
    };
    if (!parsed.state || typeof parsed.state !== "object") return;
    parsed.state = {
      ...parsed.state,
      foods: foods.filter((f) => f && !f.is_global),
    };
    window.localStorage.setItem(KETO_PERSIST_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota / private mode
  }
}
