import type {
  DailyLog,
  Food,
  MealEntry,
  MealType,
  Profile,
  WeeklyPlan,
} from "@/lib/types";

export interface KetoState {
  hydrated: boolean;
  /** True only when foods cannot be loaded from Supabase. */
  usingMock: boolean;
  supabaseReady: boolean | null;
  schemaMissing: boolean;
  /** Authenticated user id, or null if browsing anonymously. */
  authUserId: string | null;
  authEmail: string | null;
  authError: string | null;
  profile: Profile;
  foods: Food[];
  dailyLogs: DailyLog[];
  mealEntries: MealEntry[];
  weeklyPlans: WeeklyPlan[];
  selectedDate: string;
  searchQuery: string;
  categoryFilter: string;
  setHydrated: (v: boolean) => void;
  setSelectedDate: (date: string) => void;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: string) => void;
  initRemote: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  ensureDailyLog: (date?: string) => string;
  addMealEntry: (input: {
    meal_type: MealType;
    food_id: string;
    amount_grams: number;
    is_tkd_workout_carb?: boolean;
    date?: string;
  }) => Promise<void>;
  removeMealEntry: (id: string) => Promise<void>;
  addFood: (
    food: Omit<Food, "id" | "user_id" | "is_global">,
  ) => Promise<{ ok: boolean; synced: boolean; error?: string; warning?: string }>;
  updateFood: (
    id: string,
    food: Omit<Food, "id" | "user_id" | "is_global">,
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteFood: (id: string) => Promise<{ ok: boolean; error?: string }>;
  canMutateFood: (food: Food) => boolean;
  updateWater: (ml: number, date?: string) => Promise<void>;
  updateBiometrics: (input: {
    blood_ketones?: number | null;
    blood_glucose?: number | null;
    date?: string;
  }) => Promise<void>;
  addWeeklyPlan: (input: {
    day_of_week: number;
    meal_type: MealType;
    food_id: string;
    amount_grams: number;
  }) => Promise<void>;
  removeWeeklyPlan: (id: string) => Promise<void>;
  copyDay: (fromDay: number, toDay: number) => Promise<void>;
  getLogForDate: (date?: string) => DailyLog | undefined;
  getEntriesForDate: (date?: string) => MealEntry[];
  getPlansForDay: (day: number) => WeeklyPlan[];
}

export type KetoSet = (
  partial: Partial<KetoState> | ((s: KetoState) => Partial<KetoState>),
) => void;
export type KetoGet = () => KetoState;
