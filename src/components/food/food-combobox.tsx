"use client";

import { useCallback, useId, useMemo } from "react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from "lucide-react";
import { Combobox } from "@base-ui/react/combobox";
import { foodSelectSuffix } from "@/lib/macros";
import type { Food } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useKetoStore } from "@/store/keto-store";

type FoodComboboxProps = {
  /** @deprecated Ignorado — a lista vem sempre do Zustand (source of truth). */
  foods?: Food[];
  value: string;
  onValueChange: (foodId: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
};

function foodLabel(food: Food): string {
  return food.brand ? `${food.name} · ${food.brand}` : food.name;
}

/**
 * Picker de alimentos — lê SEMPRE de `useKetoStore.foods`.
 * `foodsEpoch` força remount quando a biblioteca muda.
 */
export function FoodCombobox({
  value,
  onValueChange,
  placeholder = "Pesquisar alimento…",
  id: idProp,
  className,
  disabled,
}: FoodComboboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  const foods = useKetoStore((s) => s.foods);
  const foodsEpoch = useKetoStore((s) => s.foodsEpoch);

  const selected = useMemo(() => {
    if (value) {
      const match = foods.find((f) => f.id === value);
      if (match) return match;
    }
    return foods[0] ?? null;
  }, [foods, value]);

  const filter = useCallback((item: Food, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.brand?.toLowerCase().includes(q) ?? false) ||
      (item.category?.toLowerCase().includes(q) ?? false)
    );
  }, []);

  // Lista estável por epoch — Base UI Combobox pode cachear `items` entre updates.
  const items = useMemo(() => foods.slice(), [foods, foodsEpoch]);

  return (
    <Combobox.Root
      key={`food-picker-${foodsEpoch}-${items.length}`}
      items={items}
      value={selected}
      onValueChange={(food) => {
        onValueChange(food?.id ?? "");
      }}
      itemToStringLabel={foodLabel}
      itemToStringValue={(food) => food.id}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={filter}
      disabled={disabled}
    >
      <div className={cn("relative w-full", className)}>
        <Combobox.InputGroup
          className={cn(
            "relative flex h-9 w-full items-center rounded-lg border border-input bg-transparent",
            "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
            "dark:bg-input/30",
            disabled && "opacity-50",
          )}
        >
          <SearchIcon
            className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
            aria-hidden
          />
          <Combobox.Input
            id={id}
            placeholder={placeholder}
            className={cn(
              "h-full w-full min-w-0 border-0 bg-transparent py-1 pr-16 pl-8 text-base outline-none",
              "placeholder:text-muted-foreground md:text-sm",
            )}
          />
          <div className="absolute inset-y-0 right-0 flex items-center text-muted-foreground">
            <Combobox.Clear
              className="flex size-8 items-center justify-center rounded-md hover:text-foreground"
              aria-label="Limpar pesquisa"
            >
              <XIcon className="size-3.5" />
            </Combobox.Clear>
            <Combobox.Trigger
              className="flex size-8 items-center justify-center rounded-md hover:text-foreground"
              aria-label="Abrir lista de alimentos"
            >
              <ChevronsUpDownIcon className="size-3.5" />
            </Combobox.Trigger>
          </div>
        </Combobox.InputGroup>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
          <Combobox.Popup
            className={cn(
              "w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)]",
              "overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md",
              "transition-[scale,opacity] duration-100",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            <div className="border-b border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
              {items.length} alimento{items.length === 1 ? "" : "s"} na biblioteca
              partilhada
            </div>
            <Combobox.Empty>
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Nenhum alimento encontrado.
              </p>
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 outline-none data-empty:p-0">
              {(food: Food) => (
                <Combobox.Item
                  key={`${foodsEpoch}-${food.id}`}
                  value={food}
                  className={cn(
                    "grid cursor-default grid-cols-[1rem_1fr] items-start gap-2 rounded-md px-2 py-2 text-sm outline-none select-none",
                    "data-highlighted:bg-emerald-500/15 data-highlighted:text-foreground",
                  )}
                >
                  <Combobox.ItemIndicator className="col-start-1 mt-0.5">
                    <CheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2 min-w-0">
                    <span className="block truncate font-medium">
                      {food.name}
                      {food.brand ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {food.brand}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {foodSelectSuffix(food)}
                      {food.category ? ` · ${food.category}` : ""}
                    </span>
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
