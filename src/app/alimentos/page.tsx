"use client";

import { useMemo, useState, useTransition } from "react";
import { SearchIcon, Trash2 } from "lucide-react";
import {
  AddFoodDialog,
  EditFoodButton,
} from "@/components/food/food-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { foodPer100gLine, formatNum } from "@/lib/macros";
import type { Food } from "@/lib/types";
import { useKetoStore } from "@/store/keto-store";

export default function AlimentosPage() {
  const foods = useKetoStore((s) => s.foods);
  const searchQuery = useKetoStore((s) => s.searchQuery);
  const categoryFilter = useKetoStore((s) => s.categoryFilter);
  const setSearchQuery = useKetoStore((s) => s.setSearchQuery);
  const setCategoryFilter = useKetoStore((s) => s.setCategoryFilter);
  const canMutateFood = useKetoStore((s) => s.canMutateFood);
  const deleteFood = useKetoStore((s) => s.deleteFood);
  const usingMock = useKetoStore((s) => s.usingMock);

  const [deleteTarget, setDeleteTarget] = useState<Food | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categories = useMemo(() => {
    const set = new Set(
      foods.map((f) => f.category).filter((c): c is string => Boolean(c)),
    );
    return ["all", ...Array.from(set).sort()];
  }, [foods]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return foods.filter((f) => {
      const matchCat =
        categoryFilter === "all" || f.category === categoryFilter;
      const matchQ =
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.brand?.toLowerCase().includes(q) ?? false);
      return matchCat && matchQ;
    });
  }, [foods, searchQuery, categoryFilter]);

  function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteFood(deleteTarget.id);
      if (!result.ok) {
        setDeleteError(result.error ?? "Não foi possível apagar.");
        return;
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Alimentos
          </h1>
          <p className="text-muted-foreground">
            Biblioteca global e pessoais. Valores por 100 g — NC = HT − fibras −
            polióis.
            {!usingMock
              ? " Globais são só de leitura; pessoais ficam neste dispositivo e sincronizam se estiveres autenticado."
              : " Em modo local os teus alimentos e categorias novas ficam guardados neste browser."}
          </p>
        </div>
        <AddFoodDialog />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Pesquisar por nome ou marca…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            aria-label="Pesquisar alimentos por nome ou marca"
          />
        </div>
        <Select
          items={categories.map((c) => ({
            value: c,
            label: c === "all" ? "Todas as categorias" : c,
          }))}
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "all" ? "Todas as categorias" : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} alimento{filtered.length === 1 ? "" : "s"}
        {searchQuery.trim() || categoryFilter !== "all" ? " (filtrados)" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhum alimento corresponde à pesquisa.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card/60">
          {filtered.map((food) => {
            const mutable = canMutateFood(food);
            return (
              <li
                key={food.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{food.name}</p>
                    {food.is_global ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Global
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">
                        Pessoal
                      </Badge>
                    )}
                    {food.category ? (
                      <Badge variant="outline" className="text-[10px]">
                        {food.category}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {food.brand ? `${food.brand} · ` : null}
                    {formatNum(food.calories)} kcal · {foodPer100gLine(food)}
                    <span className="text-muted-foreground/80">
                      {" "}
                      (HT {formatNum(food.carbs_total_g, 1)} g)
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-emerald-600 dark:text-emerald-400 sm:hidden">
                    {formatNum(food.sodium_mg)} mg Na
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="hidden text-sm tabular-nums text-emerald-600 dark:text-emerald-400 sm:block">
                    {formatNum(food.sodium_mg)} mg Na
                  </p>
                  {mutable ? (
                    <>
                      <EditFoodButton food={food} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 px-2 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(food);
                        }}
                        aria-label={`Apagar ${food.name}`}
                      >
                        <Trash2 className="size-3.5" />
                        <span className="hidden sm:inline">Apagar</span>
                      </Button>
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      Só leitura
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apagar alimento?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vais apagar{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              . Esta acção não pode ser desfeita.
            </p>
            {deleteError ? (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                {deleteError}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDelete}
                disabled={pending}
              >
                {pending ? "A apagar…" : "Apagar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
