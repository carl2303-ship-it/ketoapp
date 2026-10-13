"use client";

import { useMemo } from "react";
import { MacroRing } from "@/components/dashboard/macro-ring";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { DateNav } from "@/components/dashboard/date-nav";
import { FoodLogForm } from "@/components/food/food-log-form";
import { TodaysMeals } from "@/components/food/todays-meals";
import {
  formatNum,
  macroPercentages,
  remainingTargets,
  totalsFromEntries,
} from "@/lib/macros";
import { useKetoStore } from "@/store/keto-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const profile = useKetoStore((s) => s.profile);
  const foods = useKetoStore((s) => s.foods);
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const getEntriesForDate = useKetoStore((s) => s.getEntriesForDate);
  const getLogForDate = useKetoStore((s) => s.getLogForDate);

  const entries = getEntriesForDate(selectedDate);
  const log = getLogForDate(selectedDate);
  const foodsById = useMemo(
    () => new Map(foods.map((f) => [f.id, f])),
    [foods],
  );
  const totals = useMemo(
    () => totalsFromEntries(entries, foodsById),
    [entries, foodsById],
  );
  const pct = macroPercentages(totals);
  const remaining = remainingTargets(profile, totals);

  return (
    <div className="space-y-8">
      <section className="animate-rise space-y-2">
        <p className="text-sm font-medium tracking-wide text-emerald-600 dark:text-emerald-400">
          KetoTrack & Plan
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          O teu dia cetogénico
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Acompanha macros, net carbs e eletrólitos — com alerta se ultrapassares
          a meta de {formatNum(profile.net_carb_target_g)} g de net carbs.
        </p>
      </section>

      <DateNav />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="animate-rise-delay space-y-4">
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Anel de macros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-ring">
                <MacroRing
                  fatPct={pct.fat}
                  proteinPct={pct.protein}
                  netCarbPct={pct.netCarbs}
                  calories={totals.calories}
                  calorieTarget={profile.daily_calories_target}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                <div>
                  <p className="font-medium text-emerald-500">
                    {formatNum(pct.fat, 0)}%
                  </p>
                  <p className="text-muted-foreground">
                    Gordura · {formatNum(totals.fat_g, 1)} g
                  </p>
                </div>
                <div>
                  <p className="font-medium text-teal-400">
                    {formatNum(pct.protein, 0)}%
                  </p>
                  <p className="text-muted-foreground">
                    Proteína · {formatNum(totals.protein_g, 1)} g
                  </p>
                </div>
                <div>
                  <p className="font-medium text-lime-500">
                    F {formatNum(totals.fiber_g, 1)}
                  </p>
                  <p className="text-muted-foreground">
                    Fibras · {formatNum(totals.fiber_g, 1)} g
                  </p>
                </div>
                <div>
                  <p className="font-medium text-amber-400">
                    {formatNum(pct.netCarbs, 0)}%
                  </p>
                  <p className="text-muted-foreground">
                    Net carbs · {formatNum(totals.net_carbs_g, 1)} g
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <SummaryCards
            caloriesLeft={remaining.calories}
            netCarbsUsed={totals.net_carbs_g}
            netCarbsTarget={profile.net_carb_target_g}
            fiberUsed={totals.fiber_g}
            sodiumUsed={totals.sodium_mg + (log?.sodium_mg ?? 0)}
            sodiumTarget={profile.sodium_target_mg}
            waterMl={log?.water_ml ?? 0}
            waterTargetL={profile.water_target_l}
          />
        </section>

        <section className="space-y-4">
          <FoodLogForm />
          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold">
              Refeições de hoje
            </h2>
            <TodaysMeals />
          </div>
        </section>
      </div>
    </div>
  );
}
