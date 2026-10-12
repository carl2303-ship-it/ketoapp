"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Apple,
  CalendarDays,
  Droplets,
  LayoutDashboard,
  NotebookPen,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useKetoStore } from "@/store/keto-store";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/diario", label: "Diário", icon: NotebookPen },
  { href: "/alimentos", label: "Alimentos", icon: Apple },
  { href: "/plano", label: "Plano", icon: CalendarDays },
  { href: "/receitas", label: "Receitas", icon: UtensilsCrossed },
  { href: "/eletrolitos", label: "Eletrólitos", icon: Droplets },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const usingMock = useKetoStore((s) => s.usingMock);
  const schemaMissing = useKetoStore((s) => s.schemaMissing);
  const supabaseReady = useKetoStore((s) => s.supabaseReady);

  return (
    <div className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_oklch(0.45_0.12_160/_0.22),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_oklch(0.35_0.08_200/_0.18),_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.35_0.1_160/_0.35),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_oklch(0.25_0.06_200/_0.3),_transparent_45%)]"
      />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="group flex items-baseline gap-2">
            <span className="font-heading text-xl font-semibold tracking-tight text-emerald-600 transition-colors group-hover:text-emerald-500 dark:text-emerald-400">
              KetoTrack
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              & Plan
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {usingMock ? (
              <Badge variant="secondary" className="max-w-[9rem] truncate text-[10px] sm:max-w-none">
                {schemaMissing ? "Mock · schema em falta" : "Modo mock"}
              </Badge>
            ) : supabaseReady ? (
              <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">
                Supabase
              </Badge>
            ) : null}
            <ThemeToggle />
          </div>
        </div>

        {schemaMissing ? (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-200">
            Credenciais OK, mas as tabelas ainda não existem. Corre{" "}
            <code className="rounded bg-background/60 px-1">
              supabase/migrations/20260312173000_initial_schema.sql
            </code>{" "}
            no SQL Editor do projeto.
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:pb-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-md md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-6 gap-0.5 px-1 py-1.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px]",
                    active
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
