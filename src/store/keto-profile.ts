"use client";

import type { Profile } from "@/lib/types";
import { LOCAL_USER_ID } from "@/store/food-merge";

export const defaultProfile: Profile = {
  id: LOCAL_USER_ID,
  email: null,
  daily_calories_target: 2000,
  fat_ratio: 75,
  protein_ratio: 20,
  net_carb_target_g: 25,
  water_target_l: 3,
  sodium_target_mg: 5000,
  potassium_target_mg: 3500,
  magnesium_target_mg: 400,
  keto_variation: "skd",
};

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
