import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export type Periodo = "7d" | "30d" | "90d" | "mes_atual" | "mes_anterior";

export const PERIODOS: { v: Periodo; l: string }[] = [
  { v: "7d", l: "Últimos 7 dias" },
  { v: "30d", l: "Últimos 30 dias" },
  { v: "90d", l: "Últimos 90 dias" },
  { v: "mes_atual", l: "Este mês" },
  { v: "mes_anterior", l: "Mês anterior" },
];

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Intervalo [since, until] (YYYY-MM-DD, inclusivo) do período escolhido. */
export function rangeFromPeriodo(p: Periodo, hoje: Date = new Date()): { since: string; until: string } {
  switch (p) {
    case "7d": return { since: iso(subDays(hoje, 6)), until: iso(hoje) };
    case "30d": return { since: iso(subDays(hoje, 29)), until: iso(hoje) };
    case "90d": return { since: iso(subDays(hoje, 89)), until: iso(hoje) };
    case "mes_atual": return { since: iso(startOfMonth(hoje)), until: iso(hoje) };
    case "mes_anterior": {
      const anterior = subMonths(hoje, 1);
      return { since: iso(startOfMonth(anterior)), until: iso(endOfMonth(anterior)) };
    }
  }
}

export function periodoLabel(p: Periodo): string {
  return PERIODOS.find((x) => x.v === p)?.l ?? p;
}

/** Data mais antiga que precisa ser buscada para cobrir qualquer opção num único fetch diário. */
export function minFetchSince(hoje: Date = new Date()): string {
  const candidatos = [subDays(hoje, 89), startOfMonth(subMonths(hoje, 1))];
  const min = candidatos.reduce((a, b) => (a < b ? a : b));
  return iso(min);
}

/** Período imediatamente anterior de mesma duração (para variação %). */
export function rangeAnterior(p: Periodo, hoje: Date = new Date()): { since: string; until: string } {
  const atual = rangeFromPeriodo(p, hoje);
  const d1 = new Date(atual.since + "T00:00:00");
  const d2 = new Date(atual.until + "T00:00:00");
  const dias = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
  return { since: iso(subDays(d1, dias)), until: iso(subDays(d1, 1)) };
}
