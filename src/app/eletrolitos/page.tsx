"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNum, totalsFromEntries } from "@/lib/macros";
import { useKetoStore } from "@/store/keto-store";
import { useMemo } from "react";

export default function EletrolitosPage() {
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

  const data = [
    {
      name: "Na",
      atual: totals.sodium_mg + (log?.sodium_mg ?? 0),
      meta: profile.sodium_target_mg,
    },
    {
      name: "K",
      atual: totals.potassium_mg + (log?.potassium_mg ?? 0),
      meta: profile.potassium_target_mg,
    },
    {
      name: "Mg",
      atual: totals.magnesium_mg + (log?.magnesium_mg ?? 0),
      meta: profile.magnesium_target_mg,
    },
    {
      name: "Água (ml)",
      atual: log?.water_ml ?? 0,
      meta: profile.water_target_l * 1000,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Eletrólitos & hidratação
        </h1>
        <p className="text-muted-foreground">
          Vista leve vs metas. GKI / cetonas ficam para a próxima iteração.
        </p>
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle className="text-base">Hoje vs meta</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                formatter={(value) => formatNum(Number(value))}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                }}
              />
              <Bar dataKey="atual" fill="#34d399" radius={4} name="Atual" />
              <Bar dataKey="meta" fill="#2dd4bf55" radius={4} name="Meta" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
