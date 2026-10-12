"use client";

import { addDays, format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKetoStore } from "@/store/keto-store";

export function DateNav() {
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const setSelectedDate = useKetoStore((s) => s.setSelectedDate);
  const date = parseISO(selectedDate);

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Dia anterior"
        onClick={() =>
          setSelectedDate(format(addDays(date, -1), "yyyy-MM-dd"))
        }
      >
        <ChevronLeft className="size-4" />
      </Button>
      <div className="text-center">
        <p className="font-heading text-lg font-semibold capitalize">
          {format(date, "EEEE, d MMMM", { locale: pt })}
        </p>
        <p className="text-xs text-muted-foreground">{selectedDate}</p>
      </div>
      <Button
        variant="outline"
        size="icon"
        aria-label="Dia seguinte"
        onClick={() =>
          setSelectedDate(format(addDays(date, 1), "yyyy-MM-dd"))
        }
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
