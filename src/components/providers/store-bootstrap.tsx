"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { useKetoStore } from "@/store/keto-store";
import { migrateLegacyKetoPersist } from "@/store/persist-migrate";

/** Lock a nível de módulo — sobrevive ao double-mount do React Strict Mode. */
let bootstrapPromise: Promise<void> | null = null;

async function bootstrapStore(): Promise<void> {
  migrateLegacyKetoPersist();
  try {
    await useKetoStore.persist.rehydrate();
  } catch {
    // ignore rehydrate errors — continua com seed
  }

  const selectedDate = useKetoStore.getState().selectedDate;
  if (!selectedDate || selectedDate === "2020-01-01") {
    useKetoStore.setState({
      selectedDate: format(new Date(), "yyyy-MM-dd"),
    });
  }

  try {
    await useKetoStore.getState().initRemote();
  } catch {
    // initRemote já faz fallback mock internamente
  }

  useKetoStore.setState({ hydrated: true });
}

/**
 * Ordem crítica (evita flash + React #418):
 * 1) Migrar localStorage legado
 * 2) rehydrate (skipHydration) — traz alimentos pessoais
 * 3) initRemote — merge com seed/Supabase sem wipe
 * 4) só depois hydrated=true — UI deixa de mostrar skeleton
 */
export function StoreBootstrap() {
  useEffect(() => {
    if (!bootstrapPromise) {
      bootstrapPromise = bootstrapStore();
    }
    void bootstrapPromise;
  }, []);

  return null;
}
