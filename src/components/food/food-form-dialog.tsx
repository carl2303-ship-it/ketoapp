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
import { formatNum, netCarbs } from "@/lib/macros";
import type { Food } from "@/lib/types";
import { useKetoStore } from "@/store/keto-store";

const empty = {
  name: "",
  brand: "",
  category: "Personalizado",
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
    category: food.category ?? "Personalizado",
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
  const addFood = useKetoStore((s) => s.addFood);
  const updateFood = useKetoStore((s) => s.updateFood);
  const isEdit = Boolean(food);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const [form, setForm] = useState(() => (food ? foodToForm(food) : empty));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setOpen(next: boolean) {
    if (next) {
      setError(null);
      setForm(food ? foodToForm(food) : empty);
    }
    (onOpenChange ?? setInternalOpen)(next);
  }

  function set(key: keyof typeof empty, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      category: form.category.trim() || null,
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
        // Aviso de sync (modo local / sem login) — o item já está na lista + localStorage.
      }
      if (!isEdit) setForm(empty);
      setOpen(false);
    });
  }

  const fields: Array<{
    key: keyof typeof empty;
    label: string;
    step?: string;
  }> = [
    { key: "name", label: "Nome" },
    { key: "brand", label: "Marca" },
    { key: "category", label: "Categoria" },
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
            {isEdit ? "Editar alimento" : "Adicionar alimento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.key}
              className={
                field.key === "name" ||
                field.key === "brand" ||
                field.key === "category"
                  ? "space-y-1.5 sm:col-span-2"
                  : "space-y-1.5"
              }
            >
              <Label htmlFor={`food-${field.key}`}>{field.label}</Label>
              <Input
                id={`food-${field.key}`}
                required={field.key === "name"}
                type={field.step ? "number" : "text"}
                step={field.step}
                min={field.step ? 0 : undefined}
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
