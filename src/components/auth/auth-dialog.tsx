"use client";

import { useState, useTransition } from "react";
import { ChevronDown, LogIn, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKetoStore } from "@/store/keto-store";

type Mode = "signin" | "signup";

/**
 * Conta autenticada — «Sair» sempre visível no header (mobile + desktop + PWA).
 * O menu dá contexto; o botão Sair directo evita esconder a acção.
 */
function AccountMenu() {
  const authEmail = useKetoStore((s) => s.authEmail);
  const signOut = useKetoStore((s) => s.signOut);
  const [pending, startTransition] = useTransition();

  const doSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="inline-flex max-w-[7.5rem] gap-1 sm:max-w-[10rem]"
              aria-label="Menu da conta"
            />
          }
        >
          <span className="truncate text-xs sm:text-[0.8rem]">
            {authEmail?.split("@")[0] || "Conta"}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="space-y-0.5 font-normal">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                Sessão activa
              </span>
              <span className="block truncate text-sm font-medium text-foreground">
                {authEmail}
              </span>
              <span className="block pt-1 text-[11px] font-normal text-muted-foreground">
                Sync telemóvel ↔ PC ligado. «Sair» encerra só a sessão — a app
                PWA continua instalada.
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              className="cursor-pointer py-2.5 text-sm font-medium"
              onClick={doSignOut}
            >
              <LogOut className="size-4" />
              {pending ? "A sair…" : "Sair da conta"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="destructive"
        size="sm"
        className="inline-flex shrink-0"
        disabled={pending}
        onClick={doSignOut}
        aria-label="Sair da conta"
        title="Sair da conta (não desinstala a PWA)"
      >
        <LogOut className="size-3.5" />
        <span>Sair</span>
      </Button>
    </div>
  );
}

export function AuthDialog() {
  const authEmail = useKetoStore((s) => s.authEmail);
  const authError = useKetoStore((s) => s.authError);
  const authDialogOpen = useKetoStore((s) => s.authDialogOpen);
  const setAuthDialogOpen = useKetoStore((s) => s.setAuthDialogOpen);
  const signIn = useKetoStore((s) => s.signIn);
  const signUp = useKetoStore((s) => s.signUp);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  if (authEmail) {
    return <AccountMenu />;
  }

  return (
    <Dialog
      open={authDialogOpen}
      onOpenChange={(open) => {
        setAuthDialogOpen(open);
        if (!open) useKetoStore.setState({ authError: null });
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="inline-flex" />
        }
      >
        <LogIn className="size-3.5" />
        Entrar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "signin" ? "Entrar para sincronizar" : "Criar conta"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Sem login, alimentos pessoais, diário e plano ficam só neste
          dispositivo. Com a mesma conta no telemóvel e no PC, o Supabase
          sincroniza tudo (RLS).
        </p>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            className={
              mode === "signin"
                ? "rounded-md bg-background px-2 py-1.5 text-xs font-medium shadow-sm"
                : "rounded-md px-2 py-1.5 text-xs text-muted-foreground"
            }
            onClick={() => {
              setMode("signin");
              useKetoStore.setState({ authError: null });
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={
              mode === "signup"
                ? "rounded-md bg-background px-2 py-1.5 text-xs font-medium shadow-sm"
                : "rounded-md px-2 py-1.5 text-xs text-muted-foreground"
            }
            onClick={() => {
              setMode("signup");
              useKetoStore.setState({ authError: null });
            }}
          >
            Criar conta
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const ok =
                mode === "signin"
                  ? await signIn(email, password)
                  : await signUp(email, password);
              if (ok) setAuthDialogOpen(false);
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {authError ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {authError}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-emerald-600 hover:bg-emerald-500"
          >
            {pending
              ? mode === "signin"
                ? "A entrar…"
                : "A criar…"
              : mode === "signin"
                ? "Entrar e sincronizar"
                : "Criar conta e sincronizar"}
          </Button>
        </form>

        {mode === "signin" ? (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setMode("signup");
              useKetoStore.setState({ authError: null });
            }}
          >
            <UserPlus className="size-3.5" />
            Ainda não tens conta? Cria uma
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
