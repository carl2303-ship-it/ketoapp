"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNum, netCarbs } from "@/lib/macros";
import type { Food } from "@/lib/types";
import { useKetoStore } from "@/store/keto-store";

const NEW_CATEGORY_VALUE = "__new__";
const DEFAULT_CATEGORY = "Personalizado";

const empty = {
  name: "",
  brand: "",
  category: DEFAULT_CATEGORY,
  calories: "",
  fat_g: "",
  protein_g: "",
  carbs_total_g: "",
  fiber_g: "",
  polyols_g: "",
  sodium_mg: "",
  potassium_mg: "",
  magnesium_mg: "",
  saturated_fat_g: "",
};

function foodToForm(food: Food): typeof empty {
  return {
    name: food.name,
    brand: food.brand ?? "",
    category: food.category ?? DEFAULT_CATEGORY,
    calories: String(food.calories),
    fat_g: String(food.fat_g),
    protein_g: String(food.protein_g),
    carbs_total_g: String(food.carbs_total_g),
    fiber_g: String(food.fiber_g),
    polyols_g: String(food.polyols_g),
    sodium_mg: String(food.sodium_mg),
    potassium_mg: String(food.potassium_mg),
    magnesium_mg: String(food.magnesium_mg),
    saturated_fat_g: String(food.saturated_fat_g),
  };
}

type FoodFormDialogProps = {
  food?: Food | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showCreateTrigger?: boolean;
};

