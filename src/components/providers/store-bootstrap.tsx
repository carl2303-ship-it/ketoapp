"use client";

import { useEffect } from "react";
import { useKetoStore } from "@/store/keto-store";

export function StoreBootstrap() {
  const hydrated = useKetoStore((s) => s.hydrated);
  const initRemote = useKetoStore((s) => s.initRemote);
  const setHydrated = useKetoStore((s) => s.setHydrated);

  useEffect(() => {
    // persist may already hydrate; ensure flag for SSR
    if (!hydrated) {
      const t = window.setTimeout(() => setHydrated(true), 50);
      return () => window.clearTimeout(t);
    }
  }, [hydrated, setHydrated]);

  useEffect(() => {
    void initRemote();
  }, [initRemote]);

  return null;
}
