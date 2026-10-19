"use client";

import { useEffect, useRef } from "react";
import { useKetoStore } from "@/store/keto-store";

export function StoreBootstrap() {
  const initRemote = useKetoStore((s) => s.initRemote);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    useKetoStore.setState({ hydrated: true });

    const run = async () => {
      try {
        await Promise.resolve(useKetoStore.persist.rehydrate());
      } catch {
        // ignore rehydrate errors
      }
      await initRemote();
    };
    void run();
  }, [initRemote]);

  return null;
}
