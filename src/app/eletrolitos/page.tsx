"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNum, gki, totalsFromEntries } from "@/lib/macros";
import { useKetoStore } from "@/store/keto-store";

export default function EletrolitosPage() {
  const profile = useKetoStore((s) => s.profile);
  const foods = useKetoStore((s) => s.foods);
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const getEntriesForDate = useKetoStore((s) => s.getEntriesForDate);
  const getLogForDate = useKetoStore((s) => s.getLogForDate);
  const updateBiometrics = useKetoStore((s) => s.updateBiometrics);

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

  const [ketones, setKetones] = useState(
    log?.blood_ketones != null ? String(log.blood_ketones) : "",
  );
  const [glucose, setGlucose] = useState(
    log?.blood_glucose != null ? String(log.blood_glucose) : "",
  );
  const [pending, startTransition] = useTransition();

  const gkiValue = gki(Number(ketones) || 0, Number(glucose) || 0);

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
          Metas do dia + GKI a partir de cetonas e glicemia.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
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

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Cetonas / Glicemia / GKI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ketones">Cetonas (mmol/L)</Label>
              <Input
                id="ketones"
                type="number"
                min={0}
                step={0.1}
                value={ketones}
                onChange={(e) => setKetones(e.target.value)}
                placeholder="ex. 1.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="glucose">Glicemia (mg/dL)</Label>
              <Input
                id="glucose"
                type="number"
                min={0}
                step={1}
                value={glucose}
                onChange={(e) => setGlucose(e.target.value)}
                placeholder="ex. 85"
              />
            </div>
            <div className="rounded-lg bg-emerald-500/10 px-3 py-3">
              <p className="text-xs text-muted-foreground">GKI</p>
              <p className="font-heading text-3xl font-semibold tabular-nums">
                {gkiValue != null ? formatNum(gkiValue, 1) : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {gkiValue == null
                  ? "Introduz cetonas e glicemia"
                  : gkiValue < 3
                    ? "Cetose terapêutica alta"
                    : gkiValue < 6
                      ? "Cetose moderada"
                      : gkiValue < 9
                        ? "Cetose leve"
                        : "Fora da zona típica"}
              </p>
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await updateBiometrics({
                    blood_ketones: ketones === "" ? null : Number(ketones),
                    blood_glucose: glucose === "" ? null : Number(glucose),
                  });
                })
              }
            >
              {pending ? "A guardar…" : "Guardar biomarcadores"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
