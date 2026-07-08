import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { brl, num, pct, statusBadge, healthColor, healthLabel } from "@/lib/ads-utils";
import { PERIODOS, rangeFromPeriodo, periodoLabel, minFetchSince, type Periodo } from "@/lib/periodo";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/ads/campanhas/")({
  component: CampanhasList,
});

// Período compartilhado com dashboard/insights/criativos/anúncios.
const LS_PERIODO = "mads_periodo_dashboard";

function CampanhasList() {
  const savedP = (() => { try { return JSON.parse(localStorage.getItem(LS_PERIODO) ?? "null"); } catch { return null; } })();
  const [periodo, setPeriodo] = useState<Periodo>(typeof window !== "undefined" ? (savedP ?? "7d") : "7d");
  const [status, setStatus] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [health, setHealth] = useState("all");

  useEffect(() => { try { localStorage.setItem(LS_PERIODO, JSON.stringify(periodo)); } catch { /* ignore */ } }, [periodo]);

  const desde = minFetchSince();

  const { data, isLoading } = useQuery({
    queryKey: ["mads", "campanhas_conv"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_conversao_vs_crm").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Grão diário por campanha — reperiodizado no front (mesma fonte do dashboard).
  const funil = useQuery({
    queryKey: ["mads", "funil_diario_campanhas", desde],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mads_v_funil_diario")
        .select("dia, campanha_uuid, lp_views, leads_meta, gasto_brl")
        .gte("dia", desde);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { since, until } = rangeFromPeriodo(periodo);

  // Soma por campanha dentro do período selecionado.
  const metricasPorCamp = useMemo(() => {
    const m = new Map<string, { gasto: number; lp_views: number; leads: number }>();
    for (const r of (funil.data ?? []) as any[]) {
      if (r.dia < since || r.dia > until) continue;
      const cur = m.get(r.campanha_uuid) ?? { gasto: 0, lp_views: 0, leads: 0 };
      cur.gasto += Number(r.gasto_brl ?? 0);
      cur.lp_views += Number(r.lp_views ?? 0);
      cur.leads += Number(r.leads_meta ?? 0);
      m.set(r.campanha_uuid, cur);
    }
    return m;
  }, [funil.data, since, until]);

  const tipos = useMemo(() => [...new Set((data ?? []).map((d: any) => d.tipo_lead).filter(Boolean))] as string[], [data]);
  const statuses = useMemo(() => [...new Set((data ?? []).map((d: any) => d.status).filter(Boolean))] as string[], [data]);
  const healths = useMemo(() => [...new Set((data ?? []).map((d: any) => d.status_conexao).filter(Boolean))] as string[], [data]);

  // Ativas primeiro, depois pausadas; dentro do grupo, maior gasto no período no topo.
  const ativoRank = (r: any) => ((r.status ?? "").toLowerCase() === "ativa" ? 0 : 1);
  const rows = (data ?? []).filter((r: any) =>
    (status === "all" || r.status === status) &&
    (tipo === "all" || r.tipo_lead === tipo) &&
    (health === "all" || r.status_conexao === health)
  ).sort((a: any, b: any) => ativoRank(a) - ativoRank(b) || (metricasPorCamp.get(b.campanha_uuid)?.gasto ?? 0) - (metricasPorCamp.get(a.campanha_uuid)?.gasto ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Performance vs CRM · {periodoLabel(periodo)}</p>
        </div>
        <Button asChild>
          <Link to="/ads/campanhas/nova"><Plus className="h-4 w-4 mr-2" /> Nova campanha</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[190px]"><span className="text-muted-foreground mr-1">Período:</span><SelectValue /></SelectTrigger>
          <SelectContent>{PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
        </Select>
        <Filter v={status} on={setStatus} placeholder="Status" opts={statuses} />
        <Filter v={tipo} on={setTipo} placeholder="Tipo" opts={tipos} />
        <Filter v={health} on={setHealth} placeholder="Health" opts={healths} labelFn={healthLabel} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">LP Views</TableHead>
                <TableHead className="text-right">Leads Meta</TableHead>
                <TableHead className="text-right">Contacts CRM (30d)</TableHead>
                <TableHead className="text-right">Conv %</TableHead>
                <TableHead className="text-right">CPL</TableHead>
                <TableHead>Diagnóstico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading || funil.isLoading) && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhuma campanha encontrada.</TableCell></TableRow>}
              {rows.map((c: any) => {
                const ok = c.status_conexao === "ok";
                const met = metricasPorCamp.get(c.campanha_uuid) ?? { gasto: 0, lp_views: 0, leads: 0 };
                const cvr = met.lp_views > 0 ? (met.leads / met.lp_views) * 100 : null;
                const cpl = met.leads > 0 ? met.gasto / met.leads : null;
                return (
                  <TableRow key={c.campanha_uuid} className="cursor-pointer">
                    <TableCell>
                      <Link to="/ads/campanhas/$id" params={{ id: c.campanha_uuid ?? "" }} className="font-medium hover:underline">
                        {c.campanha_nome}
                      </Link>
                    </TableCell>
                    <TableCell><Badge variant="outline">{c.tipo_lead ?? "—"}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusBadge(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{brl(met.gasto)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(met.lp_views)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(met.leads)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(c.contacts_crm_30d)}</TableCell>
                    <TableCell className="text-right tabular-nums">{cvr == null ? "—" : pct(cvr)}</TableCell>
                    <TableCell className="text-right tabular-nums">{cpl == null ? "—" : brl(cpl)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[280px]">
                        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />}
                        <span className={`text-xs ${healthColor(c.status_conexao).split(" ")[1]}`}>{c.diagnostico ?? healthLabel(c.status_conexao)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Filter({ v, on, placeholder, opts, labelFn }: { v: string; on: (s: string) => void; placeholder: string; opts: string[]; labelFn?: (s: string) => string }) {
  return (
    <Select value={v} onValueChange={on}>
      <SelectTrigger className="w-[200px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos — {placeholder}</SelectItem>
        {opts.map((o) => <SelectItem key={o} value={o}>{labelFn ? labelFn(o) : o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