export function FoodFormDialog({
  food = null,
  open: openProp,
  onOpenChange,
  showCreateTrigger = false,
}: FoodFormDialogProps) {
  const foods = useKetoStore((s) => s.foods);
  const addFood = useKetoStore((s) => s.addFood);
  const updateFood = useKetoStore((s) => s.updateFood);
  const isEdit = Boolean(food);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const [form, setForm] = useState(() => (food ? foodToForm(food) : empty));
  const [customCategory, setCustomCategory] = useState("");
  const [useNewCategory, setUseNewCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const f of foods) {
      if (f.category?.trim()) set.add(f.category.trim());
    }
    set.add(DEFAULT_CATEGORY);
    if (food?.category?.trim()) set.add(food.category.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt"));
  }, [foods, food]);

  const categoryItems = useMemo(
    () => [
      ...categoryOptions.map((c) => ({ value: c, label: c })),
      { value: NEW_CATEGORY_VALUE, label: "Nova categoria…" },
    ],
    [categoryOptions],
  );

  function setOpen(next: boolean) {
    if (next) {
      setError(null);
      const nextForm = food ? foodToForm(food) : { ...empty };
      // Lista actual de categorias (inclui a do alimento em edição).
      const known = new Set(
        foods
          .map((f) => f.category?.trim())
          .filter((c): c is string => Boolean(c)),
      );
      known.add(DEFAULT_CATEGORY);
      if (nextForm.category && !known.has(nextForm.category)) {
        setUseNewCategory(true);
        setCustomCategory(nextForm.category);
      } else {
        setUseNewCategory(false);
        setCustomCategory("");
      }
      setForm(nextForm);
    }
    (onOpenChange ?? setInternalOpen)(next);
  }

  function set(key: keyof typeof empty, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onCategorySelect(value: string | null) {
    if (!value) return;
    if (value === NEW_CATEGORY_VALUE) {
      setUseNewCategory(true);
      setCustomCategory("");
      set("category", "");
      return;
    }
    setUseNewCategory(false);
    setCustomCategory("");
    set("category", value);
  }

  function resolvedCategory(): string {
    if (useNewCategory) return customCategory.trim();
    return form.category.trim();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const category = resolvedCategory();
    if (!category) {
      setError("Escolhe ou escreve uma categoria.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      category,
      calories: Number(form.calories) || 0,
      fat_g: Number(form.fat_g) || 0,
      protein_g: Number(form.protein_g) || 0,
      carbs_total_g: Number(form.carbs_total_g) || 0,
      fiber_g: Number(form.fiber_g) || 0,
      polyols_g: Number(form.polyols_g) || 0,
      sodium_mg: Number(form.sodium_mg) || 0,
      potassium_mg: Number(form.potassium_mg) || 0,
      magnesium_mg: Number(form.magnesium_mg) || 0,
      saturated_fat_g: Number(form.saturated_fat_g) || 0,
    };
    startTransition(async () => {
      if (isEdit && food) {
        const result = await updateFood(food.id, payload);
        if (!result.ok) {
          setError(result.error ?? "Não foi possível guardar.");
          return;
        }
      } else {
        const result = await addFood(payload);
        if (!result.ok) {
          setError(result.error ?? "Não foi possível guardar.");
          return;
        }
      }
      if (!isEdit) setForm(empty);
      setOpen(false);
    });
  }

  const macroFields: Array<{
    key: keyof typeof empty;
    label: string;
    step?: string;
  }> = [
    { key: "calories", label: "kcal / 100g", step: "0.1" },
    { key: "fat_g", label: "Gordura (g)", step: "0.1" },
    { key: "protein_g", label: "Proteína (g)", step: "0.1" },
    { key: "carbs_total_g", label: "Hidratos totais (g)", step: "0.1" },
    { key: "fiber_g", label: "Fibras (g)", step: "0.1" },
    { key: "polyols_g", label: "Polióis (g)", step: "0.1" },
    { key: "sodium_mg", label: "Sódio (mg)", step: "1" },
  ];

  const previewNc = useMemo(
    () =>
      netCarbs({
        carbs_total_g: Number(form.carbs_total_g) || 0,
        fiber_g: Number(form.fiber_g) || 0,
        polyols_g: Number(form.polyols_g) || 0,
      }),
    [form.carbs_total_g, form.fiber_g, form.polyols_g],
  );

  const selectValue = useNewCategory ? NEW_CATEGORY_VALUE : form.category;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showCreateTrigger ? (
        <DialogTrigger
          render={
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500" />
          }
        >
          <Plus className="size-4" />
          Novo alimento
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? food?.is_global
                ? "Personalizar alimento (cria cópia pessoal)"
                : "Editar alimento"
              : "Adicionar alimento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="food-name">Nome</Label>
            <Input
              id="food-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="food-brand">Marca</Label>
            <Input
              id="food-brand"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Categoria</Label>
            <Select
              items={categoryItems}
              value={selectValue}
              onValueChange={onCategorySelect}
            >
              <SelectTrigger className="w-full" id="food-category">
                <SelectValue placeholder="Escolher categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY_VALUE}>
                  Nova categoria…
                </SelectItem>
              </SelectContent>
            </Select>
            {useNewCategory ? (
              <Input
                className="mt-2"
                id="food-category-new"
                placeholder="Nome da nova categoria"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
                autoFocus
              />
            ) : null}
          </div>

          {macroFields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`food-${field.key}`}>{field.label}</Label>
              <Input
                id={`food-${field.key}`}
                type="number"
                step={field.step}
                min={0}
                value={form[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
              />
            </div>
          ))}

          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
            Net carbs / 100 g:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatNum(previewNc, 1)} g
            </span>{" "}
            (HT − fibras − polióis). Fibras entram no cálculo.
          </p>
          {error ? (
            <p className="text-xs text-amber-600 sm:col-span-2 dark:text-amber-400">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={pending || !form.name.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500"
            >
              {pending
                ? "A guardar…"
                : isEdit
                  ? "Guardar alterações"
                  : "Guardar alimento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddFoodDialog() {
  return <FoodFormDialog showCreateTrigger />;
}

export function EditFoodButton({ food }: { food: Food }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2"
        onClick={() => setOpen(true)}
        aria-label={`Editar ${food.name}`}
      >
        <Pencil className="size-3.5" />
        <span className="hidden sm:inline">Editar</span>
      </Button>
      <FoodFormDialog food={food} open={open} onOpenChange={setOpen} />
    </>
  );
}
