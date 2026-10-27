"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyMealDialog } from "@/components/food/copy-meal-dialog";
import { MEAL_LABELS, MEAL_TYPES } from "@/lib/types";
import {
  addTotals,
  emptyTotals,
  formatNum,
  portionMacroLine,
  scaleFood,
} from "@/lib/macros";
import { useKetoStore } from "@/store/keto-store";
import { useEntriesForDate, useFoodsById } from "@/store/selectors";

export function TodaysMeals() {
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const removeMealEntry = useKetoStore((s) => s.removeMealEntry);
  const entries = useEntriesForDate(selectedDate);
  const foodsById = useFoodsById();

  const byMeal = useMemo(() => {
    return MEAL_TYPES.map((meal) => {
      const mealEntries = entries.filter((e) => e.meal_type === meal);
      const totals = mealEntries.reduce((acc, entry) => {
        if (!entry.food_id) return acc;
        const food = foodsById.get(entry.food_id);
        if (!food) return acc;
        return addTotals(acc, scaleFood(food, entry.amount_grams));
      }, emptyTotals());
      return { meal, mealEntries, totals };
    }).filter((m) => m.mealEntries.length > 0);
  }, [entries, foodsById]);

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
      {byMeal.map(({ meal, mealEntries, totals }) => (
        <Card key={meal} className="border-border/70 bg-card/70">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">{MEAL_LABELS[meal]}</CardTitle>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {formatNum(totals.calories)} kcal · G {formatNum(totals.fat_g, 1)} · P{" "}
                {formatNum(totals.protein_g, 1)} · NC {formatNum(totals.net_carbs_g, 1)} g
              </p>
            </div>
            <CopyMealDialog mealType={meal} fromDate={selectedDate} />
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
                      {macros ? ` · ${portionMacroLine(macros)}` : null}
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
      ))}
    </div>
  );
}
