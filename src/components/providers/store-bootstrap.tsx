"use client";

import { useEffect } from "react";
import { useKetoStore } from "@/store/keto-store";

export function StoreBootstrap() {
  const initRemote = useKetoStore((s) => s.initRemote);

  useEffect(() => {
    // Mark client as ready even if persist rehydrate is slow/empty.
    useKetoStore.setState({ hydrated: true });
    void useKetoStore.persist.rehydrate();
    void initRemote();
  }, [initRemote]);

  return null;
}
