import type { Food, MacroTotals, MealEntry, Profile } from "@/lib/types";

export function netCarbs(food: Pick<Food, "carbs_total_g" | "fiber_g" | "polyols_g">): number {
  return Math.max(0, food.carbs_total_g - food.fiber_g - food.polyols_g);
}

export function scaleFood(food: Food, grams: number): MacroTotals {
  const factor = grams / 100;
  const carbs = food.carbs_total_g * factor;
  const fiber = food.fiber_g * factor;
  const polyols = food.polyols_g * factor;
  return {
    calories: food.calories * factor,
    fat_g: food.fat_g * factor,
    protein_g: food.protein_g * factor,
    carbs_total_g: carbs,
    fiber_g: fiber,
    polyols_g: polyols,
    net_carbs_g: Math.max(0, carbs - fiber - polyols),
    sodium_mg: food.sodium_mg * factor,
    potassium_mg: food.potassium_mg * factor,
    magnesium_mg: food.magnesium_mg * factor,
  };
}

export function emptyTotals(): MacroTotals {
  return {
    calories: 0,
    fat_g: 0,
    protein_g: 0,
    carbs_total_g: 0,
    fiber_g: 0,
    polyols_g: 0,
    net_carbs_g: 0,
    sodium_mg: 0,
    potassium_mg: 0,
    magnesium_mg: 0,
  };
}

export function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    fat_g: a.fat_g + b.fat_g,
    protein_g: a.protein_g + b.protein_g,
    carbs_total_g: a.carbs_total_g + b.carbs_total_g,
    fiber_g: a.fiber_g + b.fiber_g,
    polyols_g: a.polyols_g + b.polyols_g,
    net_carbs_g: a.net_carbs_g + b.net_carbs_g,
    sodium_mg: a.sodium_mg + b.sodium_mg,
    potassium_mg: a.potassium_mg + b.potassium_mg,
    magnesium_mg: a.magnesium_mg + b.magnesium_mg,
  };
}

/** Totais do diário. Carbs TKD não contam para o alerta de net carbs. */
export function totalsFromEntries(
  entries: MealEntry[],
  foodsById: Map<string, Food>,
  opts?: { excludeTkdFromNetCarbs?: boolean },
): MacroTotals {
  const excludeTkd = opts?.excludeTkdFromNetCarbs ?? true;
  return entries.reduce((acc, entry) => {
    if (!entry.food_id) return acc;
    const food = foodsById.get(entry.food_id);
    if (!food) return acc;
    const scaled = scaleFood(food, entry.amount_grams);
    if (excludeTkd && entry.is_tkd_workout_carb) {
      return addTotals(acc, { ...scaled, net_carbs_g: 0 });
    }
    return addTotals(acc, scaled);
  }, emptyTotals());
}

export function macroPercentages(totals: MacroTotals) {
  const fatKcal = totals.fat_g * 9;
  const proteinKcal = totals.protein_g * 4;
  const carbKcal = totals.net_carbs_g * 4;
  const total = fatKcal + proteinKcal + carbKcal || 1;
  return {
    fat: (fatKcal / total) * 100,
    protein: (proteinKcal / total) * 100,
    netCarbs: (carbKcal / total) * 100,
  };
}

export function remainingTargets(profile: Profile, totals: MacroTotals) {
  return {
    calories: profile.daily_calories_target - totals.calories,
    netCarbs: profile.net_carb_target_g - totals.net_carbs_g,
    sodium: profile.sodium_target_mg - totals.sodium_mg,
  };
}

export function gki(ketonesMmol: number, glucoseMgDl: number): number | null {
  if (ketonesMmol <= 0 || glucoseMgDl <= 0) return null;
  const glucoseMmol = glucoseMgDl / 18;
  return glucoseMmol / ketonesMmol;
}

export function formatNum(n: number, digits = 0): string {
  return n.toLocaleString("pt-PT", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

/** Linha de macros por 100 g — G / P / F / NC (fibras sempre visíveis). */
export function foodPer100gLine(
  food: Pick<Food, "fat_g" | "protein_g" | "fiber_g" | "carbs_total_g" | "polyols_g">,
): string {
  return `G ${formatNum(food.fat_g, 1)} · P ${formatNum(food.protein_g, 1)} · F ${formatNum(food.fiber_g, 1)} · NC ${formatNum(netCarbs(food), 1)} g`;
}

/** Etiqueta curta para selects: fibras + net carbs por 100 g. */
export function foodSelectSuffix(
  food: Pick<Food, "fiber_g" | "carbs_total_g" | "polyols_g">,
): string {
  return `F ${formatNum(food.fiber_g, 1)} · ${formatNum(netCarbs(food), 1)}g NC/100g`;
}

/** Resumo de porção (kcal + fibras + NC). */
export function portionMacroLine(
  macros: Pick<MacroTotals, "calories" | "fiber_g" | "net_carbs_g">,
): string {
  return `${formatNum(macros.calories)} kcal · F ${formatNum(macros.fiber_g, 1)} g · ${formatNum(macros.net_carbs_g, 1)} g NC`;
}
