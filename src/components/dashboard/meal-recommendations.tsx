"use client";

import { useMemo, useState, useTransition } from "react";
import { Lightbulb, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNum, portionMacroLine } from "@/lib/macros";
import { suggestRemainingMeals } from "@/lib/meal-recommendations";
import { useKetoStore } from "@/store/keto-store";
import { useEntriesForDate, useFoodsById } from "@/store/selectors";

export function MealRecommendations() {
  const profile = useKetoStore((s) => s.profile);
  const foods = useKetoStore((s) => s.foods);
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const addMealEntry = useKetoStore((s) => s.addMealEntry);
  const entries = useEntriesForDate(selectedDate);
  const foodsById = useFoodsById();
  const [pending, startTransition] = useTransition();
  const [applied, setApplied] = useState<string | null>(null);

  const suggestions = useMemo(
    () => suggestRemainingMeals(entries, foods, profile),
    [entries, foods, profile],
  );

  // Só mostrar quando faz sentido (PA+almoço ou jantar em falta)
  if (suggestions.length === 0) return null;

  function applySuggestion(mealType: string) {
    const suggestion = suggestions.find((s) => s.meal_type === mealType);
    if (!suggestion) return;
    startTransition(async () => {
      for (const item of suggestion.items) {
        await addMealEntry({
          meal_type: suggestion.meal_type,
          food_id: item.food.id,
          amount_grams: item.amount_grams,
        });
      }
      setApplied(mealType);
      window.setTimeout(() => setApplied(null), 1800);
    });
  }

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-lg">
          <Lightbulb className="size-4 text-emerald-500" />
          Sugestões para o resto do dia
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Com base nos macros que ainda faltam face às tuas metas, usando alimentos da
          biblioteca.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((s) => (
          <div
            key={s.meal_type}
            className="rounded-xl border border-border/60 bg-card/70 p-3"
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.rationale}</p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500"
                disabled={pending}
                onClick={() => applySuggestion(s.meal_type)}
              >
                <Plus className="size-3.5" />
                {applied === s.meal_type ? "Adicionado!" : "Adicionar"}
              </Button>
            </div>
            <ul className="space-y-1.5">
              {s.items.map((item) => (
                <li
                  key={`${s.meal_type}-${item.food.id}`}
                  className="flex items-baseline justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {item.food.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatNum(item.amount_grams)} g
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {portionMacroLine(item.macros)}
                  </span>
                </li>
              ))}
            </ul>
            {!foodsById.has(s.items[0]?.food.id ?? "") ? (
              <p className="mt-2 text-xs text-amber-600">Alimento em falta na lista.</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
