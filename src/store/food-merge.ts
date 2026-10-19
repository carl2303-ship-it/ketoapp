import type { Food } from "@/lib/types";

export const LOCAL_USER_ID = "local-demo-user";

export function isLocalFoodId(id: string): boolean {
  return id.startsWith("food-");
}

/** Une listas por id sem perder alimentos pessoais locais. */
export function mergeFoodLists(base: Food[], extras: Food[]): Food[] {
  const byId = new Map<string, Food>();
  for (const f of base) byId.set(f.id, f);
  for (const f of extras) {
    if (!byId.has(f.id)) byId.set(f.id, f);
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pt"),
  );
}
