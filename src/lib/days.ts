/** day_of_week: 0 = Segunda … 6 = Domingo */
export const WEEK_DAYS = [
  { value: 0, short: "Seg", label: "Segunda" },
  { value: 1, short: "Ter", label: "Terça" },
  { value: 2, short: "Qua", label: "Quarta" },
  { value: 3, short: "Qui", label: "Quinta" },
  { value: 4, short: "Sex", label: "Sexta" },
  { value: 5, short: "Sáb", label: "Sábado" },
  { value: 6, short: "Dom", label: "Domingo" },
] as const;

export type DayOfWeek = (typeof WEEK_DAYS)[number]["value"];
