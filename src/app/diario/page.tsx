"use client";

import { DateNav } from "@/components/dashboard/date-nav";
import { FoodLogForm } from "@/components/food/food-log-form";
import { TodaysMeals } from "@/components/food/todays-meals";
import { Button } from "@/components/ui/button";
import { useKetoStore } from "@/store/keto-store";
import { formatNum } from "@/lib/macros";

export default function DiarioPage() {
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const getLogForDate = useKetoStore((s) => s.getLogForDate);
  const updateWater = useKetoStore((s) => s.updateWater);
  const profile = useKetoStore((s) => s.profile);
  const log = getLogForDate(selectedDate);
  const water = log?.water_ml ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Diário alimentar
        </h1>
        <p className="text-muted-foreground">
          Navega por data, regista refeições e hidratação.
        </p>
      </div>

      <DateNav />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 p-4">
        <p className="mr-auto text-sm">
          Água:{" "}
          <span className="font-medium tabular-nums">
            {formatNum(water / 1000, 1)} L
          </span>{" "}
          / {formatNum(profile.water_target_l, 1)} L
        </p>
        {[250, 500].map((ml) => (
          <Button
            key={ml}
            variant="outline"
            size="sm"
            onClick={() => void updateWater(water + ml)}
          >
            +{ml} ml
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void updateWater(0)}
        >
          Limpar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FoodLogForm />
        <TodaysMeals />
      </div>
    </div>
  );
}
