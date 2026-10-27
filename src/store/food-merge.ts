"use client";

import type { Food } from "@/lib/types";

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

/** Lê pessoais guardados no localStorage (v4/v5) sem depender do estado Zustand. */
export function readPersistedPersonalFoods(): Food[] {
  if (typeof window === "undefined") return [];
  const keys = ["ketotrack-v5", "ketotrack-v4", "ketotrack-v3"] as const;
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { state?: { foods?: Food[] } };
      return (parsed.state?.foods ?? []).filter((f) => f && !f.is_global);
    } catch {
      // tenta a chave seguinte
    }
  }
  return [];
}
