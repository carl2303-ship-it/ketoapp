"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  classifyDayGoal,
  GOAL_STATUS_COLORS,
  GOAL_STATUS_LABELS,
  type DayGoalStatus,
} from "@/lib/goal-status";
import { cn } from "@/lib/utils";
import { useKetoStore } from "@/store/keto-store";
import { useFoodsById } from "@/store/selectors";

type ViewMode = "week" | "month";

const WEEK_STARTS_ON = 1; // Segunda

export function GoalCalendar() {
  const profile = useKetoStore((s) => s.profile);
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const setSelectedDate = useKetoStore((s) => s.setSelectedDate);
  const dailyLogs = useKetoStore((s) => s.dailyLogs);
  const mealEntries = useKetoStore((s) => s.mealEntries);
  const foodsById = useFoodsById();

  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState(() => parseISO(selectedDate));

  const selected = parseISO(selectedDate);

  const statusByDate = useMemo(() => {
    const map = new Map<string, DayGoalStatus>();
    const byLogId = new Map(dailyLogs.map((l) => [l.id, l.date]));
    const entriesByDate = new Map<string, typeof mealEntries>();
    for (const e of mealEntries) {
      const date = byLogId.get(e.daily_log_id);
      if (!date) continue;
      const list = entriesByDate.get(date) ?? [];
      list.push(e);
      entriesByDate.set(date, list);
    }
    for (const [date, entries] of entriesByDate) {
      map.set(date, classifyDayGoal(entries, foodsById, profile).status);
    }
    return map;
  }, [dailyLogs, mealEntries, foodsById, profile]);

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(selected, { weekStartsOn: WEEK_STARTS_ON });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const start = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
    const end = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
    return eachDayOfInterval({ start, end });
  }, [view, selected, cursor]);

  function statusOf(day: Date): DayGoalStatus {
    return statusByDate.get(format(day, "yyyy-MM-dd")) ?? "empty";
  }

  function goPrev() {
    if (view === "week") {
      const next = addDays(selected, -7);
      setSelectedDate(format(next, "yyyy-MM-dd"));
      setCursor(next);
    } else {
      setCursor((c) => subMonths(c, 1));
    }
  }

  function goNext() {
    if (view === "week") {
      const next = addDays(selected, 7);
      setSelectedDate(format(next, "yyyy-MM-dd"));
      setCursor(next);
    } else {
      setCursor((c) => addMonths(c, 1));
    }
  }

  const title =
    view === "week"
      ? `Semana de ${format(days[0]!, "d MMM", { locale: pt })}`
      : format(cursor, "MMMM yyyy", { locale: pt });

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="font-heading text-lg capitalize">{title}</CardTitle>
        <div className="flex items-center gap-1">
          <div className="mr-1 flex rounded-lg border border-border/60 p-0.5">
            <button
              type="button"
              onClick={() => {
                setView("week");
                setCursor(selected);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                view === "week"
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => {
                setView("month");
                setCursor(selected);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                view === "month"
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Mês
            </button>
          </div>
          <Button variant="outline" size="icon" aria-label="Anterior" onClick={goPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Seguinte" onClick={goNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const status = statusOf(day);
            const isSelected = isSameDay(day, selected);
            const inMonth = view === "week" || isSameMonth(day, cursor);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDate(key);
                  setCursor(day);
                }}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center rounded-lg border px-1 py-1.5 text-sm transition-all duration-200",
                  GOAL_STATUS_COLORS[status],
                  isSelected && "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background",
                  !inMonth && "opacity-40",
                )}
                aria-label={`${format(day, "d MMMM", { locale: pt })} — ${GOAL_STATUS_LABELS[status]}`}
                aria-pressed={isSelected}
              >
                <span className="font-heading text-base font-semibold tabular-nums leading-none">
                  {format(day, "d")}
                </span>
                <span className="mt-0.5 hidden text-[9px] leading-none sm:block">
                  {status === "empty" ? "—" : status === "met" ? "✓" : status === "partial" ? "~" : "!"}
                </span>
              </button>
            );
          })}
        </div>

        <ul className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1 text-xs text-muted-foreground">
          {(
            [
              ["met", "Metas atingidas"],
              ["partial", "Parcial"],
              ["missed", "Fora das metas"],
              ["empty", "Sem registos"],
            ] as const
          ).map(([status, label]) => (
            <li key={status} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block size-2.5 rounded-sm border",
                  GOAL_STATUS_COLORS[status],
                )}
                aria-hidden
              />
              {label}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Cores baseadas em net carbs vs meta e calorias (±12% do alvo). Clica num dia para o
          seleccionar.
        </p>
      </CardContent>
    </Card>
  );
}
