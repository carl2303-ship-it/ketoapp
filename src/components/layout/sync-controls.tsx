"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKetoStore } from "@/store/keto-store";

/** Botão «Sincronizar agora» — só com sessão activa. */
export function SyncNowButton() {
  const authUserId = useKetoStore((s) => s.authUserId);
  const supabaseReady = useKetoStore((s) => s.supabaseReady);
  const syncing = useKetoStore((s) => s.syncing);
  const syncNow = useKetoStore((s) => s.syncNow);
  const [pending, startTransition] = useTransition();

  if (!supabaseReady || !authUserId) return null;

  const busy = syncing || pending;

  return (
    <Button
      variant="outline"
      size="sm"
      className="inline-flex"
      disabled={busy}
      title="Sincronizar agora com o Supabase"
      aria-label="Sincronizar agora"
      onClick={() => {
        startTransition(async () => {
          await syncNow();
        });
      }}
    >
      <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{busy ? "A sync…" : "Sync"}</span>
    </Button>
  );
}

/** Toast/banner leve para erros e sucesso de sync. */
export function SyncStatusBanner() {
  const syncStatus = useKetoStore((s) => s.syncStatus);
  const clearSyncStatus = useKetoStore((s) => s.clearSyncStatus);

  if (!syncStatus) return null;

  const tone =
    syncStatus.type === "error"
      ? "border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-amber-100"
      : syncStatus.type === "ok"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
        : "border-border/60 bg-muted/80 text-foreground";

  return (
    <div
      className={`flex items-center justify-center gap-3 border-b px-4 py-2 text-center text-xs ${tone}`}
      role="status"
      aria-live="polite"
    >
      <p className="min-w-0 flex-1">{syncStatus.message}</p>
      <button
        type="button"
        className="shrink-0 underline-offset-2 hover:underline"
        onClick={() => clearSyncStatus()}
      >
        Fechar
      </button>
    </div>
  );
}
