"use client";

import { useMemo, useState, useTransition } from "react";
import { addDays, format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEAL_LABELS, type MealType } from "@/lib/types";
import { useKetoStore } from "@/store/keto-store";

type CopyMealDialogProps = {
  mealType: MealType;
  fromDate: string;
  triggerClassName?: string;
};

export function CopyMealDialog({
  mealType,
  fromDate,
  triggerClassName,
}: CopyMealDialogProps) {
  const copyMealToDate = useKetoStore((s) => s.copyMealToDate);
  const setSelectedDate = useKetoStore((s) => s.setSelectedDate);
  const [open, setOpen] = useState(false);
  const [toDate, setToDate] = useState(() =>
    format(addDays(parseISO(fromDate), 1), "yyyy-MM-dd"),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dayOptions = useMemo(() => {
    const base = parseISO(fromDate);
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(base, i - 3);
      const value = format(d, "yyyy-MM-dd");
      return {
        value,
        label: format(d, "EEE d MMM", { locale: pt }),
        disabled: value === fromDate,
      };
    });
  }, [fromDate]);

  const dayItems = useMemo(
    () =>
      dayOptions.map((d) => ({
        value: d.value,
        label: d.disabled ? `${d.label} (origem)` : d.label,
      })),
    [dayOptions],
  );

  function onCopy() {
    setMessage(null);
    startTransition(async () => {
      const result = await copyMealToDate({
        fromDate,
        toDate,
        meal_type: mealType,
        replace: true,
      });
      if (!result.ok) {
        setMessage(result.error ?? "Não foi possível copiar.");
        return;
      }
      setMessage(
        `Copiado ${result.copied} item${result.copied === 1 ? "" : "s"} para ${format(parseISO(toDate), "d MMM", { locale: pt })}.`,
      );
      setSelectedDate(toDate);
      window.setTimeout(() => {
        setOpen(false);
        setMessage(null);
      }, 900);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={triggerClassName}
            aria-label={`Copiar ${MEAL_LABELS[mealType]} para outro dia`}
          />
        }
      >
        <Copy className="size-3.5" />
        <span className="hidden sm:inline">Copiar</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Copiar {MEAL_LABELS[mealType]}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            De{" "}
            <span className="font-medium text-foreground">
              {format(parseISO(fromDate), "EEEE d MMM", { locale: pt })}
            </span>{" "}
            para outro dia (substitui a mesma refeição no destino).
          </p>
          <div className="space-y-1.5">
            <Label>Dia destino</Label>
            <Select
              items={dayItems}
              value={toDate}
              onValueChange={(v) => v && setToDate(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((d) => (
                  <SelectItem key={d.value} value={d.value} disabled={d.disabled}>
                    {d.label}
                    {d.disabled ? " (origem)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {message ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
              {message}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full bg-emerald-600 hover:bg-emerald-500"
            disabled={pending || toDate === fromDate}
            onClick={onCopy}
          >
            <Copy className="size-4" />
            {pending ? "A copiar…" : "Copiar refeição"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
