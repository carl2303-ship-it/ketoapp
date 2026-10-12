"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MEAL_LABELS, MEAL_TYPES } from "@/lib/types";
import { formatNum, scaleFood } from "@/lib/macros";
import { useKetoStore } from "@/store/keto-store";

export function TodaysMeals() {
  const foods = useKetoStore((s) => s.foods);
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const getEntriesForDate = useKetoStore((s) => s.getEntriesForDate);
  const removeMealEntry = useKetoStore((s) => s.removeMealEntry);
  const entries = getEntriesForDate(selectedDate);
  const foodsById = new Map(foods.map((f) => [f.id, f]));

  if (entries.length === 0) {
    return (
      <Card className="border-dashed border-border/70 bg-card/40">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Ainda sem refeições neste dia. Usa o formulário para registar o primeiro alimento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {MEAL_TYPES.map((meal) => {
        const mealEntries = entries.filter((e) => e.meal_type === meal);
        if (mealEntries.length === 0) return null;
        return (
          <Card key={meal} className="border-border/70 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{MEAL_LABELS[meal]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mealEntries.map((entry) => {
                const food = entry.food_id
                  ? foodsById.get(entry.food_id)
                  : undefined;
                const macros = food
                  ? scaleFood(food, entry.amount_grams)
                  : null;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {food?.name ?? "Alimento"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNum(entry.amount_grams)} g
                        {macros
                          ? ` · ${formatNum(macros.calories)} kcal · ${formatNum(macros.net_carbs_g, 1)} g NC`
                          : null}
                      </p>
                      {entry.is_tkd_workout_carb ? (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          TKD
                        </Badge>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover"
                      onClick={() => void removeMealEntry(entry.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
