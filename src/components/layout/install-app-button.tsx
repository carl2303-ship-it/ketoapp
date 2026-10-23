"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua);
  return iOS && webkit && notOther;
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIosHint(isIosSafari() && !isStandalone());

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore — install UI still works via browser menu on some devices */
      });
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function installChrome() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  }

  if (deferred) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2"
        disabled={busy}
        onClick={installChrome}
        aria-label="Instalar aplicação"
      >
        <Download className="size-3.5" />
        <span className="hidden sm:inline">Instalar</span>
      </Button>
    );
  }

  if (iosHint) {
    return (
      <Dialog>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2"
              aria-label="Como instalar a aplicação"
            />
          }
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Instalar</span>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar KetoTrack no iPhone</DialogTitle>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Toca em{" "}
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Share className="size-3.5" /> Partilhar
              </span>{" "}
              na barra do Safari.
            </li>
            <li>
              Escolhe{" "}
              <span className="font-medium text-foreground">
                Adicionar ao ecrã principal
              </span>
              .
            </li>
            <li>
              Confirma com{" "}
              <span className="font-medium text-foreground">Adicionar</span>.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Tem de ser no Safari (não na app Instagram/Chrome embutido). Depois a
            app abre em ecrã cheio, como uma app nativa.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  // Android/desktop Chrome may delay beforeinstallprompt — still offer help.
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2"
            aria-label="Como instalar a aplicação"
          />
        }
      >
        <Download className="size-3.5" />
        <span className="hidden sm:inline">Instalar</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Instalar KetoTrack</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            No telemóvel (Chrome/Edge), abre o menu{" "}
            <span className="font-medium text-foreground">⋮</span> e escolhe{" "}
            <span className="font-medium text-foreground">
              Instalar aplicação
            </span>{" "}
            ou{" "}
            <span className="font-medium text-foreground">
              Adicionar ao ecrã principal
            </span>
            .
          </p>
          <p>
            No computador, usa o ícone de instalação na barra de endereço, ou o
            menu do browser → Instalar KetoTrack.
          </p>
          <p className="text-xs">
            Site:{" "}
            <a
              className="text-emerald-600 underline dark:text-emerald-400"
              href="https://ketogenic-app.netlify.app/"
            >
              ketogenic-app.netlify.app
            </a>
            . Tem de ser HTTPS (já está no Netlify).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
