"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FoodCombobox } from "@/components/food/food-combobox";
import { WEEK_DAYS } from "@/lib/days";
import { formatNum, portionMacroLine, scaleFood } from "@/lib/macros";
import { MEAL_LABELS, MEAL_TYPES, type MealType } from "@/lib/types";
import { useKetoStore } from "@/store/keto-store";
import { cn } from "@/lib/utils";

export default function PlanoPage() {
  const foods = useKetoStore((s) => s.foods);
  const weeklyPlans = useKetoStore((s) => s.weeklyPlans);
  const addWeeklyPlan = useKetoStore((s) => s.addWeeklyPlan);
  const removeWeeklyPlan = useKetoStore((s) => s.removeWeeklyPlan);
  const copyDay = useKetoStore((s) => s.copyDay);
  const authUserId = useKetoStore((s) => s.authUserId);

  const [activeDay, setActiveDay] = useState(0);
  const [mealType, setMealType] = useState<MealType>("almoco");
  const [foodId, setFoodId] = useState("");
  const [grams, setGrams] = useState("100");
  const [copyFrom, setCopyFrom] = useState("0");
  const [copyTo, setCopyTo] = useState("1");
  const [showList, setShowList] = useState(false);
  const [pending, startTransition] = useTransition();

  const mealItems = useMemo(
    () => MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] })),
    [],
  );
  const dayItems = useMemo(
    () => WEEK_DAYS.map((d) => ({ value: String(d.value), label: d.label })),
    [],
  );

  const selectedFoodId = foodId || foods[0]?.id || "";
  const dayPlans = weeklyPlans.filter((p) => p.day_of_week === activeDay);
  const foodsById = useMemo(
    () => new Map(foods.map((f) => [f.id, f])),
    [foods],
  );

  const shoppingList = useMemo(() => {
    const map = new Map<
      string,
      { name: string; grams: number; category: string | null }
    >();
    for (const plan of weeklyPlans) {
      const food = foodsById.get(plan.food_id);
      if (!food) continue;
      const prev = map.get(food.id);
      map.set(food.id, {
        name: food.name,
        category: food.category,
        grams: (prev?.grams ?? 0) + plan.amount_grams,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }, [weeklyPlans, foodsById]);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFoodId || !Number(grams)) return;
    startTransition(async () => {
      await addWeeklyPlan({
        day_of_week: activeDay,
        meal_type: mealType,
        food_id: selectedFoodId,
        amount_grams: Number(grams),
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Planeador semanal
          </h1>
          <p className="text-muted-foreground">
            Seg–Dom, copiar dia e lista de compras.
            {!authUserId
              ? " Sem login o plano fica só neste dispositivo."
              : " Sincronizado com a tua conta."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowList((v) => !v)}
          className="shrink-0"
        >
          <ShoppingCart className="size-4" />
          {showList ? "Esconder lista" : "Lista de compras"}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {WEEK_DAYS.map((day) => {
          const count = weeklyPlans.filter((p) => p.day_of_week === day.value).length;
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => setActiveDay(day.value)}
              className={cn(
                "min-w-[4.25rem] rounded-lg border px-3 py-2 text-left transition-colors",
                activeDay === day.value
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "border-border/70 bg-card/50 text-muted-foreground hover:bg-muted",
              )}
            >
              <p className="text-sm font-medium">{day.short}</p>
              <p className="text-[10px]">{count} item{count === 1 ? "" : "s"}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              {WEEK_DAYS[activeDay]?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dayPlans.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-sm text-muted-foreground">
                Sem itens neste dia. Adiciona alimentos ao plano.
              </p>
            ) : (
              dayPlans.map((plan) => {
                const food = foodsById.get(plan.food_id);
                const macros = food
                  ? scaleFood(food, plan.amount_grams)
                  : null;
                return (
                  <div
                    key={plan.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {food?.name ?? "Alimento"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {MEAL_LABELS[plan.meal_type]} ·{" "}
                        {formatNum(plan.amount_grams)} g
                        {macros ? ` · ${portionMacroLine(macros)}` : null}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover"
                      onClick={() => void removeWeeklyPlan(plan.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Adicionar ao dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onAdd} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Refeição</Label>
                  <Select
                    items={mealItems}
                    value={mealType}
                    onValueChange={(v) => v && setMealType(v as MealType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
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
                <div className="space-y-1.5">
                  <Label htmlFor="plano-food-combobox">Alimento</Label>
                  <FoodCombobox
                    id="plano-food-combobox"
                    foods={foods}
                    value={selectedFoodId}
                    onValueChange={setFoodId}
                    placeholder="Escrever nome ou marca…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Porção (g)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={pending || !selectedFoodId}
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Copiar dia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>De</Label>
                  <Select
                    items={dayItems}
                    value={copyFrom}
                    onValueChange={(v) => v && setCopyFrom(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEK_DAYS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Para</Label>
                  <Select
                    items={dayItems}
                    value={copyTo}
                    onValueChange={(v) => v && setCopyTo(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEK_DAYS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  void copyDay(Number(copyFrom), Number(copyTo))
                }
              >
                <Copy className="size-4" />
                Copiar (substitui o dia destino)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showList ? (
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Lista de compras ({shoppingList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shoppingList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há itens no plano semanal.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {shoppingList.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.category ? (
                        <p className="text-xs text-muted-foreground">
                          {item.category}
                        </p>
                      ) : null}
                    </div>
                    <p className="tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatNum(item.grams)} g
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
