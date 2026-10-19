"use client";

import { useSyncExternalStore } from "react";
import { addDays, format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKetoStore } from "@/store/keto-store";

const emptySubscribe = () => () => {};

export function DateNav() {
  const selectedDate = useKetoStore((s) => s.selectedDate);
  const setSelectedDate = useKetoStore((s) => s.setSelectedDate);
  // false no SSR / 1º paint; true no cliente — evita React #418 no texto da data.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

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
          {mounted ? (
            format(date, "EEEE, d MMMM", { locale: pt })
          ) : (
            <span suppressHydrationWarning>{selectedDate}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          {selectedDate}
        </p>
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
