"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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

export function AddFoodDialog() {
  const addFood = useKetoStore((s) => s.addFood);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [pending, startTransition] = useTransition();

  function set(key: keyof typeof empty, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addFood({
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
      });
      setForm(empty);
      setOpen(false);
    });
  }

  const fields: Array<{ key: keyof typeof empty; label: string; step?: string }> = [
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-emerald-600 text-white hover:bg-emerald-500" />
        }
      >
        <Plus className="size-4" />
        Novo alimento
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar alimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.key}
              className={field.key === "name" || field.key === "brand" || field.key === "category" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}
            >
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                required={field.key === "name"}
                type={field.step ? "number" : "text"}
                step={field.step}
                min={field.step ? 0 : undefined}
                value={form[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={pending || !form.name.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500"
            >
              {pending ? "A guardar…" : "Guardar alimento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
