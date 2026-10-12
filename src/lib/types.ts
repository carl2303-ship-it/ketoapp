export type MealType =
  | "pequeno_almoco"
  | "almoco"
  | "lanche"
  | "jantar"
  | "ceia";

export type KetoVariation = "skd" | "high_protein" | "tkd";

export interface Profile {
  id: string;
  email: string | null;
  daily_calories_target: number;
  fat_ratio: number;
  protein_ratio: number;
  net_carb_target_g: number;
  water_target_l: number;
  sodium_target_mg: number;
  potassium_target_mg: number;
  magnesium_target_mg: number;
  keto_variation: KetoVariation;
}

export interface Food {
  id: string;
  user_id: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  calories: number;
  fat_g: number;
  protein_g: number;
  carbs_total_g: number;
  fiber_g: number;
  polyols_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  saturated_fat_g: number;
  is_global: boolean;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  instructions: string | null;
  total_macros_json: Record<string, number> | null;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  food_id: string;
  amount_grams: number;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  water_ml: number;
  blood_ketones: number | null;
  blood_glucose: number | null;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
}

export interface MealEntry {
  id: string;
  daily_log_id: string;
  meal_type: MealType;
  food_id: string | null;
  recipe_id: string | null;
  amount_grams: number;
  is_tkd_workout_carb: boolean;
}

export interface WeeklyPlan {
  id: string;
  user_id: string;
  day_of_week: number;
  meal_type: MealType;
  food_id: string;
  amount_grams: number;
}

export interface MacroTotals {
  calories: number;
  fat_g: number;
  protein_g: number;
  carbs_total_g: number;
  fiber_g: number;
  polyols_g: number;
  net_carbs_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
}

export const MEAL_LABELS: Record<MealType, string> = {
  pequeno_almoco: "Pequeno-almoço",
  almoco: "Almoço",
  lanche: "Lanche / Pré-Treino",
  jantar: "Jantar",
  ceia: "Ceia / Pós-Treino",
};

export const MEAL_TYPES: MealType[] = [
  "pequeno_almoco",
  "almoco",
  "lanche",
  "jantar",
  "ceia",
];
