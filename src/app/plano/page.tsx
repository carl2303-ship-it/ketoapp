import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function PlanoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Planeador semanal
        </h1>
        <p className="text-muted-foreground">
          Stub — schema `weekly_plans` pronto. Em breve: copiar dia e lista de
          compras.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {DAYS.map((day) => (
          <Card key={day} className="border-dashed border-border/70 bg-card/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{day}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Sem plano
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
