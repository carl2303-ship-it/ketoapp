"use client";

import { useMemo } from "react";
import type { DailyLog, MealEntry } from "@/lib/types";
import { useKetoStore } from "@/store/keto-store";

/**
 * Entradas do diário com dependências reactivas.
 * NÃO uses getEntriesForDate() directamente nos componentes —
 * a referência da função é estável e o React/Zustand não re-renderiza.
 */
export function useEntriesForDate(date?: string): MealEntry[] {
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const dailyLogs = useKetoStore((s) => s.dailyLogs);
  const mealEntries = useKetoStore((s) => s.mealEntries);
  const d = date ?? selectedDate;

  return useMemo(() => {
    const log = dailyLogs.find((l) => l.date === d);
    if (!log) return [];
    return mealEntries.filter((e) => e.daily_log_id === log.id);
  }, [dailyLogs, mealEntries, d]);
}

export function useLogForDate(date?: string): DailyLog | undefined {
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const dailyLogs = useKetoStore((s) => s.dailyLogs);
  const d = date ?? selectedDate;
  return useMemo(() => dailyLogs.find((l) => l.date === d), [dailyLogs, d]);
}

/** Mapa id→food sempre fresco quando a lista muda. */
export function useFoodsById() {
  const foods = useKetoStore((s) => s.foods);
  return useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
}
