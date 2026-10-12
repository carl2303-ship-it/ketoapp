"use client";

import { useMemo } from "react";
import { AddFoodDialog } from "@/components/food/add-food-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNum, netCarbs } from "@/lib/macros";
import { useKetoStore } from "@/store/keto-store";

export default function AlimentosPage() {
  const foods = useKetoStore((s) => s.foods);
  const searchQuery = useKetoStore((s) => s.searchQuery);
  const categoryFilter = useKetoStore((s) => s.categoryFilter);
  const setSearchQuery = useKetoStore((s) => s.setSearchQuery);
  const setCategoryFilter = useKetoStore((s) => s.setCategoryFilter);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Alimentos
          </h1>
          <p className="text-muted-foreground">
            Biblioteca global e alimentos pessoais. Valores por 100 g.
          </p>
        </div>
        <AddFoodDialog />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Pesquisar por nome ou marca…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
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

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhum alimento corresponde à pesquisa.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card/60">
          {filtered.map((food) => (
            <li
              key={food.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
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
                  {formatNum(food.calories)} kcal · G {formatNum(food.fat_g, 1)} ·
                  P {formatNum(food.protein_g, 1)} · NC{" "}
                  {formatNum(netCarbs(food), 1)} g
                </p>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatNum(food.sodium_mg)} mg Na
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
