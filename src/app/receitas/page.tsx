import { Card, CardContent } from "@/components/ui/card";

export default function ReceitasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Receitas & batidos
        </h1>
        <p className="text-muted-foreground">
          Stub — tabelas `recipes` e `recipe_items` no schema. Construtor em
          breve.
        </p>
      </div>
      <Card className="border-dashed border-border/70 bg-card/40">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Agrupa alimentos numa receita e envia para o diário com 1 clique.
        </CardContent>
      </Card>
    </div>
  );
}
