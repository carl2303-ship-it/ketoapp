"use client";

import { useState, useTransition } from "react";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKetoStore } from "@/store/keto-store";

export function AuthDialog() {
  const authEmail = useKetoStore((s) => s.authEmail);
  const authError = useKetoStore((s) => s.authError);
  const signIn = useKetoStore((s) => s.signIn);
  const signOut = useKetoStore((s) => s.signOut);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  if (authEmail) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="hidden max-w-[10rem] truncate sm:inline-flex"
        onClick={() => void signOut()}
        title={authEmail}
      >
        <LogOut className="size-3.5" />
        Sair
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="hidden sm:inline-flex" />}
      >
        <LogIn className="size-3.5" />
        Entrar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entrar no Supabase</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Os alimentos globais já vêm da BD. Login é necessário para sincronizar
          diário, plano e alimentos pessoais (RLS).
        </p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const ok = await signIn(email, password);
              if (ok) setOpen(false);
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {authError ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">{authError}</p>
          ) : null}
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-emerald-600 hover:bg-emerald-500"
          >
            {pending ? "A entrar…" : "Entrar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
