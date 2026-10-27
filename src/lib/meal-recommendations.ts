import type { Food, MacroTotals, MealEntry, MealType, Profile } from "@/lib/types";
import { MEAL_LABELS, MEAL_TYPES } from "@/lib/types";
import {
  addTotals,
  emptyTotals,
  scaleFood,
  totalsFromEntries,
} from "@/lib/macros";
import { fatTargetG, proteinTargetG } from "@/lib/goal-status";

export interface RemainingMacros {
  calories: number;
  fat_g: number;
  protein_g: number;
  net_carbs_g: number;
}

export interface MealSuggestionItem {
  food: Food;
  amount_grams: number;
  macros: MacroTotals;
}

export interface MealSuggestion {
  meal_type: MealType;
  label: string;
  items: MealSuggestionItem[];
  totals: MacroTotals;
  rationale: string;
}

function remainingFromProfile(
  profile: Profile,
  totals: MacroTotals,
): RemainingMacros {
  return {
    calories: Math.max(0, profile.daily_calories_target - totals.calories),
    fat_g: Math.max(0, fatTargetG(profile) - totals.fat_g),
    protein_g: Math.max(0, proteinTargetG(profile) - totals.protein_g),
    net_carbs_g: Math.max(0, profile.net_carb_target_g - totals.net_carbs_g),
  };
}

function scoreFood(food: Food, remaining: RemainingMacros): number {
  const nc = Math.max(
    0,
    food.carbs_total_g - food.fiber_g - food.polyols_g,
  );
  // Preferir alto gordura, proteína útil, net carbs baixos.
  let score = food.fat_g * 2 + food.protein_g * 1.2 - nc * 4;
  if (nc > 8) score -= 20;
  if (remaining.net_carbs_g < 5 && nc > 3) score -= 30;
  if (remaining.fat_g > 20 && food.fat_g > 40) score += 15;
  if (remaining.protein_g > 25 && food.protein_g > 15) score += 12;
  if (food.category === "Gorduras") score += 4;
  if (food.category === "Proteínas") score += 3;
  if (food.category === "Vegetais") score += 2;
  return score;
}

function portionForBudget(
  food: Food,
  remaining: RemainingMacros,
  mealShare: number,
): number {
  const nc = Math.max(
    0,
    food.carbs_total_g - food.fiber_g - food.polyols_g,
  );
  const calBudget = Math.max(80, remaining.calories * mealShare);
  const fatBudget = Math.max(5, remaining.fat_g * mealShare);
  const proteinBudget = Math.max(5, remaining.protein_g * mealShare);
  const ncBudget = Math.max(0.5, remaining.net_carbs_g * mealShare);

  const byCal = food.calories > 0 ? (calBudget / food.calories) * 100 : 200;
  const byFat = food.fat_g > 0 ? (fatBudget / food.fat_g) * 100 : 200;
  const byProtein =
    food.protein_g > 0 ? (proteinBudget / food.protein_g) * 100 : 200;
  const byNc = nc > 0.1 ? (ncBudget / nc) * 100 : 250;

  let grams = Math.min(byCal, byFat * 1.4, byProtein * 1.6, byNc, 250);
  grams = Math.max(15, Math.round(grams / 5) * 5);

  // Óleos / manteiga: porções menores
  if (food.fat_g >= 80) grams = Math.min(grams, 25);
  // Vegetais: porções generosas se NC permitir
  if (food.category === "Vegetais") grams = Math.max(grams, 80);

  return grams;
}

