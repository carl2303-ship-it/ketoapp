"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEAL_LABELS, MEAL_TYPES, type MealType } from "@/lib/types";
import { formatNum, netCarbs, scaleFood } from "@/lib/macros";
import { useKetoStore } from "@/store/keto-store";

export function FoodLogForm() {
  const foods = useKetoStore((s) => s.foods);
  const addMealEntry = useKetoStore((s) => s.addMealEntry);
  const [mealType, setMealType] = useState<MealType>("almoco");
  const [foodId, setFoodId] = useState("");
  const [grams, setGrams] = useState("100");
  const [tkd, setTkd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!foodId && foods[0]?.id) setFoodId(foods[0].id);
    else if (foodId && !foods.some((f) => f.id === foodId) && foods[0]?.id) {
      setFoodId(foods[0].id);
    }
  }, [foods, foodId]);

  const mealItems = useMemo(
    () => MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] })),
    [],
  );

  const foodItems = useMemo(
    () =>
      foods.map((f) => ({
        value: f.id,
        label: `${f.name}${f.brand ? ` · ${f.brand}` : ""} · ${formatNum(netCarbs(f), 1)}g NC/100g`,
      })),
    [foods],
  );

  const food = useMemo(
    () => foods.find((f) => f.id === foodId) ?? foods[0],
    [foods, foodId],
  );

  const preview = food ? scaleFood(food, Number(grams) || 0) : null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!food || !Number(grams)) return;
    startTransition(async () => {
      await addMealEntry({
        meal_type: mealType,
        food_id: food.id,
        amount_grams: Number(grams),
        is_tkd_workout_carb: tkd,
      });
      setDone(true);
      window.setTimeout(() => setDone(false), 1600);
    });
  }

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Registar alimento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Refeição</Label>
              <Select
                items={mealItems}
                value={mealType}
                onValueChange={(v) => {
                  if (v) setMealType(v as MealType);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolher refeição" />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MEAL_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Porção (g)</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alimento</Label>
            <Select
              items={foodItems}
              value={food?.id ?? null}
              onValueChange={(v) => {
                if (v) setFoodId(v);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolher alimento" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {foods.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                    {f.brand ? ` · ${f.brand}` : ""} ·{" "}
                    {formatNum(netCarbs(f), 1)}g NC/100g
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Carboidrato TKD (treino)</p>
              <p className="text-xs text-muted-foreground">
                Não dispara alerta de quebra de cetose
              </p>
            </div>
            <Switch checked={tkd} onCheckedChange={setTkd} />
          </div>

          {preview ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">kcal</p>
                <p className="font-medium tabular-nums">
                  {formatNum(preview.calories)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gordura</p>
                <p className="font-medium tabular-nums">
                  {formatNum(preview.fat_g, 1)} g
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Proteína</p>
                <p className="font-medium tabular-nums">
                  {formatNum(preview.protein_g, 1)} g
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net carbs</p>
                <p className="font-medium tabular-nums">
                  {formatNum(preview.net_carbs_g, 1)} g
                </p>
              </div>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={pending || !food}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Plus className="size-4" />
            {done ? "Adicionado!" : pending ? "A guardar…" : "Adicionar ao diário"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
