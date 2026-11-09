import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { brl, num, pct } from "@/lib/ads-utils";
import { rangeFromPeriodo, rangeAnterior, periodoLabel, minFetchSince, type Periodo } from "@/lib/periodo";
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";
import { CheckCircle2, AlertTriangle, DollarSign, Users, TrendingUp, UserPlus, Sparkles, ArrowRight } from "lucide-react";
import { PdfButton } from "@/components/ads/PdfButton";
import { Kpi, deltaPct, Sparkline, MiniBar, EmptyState, Section, StatusPill, useChartTheme } from "@/components/ads/kit";
import { BrandHero, GlassStat, FilterChips, Gauge, Heatmap, InsightCallout } from "@/components/ads/viz";
import { PERIODOS } from "@/lib/periodo";
import { usePermissoes } from "@/lib/permissoes";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/")({
  component: Dashboard,
});

const LS_PERIODO = "mads_periodo_dashboard";

function Dashboard() {
  const savedP = (() => { try { return JSON.parse(localStorage.getItem(LS_PERIODO) ?? "null"); } catch { return null; } })();
  const [periodo, setPeriodo] = useState<Periodo>(typeof window !== "undefined" ? (savedP ?? "7d") : "7d");
  useEffect(() => { try { localStorage.setItem(LS_PERIODO, JSON.stringify(periodo)); } catch { /* ignore */ } }, [periodo]);

  const desde = minFetchSince();
  const ct = useChartTheme();

  // Grão diário por campanha — reperiodizado no front.
  const funil = useQuery({
    queryKey: ["mads", "funil_diario", desde],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mads_v_funil_diario")
        .select("dia, campanha_uuid, campanha_nome, lp_views, leads_meta, gasto_brl, contacts_crm")
        .gte("dia", desde)
        .order("dia", { ascending: false })
        .limit(50000); // evita o corte silencioso de 1000 linhas do PostgREST (KPIs somam no front)
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
  const ant = rangeAnterior(periodo);
  const noPeriodo = (dia: string) => dia >= since && dia <= until;
  const noAnterior = (dia: string) => dia >= ant.since && dia <= ant.until;

  const linhas = useMemo(() => (funil.data ?? []).filter((r: any) => noPeriodo(r.dia)), [funil.data, since, until]);
  const linhasAnt = useMemo(() => (funil.data ?? []).filter((r: any) => noAnterior(r.dia)), [funil.data, ant.since, ant.until]);

  const soma = (rows: any[]) => {
    let gasto = 0, leads = 0, crm = 0, lp = 0;
    for (const r of rows) {
      gasto += Number(r.gasto_brl ?? 0);
      leads += Number(r.leads_meta ?? 0);
      crm += Number(r.contacts_crm ?? 0);
      lp += Number(r.lp_views ?? 0);
    }
    return { gasto, leads, crm, lp, conv: lp > 0 ? (leads / lp) * 100 : 0 };
  };
  // KPIs do período e do período anterior (para a variação %).
  const kpis = useMemo(() => soma(linhas as any[]), [linhas]);
  const kpisAnt = useMemo(() => soma(linhasAnt as any[]), [linhasAnt]);

  const mqlPeriodo = useMemo(
    () => (mqlDiario.data ?? []).filter((r: any) => noPeriodo(r.dia)).reduce((a: number, r: any) => a + Number(r.mql ?? 0), 0),
    [mqlDiario.data, since, until],
  );
  const mqlAnt = useMemo(
    () => (mqlDiario.data ?? []).filter((r: any) => noAnterior(r.dia)).reduce((a: number, r: any) => a + Number(r.mql ?? 0), 0),
    [mqlDiario.data, ant.since, ant.until],
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

  // Sparklines dos KPIs (série diária do período).
  const sparks = useMemo(() => ({
    gasto: evolucao.map((d) => d.gasto_brl),
    leads: evolucao.map((d) => d.leads_meta),
    crm: evolucao.map((d) => d.contacts_crm),
  }), [evolucao]);

  // Top 5 campanhas ATIVAS por gasto no período (+ sparkline 7d)
  const statusById = useMemo(() => new Map((campanhas.data ?? []).map((c: any) => [c.id, c.status])), [campanhas.data]);
  const top5 = useMemo(() => {
    const byCamp = new Map<string, { id: string; nome: string; gasto: number; leads: number }>();
    for (const r of linhas as any[]) {
      if ((statusById.get(r.campanha_uuid) ?? "").toLowerCase() !== "ativa") continue; // SÓ ATIVAS
      const cur = byCamp.get(r.campanha_uuid) ?? { id: r.campanha_uuid, nome: r.campanha_nome, gasto: 0, leads: 0 };
      cur.gasto += Number(r.gasto_brl ?? 0);
      cur.leads += Number(r.leads_meta ?? 0);
      byCamp.set(r.campanha_uuid, cur);
    }
    const ranked = [...byCamp.values()].filter((c) => c.gasto > 0).sort((a, b) => b.gasto - a.gasto).slice(0, 5);
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
  const topMax = top5[0]?.gasto ?? 1;

  const okCount = health.data?.find((h: any) => h.status_conexao === "ok")?.total_campanhas ?? 0;
  const problemCount = (health.data ?? []).filter((h: any) => h.status_conexao !== "ok").reduce((a: number, h: any) => a + (h.total_campanhas ?? 0), 0);
  const ativas = (campanhas.data ?? []).filter((c: any) => (c.status ?? "").toLowerCase() === "ativa").length;

  // Mapa de calor: leads da Meta por dia da semana nas últimas 8 semanas (dado diário real).
  const calor = useMemo(() => {
    const semanas = 8;
    const fim = new Date(until + "T00:00:00");
    const ini = new Date(fim); ini.setDate(fim.getDate() - semanas * 7 + 1);
    const vals = Array.from({ length: 7 }, () => Array(semanas).fill(0));
    for (const r of (funil.data ?? []) as any[]) {
      const d = new Date(r.dia + "T00:00:00");
      if (d < ini || d > fim) continue;
      const w = Math.floor((d.getTime() - ini.getTime()) / (7 * 864e5));
      vals[(d.getDay() + 6) % 7][w] += Number(r.leads_meta ?? 0);
    }
    const cols = Array.from({ length: semanas }, (_, i) => {
      const d = new Date(ini); d.setDate(ini.getDate() + i * 7);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    });
    // Melhor dia da semana (para a leitura do gráfico).
    const totais = vals.map((l) => l.reduce((a, b) => a + b, 0));
    const melhor = totais.indexOf(Math.max(...totais));
    return { rows: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"], cols, vals, melhor, total: totais.reduce((a, b) => a + b, 0) };
  }, [funil.data, until]);

  // Divisão do gasto no período entre as 5 maiores campanhas ativas (+ demais).
  const fatias = useMemo(() => {
    const top = top5.map((c) => ({ nome: c.nome, valor: c.gasto }));
    const resto = kpis.gasto - top.reduce((a, c) => a + c.valor, 0);
    return resto > 1 ? [...top, { nome: "Demais", valor: resto }] : top;
  }, [top5, kpis.gasto]);
  const coresFatias = ["#AFC041", "#738A25", "#D9DFA2", "#EAECC8", "#5b6b1e", "#8a8f7a"];

  const perm = usePermissoes();
  const navigate = useNavigate();
  const primeiroNome = (perm.nome ?? "").split(" ")[0] || null;
  const cpmql = mqlPeriodo > 0 ? kpis.gasto / mqlPeriodo : 0;
  const saudePct = okCount + problemCount > 0 ? (okCount / (okCount + problemCount)) * 100 : 0;

  const carregando = funil.isLoading || campanhas.isLoading;
  const temDados = evolucao.length > 0;

  return (
    <div className="space-y-6">
      <BrandHero
        nome={primeiroNome}
        eyebrow={perm.empresa?.nome ?? "IAplicada Ads"}
        subtitle={<>{periodoLabel(periodo)} · {ativas} campanha{ativas === 1 ? "" : "s"} ativa{ativas === 1 ? "" : "s"} · variação vs. período anterior</>}
        actions={
          <>
            <PdfButton
              label="Relatório mensal"
              build={async () => {
                const { baixarRelatorioGeral } = await import("@/lib/pdf/relatorios");
                const { data: conv } = await supabase.from("mads_v_conversao_vs_crm").select("*");
                const lista = [...(conv ?? [])].sort((a: any, b: any) => (b.gasto_30d_brl ?? 0) - (a.gasto_30d_brl ?? 0));
                const ativasL = lista.filter((c: any) => (c.status ?? "").toLowerCase() === "ativa").length;
                const totalGasto = lista.reduce((a: number, c: any) => a + (c.gasto_30d_brl ?? 0), 0);
                const totalLeadsMeta = lista.reduce((a: number, c: any) => a + (c.leads_meta_30d ?? 0), 0);
                const totalCrm = lista.reduce((a: number, c: any) => a + (c.contacts_crm_30d ?? 0), 0);
                const totalLp = lista.reduce((a: number, c: any) => a + (c.lp_views_30d ?? 0), 0);
                const { data: topAds } = await supabase
                  .from("mads_v_top_ads_30d").select("ad_nome, gasto_brl, ctr_pct, cpl_brl").order("gasto_brl", { ascending: false }).limit(10);
                await baixarRelatorioGeral(
                  { gasto: totalGasto, leadsMeta: totalLeadsMeta, contactsCrm: totalCrm, conv: totalLp > 0 ? (totalLeadsMeta / totalLp) * 100 : 0, campanhasAtivas: ativasL },
                  lista, topAds ?? [],
                );
              }}
            />
          </>
        }
      >
        <GlassStat icon={DollarSign} label={`Investimento · ${periodoLabel(periodo)}`} value={brl(kpis.gasto)} detail={kpisAnt.gasto ? `${brl(kpisAnt.gasto)} no período anterior` : undefined} />
        <GlassStat icon={Users} label="Leads Meta" value={num(kpis.leads)} detail={kpis.leads > 0 ? `CPL ${brl(kpis.gasto / kpis.leads)}` : undefined} />
        <GlassStat icon={Sparkles} label="MQL" value={num(mqlPeriodo)} detail={cpmql > 0 ? `CPMQL ${brl(cpmql)}` : undefined} />
        <GlassStat icon={CheckCircle2} label="Conexões saudáveis" value={`${okCount}${problemCount ? ` / ${okCount + problemCount}` : ""}`} detail={problemCount ? `${problemCount} com problema` : "Tudo certo"} />
      </BrandHero>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips options={PERIODOS} value={periodo} onChange={(v) => setPeriodo(v as Periodo)} />
        <span className="text-xs text-muted-foreground">Atualiza todos os cards e gráficos</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4 stagger">
        <Kpi icon={DollarSign} tone="primary" label={`Gasto · ${periodoLabel(periodo)}`} value={brl(kpis.gasto)} delta={deltaPct(kpis.gasto, kpisAnt.gasto)} deltaInvert spark={sparks.gasto} loading={carregando} />
        <Kpi icon={Users} tone="info" label="Leads Meta" value={num(kpis.leads)} delta={deltaPct(kpis.leads, kpisAnt.leads)} spark={sparks.leads} loading={carregando} />
        <Kpi icon={UserPlus} tone="success" label="Contatos CRM" value={num(kpis.crm)} delta={deltaPct(kpis.crm, kpisAnt.crm)} spark={sparks.crm} loading={carregando} />
        <Kpi icon={Sparkles} tone="brand" label="MQL" value={num(mqlPeriodo)} delta={deltaPct(mqlPeriodo, mqlAnt)} hint={mqlPeriodo > 0 && kpis.gasto > 0 ? `CPMQL ${brl(kpis.gasto / mqlPeriodo)}` : undefined} loading={mqlDiario.isLoading} />
        <Kpi icon={TrendingUp} tone="warning" label="Conversão LP → lead" value={pct(kpis.conv)} delta={deltaPct(kpis.conv, kpisAnt.conv)} hint="pts vs. anterior" loading={carregando} />
        <Card className={cn("relative overflow-hidden", problemCount > 0 ? "border-danger/40" : "border-success/30")}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs font-medium text-muted-foreground">Saúde das conexões</div>
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", problemCount > 0 ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
                {problemCount > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              </div>
            </div>
            <div className="mt-1.5 font-display text-[26px] font-semibold tracking-tight tabular-nums leading-none">
              {okCount} <span className="text-base text-muted-foreground font-medium">OK</span>
              {problemCount > 0 && <span className="text-danger"> · {problemCount}</span>}
            </div>
            <Link to="/ads/saude" className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
              {problemCount > 0 ? `${problemCount} com problema` : "Ver detalhes"} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Evolução */}
        <Section
          className="xl:col-span-2"
          title="Evolução — Meta vs CRM"
          description={`Leads da Meta, contatos novos no CRM e gasto diário · ${periodoLabel(periodo)}`}
          actions={
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: ct.primary }} />Gasto</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: ct.blue }} />Leads Meta</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: ct.green }} />CRM</span>
            </div>
          }
        >
          <div className="h-72 sm:h-80">
            {carregando ? <Skeleton className="h-full w-full rounded-xl" /> : !temDados ? (
              <EmptyState title="Sem dados no período" description="Nenhuma campanha registrou gasto ou leads nesse intervalo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolucao} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gGasto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ct.primary} stopOpacity={0.42} />
                      <stop offset="100%" stopColor={ct.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" vertical={false} opacity={0.6} />
                  <XAxis dataKey="dia" tick={ct.tick} axisLine={false} tickLine={false} tickFormatter={(d) => d?.slice(5)} minTickGap={24} />
                  <YAxis yAxisId="left" tick={ct.tick} axisLine={false} tickLine={false} width={40} />
                  <YAxis yAxisId="right" orientation="right" tick={ct.tick} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip {...ct.tooltip} formatter={(v: any, name: any) => [name === "Gasto R$" ? brl(Number(v)) : num(Number(v)), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  <Area yAxisId="right" type="monotone" dataKey="gasto_brl" stroke={ct.primary} strokeWidth={2.5} fill="url(#gGasto)" name="Gasto R$" dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: ct.primary, fill: "var(--color-card)" }} style={{ filter: `drop-shadow(0 6px 10px ${ct.primary}55)` }} animationDuration={900} />
                  <Line yAxisId="left" type="monotone" dataKey="leads_meta" stroke={ct.blue} strokeWidth={2.25} name="Leads Meta" dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: ct.blue, fill: "var(--color-card)" }} style={{ filter: `drop-shadow(0 4px 8px ${ct.blue}66)` }} animationDuration={900} />
                  <Line yAxisId="left" type="monotone" dataKey="contacts_crm" stroke={ct.green} strokeWidth={2.25} name="Contacts CRM" dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: ct.green, fill: "var(--color-card)" }} style={{ filter: `drop-shadow(0 4px 8px ${ct.green}66)` }} animationDuration={900} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>

        {/* Top 5 */}
        <Section
          title="Top 5 campanhas ativas"
          description={`Por gasto · ${periodoLabel(periodo)} · sparkline 7 dias`}
          actions={<Link to="/ads/campanhas" className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1">Ver todas <ArrowRight className="h-3 w-3" /></Link>}
          bodyClassName="px-2 sm:px-3 pb-2 sm:pb-3"
        >
          <div className="space-y-1">
            {carregando && [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            {!carregando && top5.map((c, i) => (
              <Link
                key={c.id}
                to="/ads/campanhas/$id"
                params={{ id: c.id }}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/60"
              >
                <div className="h-7 w-7 shrink-0 rounded-lg bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center tabular-nums group-hover:bg-primary/12 group-hover:text-primary transition-colors">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-medium leading-snug line-clamp-2" title={c.nome}>{c.nome}</div>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <MiniBar value={c.gasto} max={topMax} className="flex-1" />
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{num(c.leads)} leads</span>
                  </div>
                </div>
                <Sparkline data={c.spark} width={56} height={22} className="hidden 2xl:block" />
                <div className="text-right tabular-nums shrink-0 w-[88px] text-[13px] font-semibold">{brl(c.gasto)}</div>
              </Link>
            ))}
            {!carregando && top5.length === 0 && <EmptyState title="Nenhuma campanha ativa com gasto" description="Ative uma campanha ou amplie o período." />}
          </div>
        </Section>
      </div>

      {/* Variedade de leituras: ritmo semanal, saúde e divisão do investimento. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <Section className="xl:col-span-2" title="Ritmo de leads" description="Leads da Meta por dia da semana · últimas 8 semanas">
          {calor.total > 0 && (
            <InsightCallout className="mb-4">
              {calor.rows[calor.melhor]} é o dia que mais gera leads nas últimas 8 semanas ({num(calor.vals[calor.melhor].reduce((a: number, b: number) => a + b, 0))} de {num(calor.total)}).
            </InsightCallout>
          )}
          {carregando ? <Skeleton className="h-56 w-full rounded-xl" /> : (
            <Heatmap rows={calor.rows} cols={calor.cols} values={calor.vals} format={(v) => `${num(v)} leads`} />
          )}
        </Section>

        <Section title="Saúde das conexões" description="Campanhas com Meta e CRM conectados" actions={<Link to="/ads/saude" className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1">Detalhes <ArrowRight className="h-3 w-3" /></Link>}>
          <div className="h-full flex flex-col items-center justify-center gap-4 py-2">
            <Gauge value={saudePct} label={`${okCount} de ${okCount + problemCount} campanhas OK`} />
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="rounded-xl bg-success-soft px-3 py-2 text-center"><div className="text-lg font-semibold tabular-nums text-success">{okCount}</div><div className="text-[11px] text-muted-foreground">saudáveis</div></div>
              <div className={cn("rounded-xl px-3 py-2 text-center", problemCount ? "bg-danger-soft" : "bg-muted")}><div className={cn("text-lg font-semibold tabular-nums", problemCount ? "text-danger" : "text-muted-foreground")}>{problemCount}</div><div className="text-[11px] text-muted-foreground">com problema</div></div>
            </div>
          </div>
        </Section>

        <Section className="xl:col-span-3" title="Para onde foi o investimento" description={`Divisão do gasto entre as campanhas ativas · ${periodoLabel(periodo)}`}>
          {fatias.length === 0 ? <EmptyState title="Sem gasto no período" /> : (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-6 items-center">
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fatias} dataKey="valor" nameKey="nome" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="none" cornerRadius={6}
                      animationDuration={900} onClick={(d: any) => { const c = top5.find((t) => t.nome === d?.nome); if (c) navigate({ to: "/ads/campanhas/$id", params: { id: c.id } }); }}>
                      {fatias.map((_, k) => <Cell key={k} fill={coresFatias[k % coresFatias.length]} className="cursor-pointer outline-none" style={{ filter: k === 0 ? "drop-shadow(0 0 8px #AFC04188)" : undefined }} />)}
                    </Pie>
                    <Tooltip {...ct.tooltip} formatter={(v: any, n: any) => [brl(Number(v)), n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[11px] text-muted-foreground">Total</div>
                  <div className="font-display text-xl font-semibold tabular-nums">{brl(kpis.gasto)}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {fatias.map((f, k) => (
                  <div key={f.nome} className="flex items-center gap-2.5 min-w-0 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: coresFatias[k % coresFatias.length], boxShadow: `0 0 8px ${coresFatias[k % coresFatias.length]}` }} />
                    <span className="text-xs truncate flex-1">{f.nome}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{kpis.gasto ? `${((f.valor / kpis.gasto) * 100).toFixed(0)}%` : "—"}</span>
                    <span className="text-xs tabular-nums font-semibold w-24 text-right">{brl(f.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function cn(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(" "); }
