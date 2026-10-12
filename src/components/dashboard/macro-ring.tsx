"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatNum } from "@/lib/macros";

interface MacroRingProps {
  fatPct: number;
  proteinPct: number;
  netCarbPct: number;
  calories: number;
  calorieTarget: number;
}

const COLORS = {
  fat: "#34d399",
  protein: "#2dd4bf",
  netCarbs: "#fbbf24",
  empty: "color-mix(in oklch, var(--muted) 80%, transparent)",
};

export function MacroRing({
  fatPct,
  proteinPct,
  netCarbPct,
  calories,
  calorieTarget,
}: MacroRingProps) {
  const consumed = Math.min(100, (calories / Math.max(calorieTarget, 1)) * 100);
  const data = [
    { name: "Gordura", value: Math.max(fatPct, 0.1), color: COLORS.fat },
    { name: "Proteína", value: Math.max(proteinPct, 0.1), color: COLORS.protein },
    { name: "Net Carbs", value: Math.max(netCarbPct, 0.1), color: COLORS.netCarbs },
  ];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[{ value: 100 }]}
            dataKey="value"
            innerRadius="78%"
            outerRadius="88%"
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill={COLORS.empty} />
          </Pie>
          <Pie
            data={[{ value: consumed }, { value: Math.max(0, 100 - consumed) }]}
            dataKey="value"
            innerRadius="78%"
            outerRadius="88%"
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill="#10b981" />
            <Cell fill="transparent" />
          </Pie>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="52%"
            outerRadius="70%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
          {formatNum(calories)}
        </p>
        <p className="text-xs text-muted-foreground">
          de {formatNum(calorieTarget)} kcal
        </p>
      </div>
    </div>
  );
}