function buildMealItems(
  foods: Food[],
  remaining: RemainingMacros,
  slots: number,
): MealSuggestionItem[] {
  const ranked = [...foods]
    .filter((f) => {
      const nc = Math.max(0, f.carbs_total_g - f.fiber_g - f.polyols_g);
      return nc <= 12 || f.category === "Vegetais";
    })
    .sort((a, b) => scoreFood(b, remaining) - scoreFood(a, remaining));

  const picked: MealSuggestionItem[] = [];
  const usedCategories = new Set<string>();
  const budget = { ...remaining };
  const share = 1 / Math.max(slots, 1);

  for (const food of ranked) {
    if (picked.length >= slots) break;
    const cat = food.category ?? food.id;
    // Diversificar categorias quando possível
    if (picked.length > 0 && usedCategories.has(cat) && ranked.length > 8) {
      continue;
    }
    const grams = portionForBudget(food, budget, share);
    const macros = scaleFood(food, grams);
    if (macros.net_carbs_g > budget.net_carbs_g + 1) continue;
    if (macros.calories > budget.calories + 80) continue;

    picked.push({ food, amount_grams: grams, macros });
    usedCategories.add(cat);
    budget.calories = Math.max(0, budget.calories - macros.calories);
    budget.fat_g = Math.max(0, budget.fat_g - macros.fat_g);
    budget.protein_g = Math.max(0, budget.protein_g - macros.protein_g);
    budget.net_carbs_g = Math.max(0, budget.net_carbs_g - macros.net_carbs_g);
  }

  return picked;
}

/**
 * Sugere refeições restantes com base nos macros que faltam face às metas.
 * Tipicamente jantar (+ lanche/ceia) depois de PA + almoço registados.
 */
export function suggestRemainingMeals(
  entries: MealEntry[],
  foods: Food[],
  profile: Profile,
): MealSuggestion[] {
  if (foods.length === 0) return [];

  const foodsById = new Map(foods.map((f) => [f.id, f]));
  const totals = totalsFromEntries(entries, foodsById);
  const remaining = remainingFromProfile(profile, totals);

  if (
    remaining.calories < 80 &&
    remaining.fat_g < 8 &&
    remaining.protein_g < 8
  ) {
    return [];
  }

  const logged = new Set(entries.map((e) => e.meal_type));
  const emptyMeals = MEAL_TYPES.filter((m) => !logged.has(m));

  // Activar quando PA + almoço estão feitos, ou quando falta ≥1 refeição
  // principal e já há pelo menos uma refeição registada.
  const hasBreakfast = logged.has("pequeno_almoco");
  const hasLunch = logged.has("almoco");
  const ready =
    (hasBreakfast && hasLunch && emptyMeals.length > 0) ||
    (logged.size >= 1 && emptyMeals.includes("jantar"));

  if (!ready || emptyMeals.length === 0) return [];

  // Priorizar jantar, depois lanche/ceia
  const order: MealType[] = ["jantar", "lanche", "ceia", "pequeno_almoco", "almoco"];
  const targets = order.filter((m) => emptyMeals.includes(m));

  const suggestions: MealSuggestion[] = [];
  let budget = { ...remaining };
  const mealCount = Math.max(targets.length, 1);

  for (let i = 0; i < targets.length; i++) {
    const meal = targets[i]!;
    const share = 1 / (mealCount - i);
    const mealBudget: RemainingMacros = {
      calories: budget.calories * share,
      fat_g: budget.fat_g * share,
      protein_g: budget.protein_g * share,
      net_carbs_g: budget.net_carbs_g * share,
    };

    const slots = meal === "jantar" ? 3 : meal === "lanche" ? 2 : 2;
    const items = buildMealItems(foods, mealBudget, slots);
    if (items.length === 0) continue;

    const mealTotals = items.reduce(
      (acc, item) => addTotals(acc, item.macros),
      emptyTotals(),
    );

    suggestions.push({
      meal_type: meal,
      label: MEAL_LABELS[meal],
      items,
      totals: mealTotals,
      rationale: `Encaixa ~${Math.round(mealTotals.calories)} kcal restantes · NC ${mealTotals.net_carbs_g.toFixed(1)} g · G ${mealTotals.fat_g.toFixed(0)} g · P ${mealTotals.protein_g.toFixed(0)} g`,
    });

    budget = {
      calories: Math.max(0, budget.calories - mealTotals.calories),
      fat_g: Math.max(0, budget.fat_g - mealTotals.fat_g),
      protein_g: Math.max(0, budget.protein_g - mealTotals.protein_g),
      net_carbs_g: Math.max(0, budget.net_carbs_g - mealTotals.net_carbs_g),
    };
  }

  return suggestions;
}
