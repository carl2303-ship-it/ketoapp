"use client";

import { Droplets, Flame, Leaf, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNum } from "@/lib/macros";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  caloriesLeft: number;
  netCarbsUsed: number;
  netCarbsTarget: number;
  sodiumUsed: number;
  sodiumTarget: number;
  waterMl: number;
  waterTargetL: number;
}

export function SummaryCards({
  caloriesLeft,
  netCarbsUsed,
  netCarbsTarget,
  sodiumUsed,
  sodiumTarget,
  waterMl,
  waterTargetL,
}: SummaryCardsProps) {
  const carbsOver = netCarbsUsed > netCarbsTarget;
  const waterPct = Math.min(100, (waterMl / (waterTargetL * 1000)) * 100);
  const sodiumPct = Math.min(100, (sodiumUsed / Math.max(sodiumTarget, 1)) * 100);
  const carbsPct = Math.min(100, (netCarbsUsed / Math.max(netCarbsTarget, 1)) * 100);

  const items = [
    {
      title: "Calorias restantes",
      value: `${formatNum(Math.max(0, caloriesLeft))} kcal`,
      hint: caloriesLeft < 0 ? "Acima do alvo" : "Para o resto do dia",
      icon: Flame,
      progress: null as number | null,
      alert: caloriesLeft < 0,
    },
    {
      title: "Net carbs",
      value: `${formatNum(netCarbsUsed, 1)} / ${formatNum(netCarbsTarget)} g`,
      hint: carbsOver ? "Alerta: acima da meta" : "Dentro da meta cetogénica",
      icon: Leaf,
      progress: carbsPct,
      alert: carbsOver,
    },
    {
      title: "Sódio",
      value: `${formatNum(sodiumUsed)} / ${formatNum(sodiumTarget)} mg`,
      hint: "Eletrólitos do dia",
      icon: Zap,
      progress: sodiumPct,
      alert: false,
    },
    {
      title: "Água",
      value: `${formatNum(waterMl / 1000, 1)} / ${formatNum(waterTargetL, 1)} L`,
      hint: "Hidratação",
      icon: Droplets,
      progress: waterPct,
      alert: false,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.title}
            className={cn(
              "border-border/70 bg-card/70 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5",
              item.alert && "border-amber-500/50",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <Icon
                className={cn(
                  "size-4",
                  item.alert ? "text-amber-500" : "text-emerald-500",
                )}
              />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-heading text-2xl font-semibold tabular-nums">
                {item.value}
              </p>
              <p
                className={cn(
                  "text-xs",
                  item.alert ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                )}
              >
                {item.hint}
              </p>
              {item.progress != null ? (
                <Progress
                  value={item.progress}
                  className={cn(
                    "h-1.5",
                    item.alert && "*:data-[slot=progress-indicator]:bg-amber-500",
                  )}
                />
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
