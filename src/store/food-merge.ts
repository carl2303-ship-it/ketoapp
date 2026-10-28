"use client";

import type { Food } from "@/lib/types";
import { KETO_PERSIST_KEY } from "@/store/persist-migrate";

export const LOCAL_USER_ID = "local-demo-user";

export function isLocalFoodId(id: string): boolean {
  return id.startsWith("food-");
}

export function foodKey(f: Pick<Food, "name" | "brand">): string {
  return `${f.name.trim().toLowerCase()}|${(f.brand ?? "").trim().toLowerCase()}`;
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

/**
 * Une listas por id e colapsa duplicados nome|marca.
 * Preferência: UUID remoto > local food-*; is_global partilhado.
 */
export function mergeFoodLists(base: Food[], extras: Food[]): Food[] {
  const byId = new Map<string, Food>();
  for (const f of base) {
    if (f?.id) byId.set(f.id, f);
  }
  for (const f of extras) {
    if (f?.id) byId.set(f.id, f);
  }

  const byKey = new Map<string, Food>();
  for (const f of byId.values()) {
    const key = foodKey(f);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, f);
      continue;
    }
    const prefer =
      (isUuid(f.id) && !isUuid(prev.id)) ||
      (isUuid(f.id) === isUuid(prev.id) && f.is_global && !prev.is_global) ||
      (isUuid(f.id) === isUuid(prev.id) &&
        f.is_global === prev.is_global &&
        f.id < prev.id)
        ? f
        : prev;
    byKey.set(key, prefer);
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pt"),
  );
}

/** Rascunhos locais (ainda sem UUID) que ainda não existem no remoto. */
export function localDraftsNotInRemote(
  current: Food[],
  remote: Food[],
): Food[] {
  const remoteKeys = new Set(remote.map(foodKey));
  const remoteIds = new Set(remote.map((f) => f.id));
  return current.filter(
    (f) =>
      f &&
      (isLocalFoodId(f.id) || !isUuid(f.id)) &&
      !remoteIds.has(f.id) &&
      !remoteKeys.has(foodKey(f)),
  );
}

/** @deprecated use localDraftsNotInRemote — mantido para imports antigos */
export function personalNotInRemote(current: Food[], remote: Food[]): Food[] {
  return localDraftsNotInRemote(current, remote);
}

/** Lê rascunhos locais guardados no localStorage (v6…v3). */
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
        if (f && (isLocalFoodId(f.id) || !f.is_global)) collected.push(f);
      }
    } catch {
      // tenta a chave seguinte
    }
  }
  return mergeFoodLists([], collected);
}

/**
 * Actualiza só rascunhos locais (food-*) no blob Zustand já existente.
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
      foods: foods.filter((f) => f && isLocalFoodId(f.id)),
    };
    window.localStorage.setItem(KETO_PERSIST_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota / private mode
  }
}
