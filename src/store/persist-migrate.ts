const LEGACY_PERSIST_KEYS = ["ketotrack-v3", "ketotrack-v2"] as const;

/** Copia estado de chaves antigas para v4 (uma vez) antes do rehydrate. */
export function migrateLegacyKetoPersist(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem("ketotrack-v4")) return;
    for (const key of LEGACY_PERSIST_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      window.localStorage.setItem("ketotrack-v4", raw);
      return;
    }
  } catch {
    // ignore quota / private mode
  }
}
