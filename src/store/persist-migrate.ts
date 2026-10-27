"use client";

const CURRENT_KEY = "ketotrack-v6";
const LEGACY_PERSIST_KEYS = [
  "ketotrack-v5",
  "ketotrack-v4",
  "ketotrack-v3",
  "ketotrack-v2",
] as const;

/** Copia estado de chaves antigas para v6 (uma vez) antes do rehydrate. */
export function migrateLegacyKetoPersist(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(CURRENT_KEY)) return;
    for (const key of LEGACY_PERSIST_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      window.localStorage.setItem(CURRENT_KEY, raw);
      return;
    }
  } catch {
    // ignore quota / private mode
  }
}

export const KETO_PERSIST_KEY = CURRENT_KEY;
