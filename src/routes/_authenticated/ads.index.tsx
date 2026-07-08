import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl, num, pct, statusBadge } from "@/lib/ads-utils";
import { PERIODOS, rangeFromPeriodo, periodoLabel, minFetchSince, type Periodo } from "@/lib/periodo";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { CheckCircle2, AlertTriangle, DollarSign, Users, TrendingUp, UserPlus, Sparkles } from "lucide-react";
import { PdfButton } from "@/components/ads/PdfButton";

export const Route = createFileRoute("/_authenticated/ads/")({
  component: Dashboard,
});

const LS_PERIODO = "mads_periodo_dashboard";

function Dashboard() {
  const savedP = (() => { try { return JSON.parse(localStorage.getItem(LS_PERIODO) ?? "null"); } catch { return null; } })();
  const [periodo, setPeriodo] = useState<Periodo>(typeof window !== "undefined" ? (savedP ?? "7d") : "7d");
  useEffect(() => { try { localStorage.setItem(LS_PERIODO, JSON.stringify(periodo)); } catch { /* ignore */ } }, [periodo]);

  const desde = minFetchSince();

  // Grão diário por campanha — reperiodizado no front.
  const funil = useQuery({
    queryKey: ["mads", "funil_diario", desde],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mads_v_funil_diario")
        .select("dia, campanha_uuid, campanha_nome, lp_views, leads_meta, gasto_brl, contacts_crm")
        .gte("dia", desde);
      if (error) throw error;
      return data ?? [];
    },
  });

  const mqlDiario = useQuery({
    queryKey: ["mads", "mql_diario", desde],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("mads_v_mql_diario").select("dia, mql").gte("dia", desde);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const campanhas = useQuery({
    queryKey: ["mads", "campanhas_status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_campaigns").select("id, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const health = useQuery({
    queryKey: ["mads", "health"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_health_check").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { since, until } = rangeFromPeriodo(periodo);
  const noPeriodo = (dia: string) => dia >= since && dia <= until;

  const linhas = useMemo(() => (funil.data ?? []).filter((r: any) => noPeriodo(r.dia)), [funil.data, since, until]);

  // KPIs do período
  const kpis = useMemo(() => {
    let gasto = 0, leads = 0, crm = 0, lp = 0;
    for (const r of linhas as any[]) {
      gasto += Number(r.gasto_brl ?? 0);
      leads += Number(r.leads_meta ?? 0);
      crm += Number(r.contacts_crm ?? 0);
      lp += Number(r.lp_views ?? 0);
    }
    return { gasto, leads, crm, conv: lp > 0 ? (leads / lp) * 100 : 0 };
  }, [linhas]);

  const mqlPeriodo = useMemo(
    () => (mqlDiario.data ?? []).filter((r: any) => noPeriodo(r.dia)).reduce((a: number, r: any) => a + Number(r.mql ?? 0), 0),
    [mqlDiario.data, since, until],
  );

  // Evolução (agrega por dia dentro do período)
  const evolucao = useMemo(() => {
    const byDay = new Map<string, { dia: string; leads_meta: number; contacts_crm: number; gasto_brl: number }>();
    for (const r of linhas as any[]) {
      const cur = byDay.get(r.dia) ?? { dia: r.dia, leads_meta: 0, contacts_crm: 0, gasto_brl: 0 };
      cur.leads_meta += Number(r.leads_meta ?? 0);
      cur.contacts_crm += Number(r.contacts_crm ?? 0);
      cur.gasto_brl += Number(r.gasto_brl ?? 0);
      byDay.set(r.dia, cur);
    }
    return [...byDay.values()].sort((a, b) => a.dia.localeCompare(b.dia));
  }, [linhas]);

  // Top 5 campanhas ATIVAS por gasto no período (+ sparkline 7d)
  const statusById = useMemo(() => new Map((campanhas.data ?? []).map((c: any) => [c.id, c.status])), [campanhas.data]);
  const top5 = useMemo(() => {
    const byCamp = new Map<string, { id: string; nome: string; gasto: number }>();
    for (const r of linhas as any[]) {
      if ((statusById.get(r.campanha_uuid) ?? "").toLowerCase() !== "ativa") continue; // SÓ ATIVAS
      const cur = byCamp.get(r.campanha_uuid) ?? { id: r.campanha_uuid, nome: r.campanha_nome, gasto: 0 };
      cur.gasto += Number(r.gasto_brl ?? 0);
      byCamp.set(r.campanha_uuid, cur);
    }
    const ranked = [...byCamp.values()].filter((c) => c.gasto > 0).sort((a, b) => b.gasto - a.gasto).slice(0, 5);
    // sparkline: gasto por dia nos 7 dias até 'until' (usa todos os dias buscados, não só o período)
    const dias7: string[] = [];
    const base = new Date(until + "T00:00:00");
    for (let i = 6; i >= 0; i--) { const d = new Date(base); d.setDate(base.getDate() - i); dias7.push(d.toISOString().slice(0, 10)); }
    return ranked.map((c) => {
      const perDay = new Map<string, number>();
      for (const r of (funil.data ?? []) as any[]) {
        if (r.campanha_uuid !== c.id) continue;
        perDay.set(r.dia, (perDay.get(r.dia) ?? 0) + Number(r.gasto_brl ?? 0));
      }
      return { ...c, spark: dias7.map((d) => perDay.get(d) ?? 0) };
    });
  }, [linhas, statusById, funil.data, until]);

  const okCount = health.data?.find((h: any) => h.status_conexao === "ok")?.total_campanhas ?? 0;
  const problemCount = (health.data ?? []).filter((h: any) => h.status_conexao !== "ok").reduce((a: number, h: any) => a + (h.total_campanhas ?? 0), 0);

  const carregando = funil.isLoading || campanhas.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral · {periodoLabel(periodo)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-[180px]"><span className="text-muted-foreground mr-1">Período:</span><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
          </Select>
          <PdfButton
            label="Relatório mensal"
            build={async () => {
              const { baixarRelatorioGeral } = await import("@/lib/pdf/relatorios");
              const { data: conv } = await supabase.from("mads_v_conversao_vs_crm").select("*");
              const lista = [...(conv ?? [])].sort((a: any, b: any) => (b.gasto_30d_brl ?? 0) - (a.gasto_30d_brl ?? 0));
              const ativas = lista.filter((c: any) => (c.status ?? "").toLowerCase() === "ativa").length;
              const totalGasto = lista.reduce((a: number, c: any) => a + (c.gasto_30d_brl ?? 0), 0);
              const totalLeadsMeta = lista.reduce((a: number, c: any) => a + (c.leads_meta_30d ?? 0), 0);
              const totalCrm = lista.reduce((a: number, c: any) => a + (c.contacts_crm_30d ?? 0), 0);
              const totalLp = lista.reduce((a: number, c: any) => a + (c.lp_views_30d ?? 0), 0);
              const { data: topAds } = await supabase
                .from("mads_v_top_ads_30d").select("ad_nome, gasto_brl, ctr_pct, cpl_brl").order("gasto_brl", { ascending: false }).limit(10);
              await baixarRelatorioGeral(
                { gasto: totalGasto, leadsMeta: totalLeadsMeta, contactsCrm: totalCrm, conv: totalLp > 0 ? (totalLeadsMeta / totalLp) * 100 : 0, campanhasAtivas: ativas },
                lista, topAds ?? [],
              );
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Kpi icon={DollarSign} label={`Gasto · ${periodoLabel(periodo)}`} value={brl(kpis.gasto)} />
        <Kpi icon={Users} label="Leads Meta" value={num(kpis.leads)} />
        <Kpi icon={UserPlus} label="Contatos CRM" value={num(kpis.crm)} />
        <Kpi icon={Sparkles} label="MQL" value={num(mqlPeriodo)} />
        <Kpi icon={TrendingUp} label="Conversão média" value={pct(kpis.conv)} />
        <Card className={problemCount > 0 ? "border-red-500/40" : "border-emerald-500/40"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {problemCount > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              Health check
            </div>
            <div className="mt-2 text-lg font-semibold tabular-nums">
              {okCount} OK · <span className={problemCount > 0 ? "text-red-400" : ""}>{problemCount} problema</span>
            </div>
            <Link to="/ads/saude" className="text-xs text-primary hover:underline">Ver detalhes →</Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução — Meta vs CRM</CardTitle>
          <CardDescription>Leads Meta vs contatos novos no CRM, com gasto diário · {periodoLabel(periodo)}</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {carregando ? <Skel /> : evolucao.length === 0 ? <Empty msg="Sem dados no período." /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(d) => d?.slice(5)} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="leads_meta" stroke="#3b82f6" strokeWidth={2} name="Leads Meta" dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="contacts_crm" stroke="#10b981" strokeWidth={2} name="Contacts CRM" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="gasto_brl" stroke="#f59e0b" strokeWidth={2} name="Gasto R$" dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 campanhas ativas por gasto — {periodoLabel(periodo)}</CardTitle>
          <CardDescription>Somente campanhas com status ativo agora · sparkline dos últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {top5.map((c) => (
              <Link key={c.id} to="/ads/campanhas/$id" params={{ id: c.id }} className="flex items-center justify-between gap-4 p-3 rounded-md border border-border hover:bg-muted/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{c.nome}</div>
                  <div className="text-xs text-muted-foreground mt-1"><Badge variant="outline" className={statusBadge("ativa")}>ativa</Badge></div>
                </div>
                <Sparkline data={c.spark} />
                <div className="text-right tabular-nums shrink-0 w-24">
                  <div className="font-semibold">{brl(c.gasto)}</div>
                </div>
              </Link>
            ))}
            {top5.length === 0 && !carregando && <Empty msg="Nenhuma campanha ativa com gasto no período." />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

// Sparkline SVG minimalista (sem dependência pesada por linha).
function Sparkline({ data }: { data: number[] }) {
  const w = 96, h = 28, pad = 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0 hidden sm:block" aria-hidden>
      <polyline points={pts} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Skel() { return <div className="h-full w-full animate-pulse bg-muted/30 rounded-md" />; }
function Empty({ msg }: { msg: string }) { return <div className="text-sm text-muted-foreground text-center py-8">{msg}</div>; }
