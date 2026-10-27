import type { Food, MacroTotals, MealEntry, Profile } from "@/lib/types";
import { totalsFromEntries } from "@/lib/macros";

export type DayGoalStatus = "empty" | "met" | "partial" | "missed";

export interface DayGoalInfo {
  status: DayGoalStatus;
  totals: MacroTotals | null;
  hasEntries: boolean;
}

export function fatTargetG(profile: Profile): number {
  return (profile.daily_calories_target * (profile.fat_ratio / 100)) / 9;
}

export function proteinTargetG(profile: Profile): number {
  return (profile.daily_calories_target * (profile.protein_ratio / 100)) / 4;
}

/**
 * Classifica o dia face às metas keto:
 * - met: net carbs ≤ meta e calorias dentro de ±12% do alvo (com registos)
 * - missed: net carbs acima da meta OU calorias > 115% do alvo
 * - partial: há registos mas metas incompletas
 * - empty: sem refeições
 */
export function classifyDayGoal(
  entries: MealEntry[],
  foodsById: Map<string, Food>,
  profile: Profile,
): DayGoalInfo {
  if (entries.length === 0) {
    return { status: "empty", totals: null, hasEntries: false };
  }

  const totals = totalsFromEntries(entries, foodsById);
  const calTarget = profile.daily_calories_target;
  const ncTarget = profile.net_carb_target_g;

  const carbsOk = totals.net_carbs_g <= ncTarget + 0.5;
  const carbsOver = totals.net_carbs_g > ncTarget + 0.5;
  const calRatio = totals.calories / Math.max(calTarget, 1);
  const calInBand = calRatio >= 0.75 && calRatio <= 1.12;
  const calWayOver = calRatio > 1.15;

  if (carbsOver || calWayOver) {
    return { status: "missed", totals, hasEntries: true };
  }
  if (carbsOk && calInBand) {
    return { status: "met", totals, hasEntries: true };
  }
  return { status: "partial", totals, hasEntries: true };
}

export const GOAL_STATUS_LABELS: Record<DayGoalStatus, string> = {
  empty: "Sem registos",
  met: "Metas atingidas",
  partial: "Parcial",
  missed: "Fora das metas",
};

export const GOAL_STATUS_COLORS: Record<DayGoalStatus, string> = {
  empty: "bg-muted/60 text-muted-foreground border-border/50",
  met: "bg-emerald-500/25 text-emerald-800 border-emerald-500/40 dark:text-emerald-200",
  partial: "bg-amber-500/20 text-amber-900 border-amber-500/40 dark:text-amber-200",
  missed: "bg-rose-500/20 text-rose-900 border-rose-500/40 dark:text-rose-200",
};
