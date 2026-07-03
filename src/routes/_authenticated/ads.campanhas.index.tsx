import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { brl, num, pct, statusBadge, healthColor, healthLabel } from "@/lib/ads-utils";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/ads/campanhas/")({
  component: CampanhasList,
});

const LS_PERIODO = "mads_periodo_campanhas";
type Periodo = "24h" | "7d" | "30d" | "90d";
const PERIODOS: { v: Periodo; l: string }[] = [
  { v: "24h", l: "Últimas 24h" },
  { v: "7d", l: "Últimos 7 dias" },
  { v: "30d", l: "Últimos 30 dias" },
  { v: "90d", l: "Últimos 90 dias" },
];

function CampanhasList() {
  const savedP = (() => { try { return JSON.parse(localStorage.getItem(LS_PERIODO) ?? "null"); } catch { return null; } })();
  const [periodo, setPeriodo] = useState<Periodo>(typeof window !== "undefined" ? (savedP ?? "30d") : "30d");
  const [status, setStatus] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [health, setHealth] = useState("all");

  useEffect(() => {
    try { localStorage.setItem(LS_PERIODO, JSON.stringify(periodo)); } catch { /* ignore */ }
  }, [periodo]);

  const { data, isLoading } = useQuery({
    queryKey: ["mads", "campanhas_multi"],
    queryFn: async () => {
      const [convRes, multiRes] = await Promise.all([
        supabase.from("mads_v_conversao_vs_crm").select("*"),
        (supabase as any).from("mads_v_campaign_performance_multi").select("*"),
      ]);
      if (convRes.error) throw convRes.error;
      // multi traz as janelas de impressões/cliques/lp_views/leads/gasto; conversao traz CRM/diagnóstico.
      const multiById = new Map((multiRes.data ?? []).map((m: any) => [m.id, m]));
      return (convRes.data ?? []).map((c: any) => ({ ...(multiById.get(c.campanha_uuid) ?? {}), ...c }));
    },
  });

  const tipos = useMemo(() => [...new Set((data ?? []).map((d) => d.tipo_lead).filter(Boolean))] as string[], [data]);
  const statuses = useMemo(() => [...new Set((data ?? []).map((d) => d.status).filter(Boolean))] as string[], [data]);
  const healths = useMemo(() => [...new Set((data ?? []).map((d) => d.status_conexao).filter(Boolean))] as string[], [data]);

  const rows = (data ?? []).filter((r: any) =>
    (status === "all" || r.status === status) &&
    (tipo === "all" || r.tipo_lead === tipo) &&
    (health === "all" || r.status_conexao === health)
  ).sort((a: any, b: any) => Number(b[`gasto_${periodo}`] ?? 0) - Number(a[`gasto_${periodo}`] ?? 0));

  const periodoLabel = PERIODOS.find((p) => p.v === periodo)?.l;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Performance vs CRM · {periodoLabel}</p>
        </div>
        <Button asChild>
          <Link to="/ads/campanhas/nova"><Plus className="h-4 w-4 mr-2" /> Nova campanha</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[200px]"><span className="text-muted-foreground mr-1">Período:</span><SelectValue /></SelectTrigger>
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
              {isLoading && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhuma campanha encontrada.</TableCell></TableRow>}
              {rows.map((c: any) => {
                const ok = c.status_conexao === "ok";
                const gasto = c[`gasto_${periodo}`];
                const lpViews = c[`lp_views_${periodo}`];
                const leads = c[`leads_${periodo}`];
                const cvr = lpViews > 0 && leads != null ? (leads / lpViews) * 100 : null;
                const cpl = leads > 0 && gasto != null ? gasto / leads : null;
                return (
                  <TableRow key={c.campanha_uuid} className="cursor-pointer">
                    <TableCell>
                      <Link to="/ads/campanhas/$id" params={{ id: c.campanha_uuid ?? "" }} className="font-medium hover:underline">
                        {c.campanha_nome}
                      </Link>
                    </TableCell>
                    <TableCell><Badge variant="outline">{c.tipo_lead ?? "—"}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusBadge(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{brl(gasto)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(lpViews)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(leads)}</TableCell>
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
