import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl, num } from "@/lib/ads-utils";
import { PERIODOS, rangeFromPeriodo, rangeAnterior, periodoLabel, type Periodo } from "@/lib/periodo";
import { DuplicarAdDialog, type DupTarget } from "@/components/ads/DuplicarAdDialog";
import { AbrirNoMetaButton, urlMetaAd } from "@/components/ads/AbrirNoMeta";
import { Trophy, Flame, Lightbulb, Copy, ArrowUpRight, ArrowDownRight, Minus, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ads/insights")({
  component: Insights,
});

// Mesma chave do dashboard: a escolha de período é compartilhada entre as duas telas.
const LS_PERIODO = "mads_periodo_dashboard";

function Insights() {
  const savedP = (() => { try { return JSON.parse(localStorage.getItem(LS_PERIODO) ?? "null"); } catch { return null; } })();
  const [periodo, setPeriodo] = useState<Periodo>(typeof window !== "undefined" ? (savedP ?? "7d") : "7d");
  useEffect(() => { try { localStorage.setItem(LS_PERIODO, JSON.stringify(periodo)); } catch { /* ignore */ } }, [periodo]);

  const { since, until } = rangeFromPeriodo(periodo);
  const prev = rangeAnterior(periodo);
  // Piso do fetch diário: cobre o período anterior de até 90d (≈180d atrás).
  const floor = format(subDays(new Date(), 190), "yyyy-MM-dd");

  // Atribuição por-ad na janela selecionada (função SQL parametrizável).
  const adsCrm = useQuery({
    queryKey: ["mads", "fn_ads_crm", since, until],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("mads_f_ads_crm", { p_since: since, p_until: until });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const mqlDiario = useQuery({
    queryKey: ["mads", "mql_diario", floor],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("mads_v_mql_diario").select("dia, mql").gte("dia", floor);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const funil = useQuery({
    queryKey: ["mads", "funil_crm_insights", floor],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_funil_diario").select("dia, contacts_crm").gte("dia", floor);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Qualificação por LP na janela (reusa a função das LPs).
  const lpPerf = useQuery({
    queryKey: ["mads", "lp_perf_insights", since, until],
    queryFn: async () => {
      const [fnRes, lpsRes] = await Promise.all([
        (supabase as any).rpc("mads_f_lp_performance", { p_since: since, p_until: until }),
        supabase.from("mads_lps").select("id, nome, ativa"),
      ]);
      const lpById = new Map((lpsRes.data ?? []).map((l: any) => [l.id, l]));
      return (fnRes.data ?? []).map((f: any) => {
        const l: any = lpById.get(f.id) ?? {};
        return {
          id: f.id, nome: l.nome ?? "—", gasto: Number(f.gasto_meta ?? 0),
          submissions: Number(f.submissions ?? 0), mql: Number(f.mql ?? 0),
          cpmql: Number(f.mql ?? 0) > 0 ? Number(f.gasto_meta ?? 0) / Number(f.mql) : null,
          cvrMql: Number(f.submissions ?? 0) > 0 ? (Number(f.mql ?? 0) / Number(f.submissions)) * 100 : null,
        };
      });
    },
  });

  const [dupAd, setDupAd] = useState<DupTarget | null>(null);
  const ads: any[] = adsCrm.data ?? [];
  const lps: any[] = lpPerf.data ?? [];
  const lpMelhor = useMemo(() => lps.filter((l) => l.mql > 0 && l.cpmql != null).sort((a, b) => a.cpmql - b.cpmql).slice(0, 3), [lps]);
  const lpQueimando = useMemo(() => lps.filter((l) => l.mql === 0 && l.gasto > 0).sort((a, b) => b.gasto - a.gasto).slice(0, 3), [lps]);

  // ---- Seção 1: diagnóstico geral (período atual vs período anterior de mesma duração) ----
  const somaEntre = (rows: any[], campo: string, a: string, b: string) =>
    rows.filter((r) => r.dia >= a && r.dia <= b).reduce((s, r) => s + Number(r[campo] ?? 0), 0);

  const leadsCrmAtual = somaEntre(funil.data ?? [], "contacts_crm", since, until);
  const leadsCrmAnt = somaEntre(funil.data ?? [], "contacts_crm", prev.since, prev.until);
  const mqlAtual = somaEntre(mqlDiario.data ?? [], "mql", since, until);
  const mqlAnt = somaEntre(mqlDiario.data ?? [], "mql", prev.since, prev.until);
  const taxaAtual = leadsCrmAtual > 0 ? (mqlAtual / leadsCrmAtual) * 100 : null;
  const taxaAnt = leadsCrmAnt > 0 ? (mqlAnt / leadsCrmAnt) * 100 : null;

  const cpmqlPorProduto = useMemo(() => {
    const acc = new Map<string, { gasto: number; mql: number }>();
    for (const a of ads) {
      if (a.mql <= 0) continue;
      const cur = acc.get(a.produto) ?? { gasto: 0, mql: 0 };
      cur.gasto += Number(a.gasto ?? 0); cur.mql += Number(a.mql ?? 0);
      acc.set(a.produto, cur);
    }
    return [...acc.entries()].map(([produto, v]) => ({ produto, cpmql: v.mql > 0 ? v.gasto / v.mql : null })).sort((x, y) => (x.cpmql ?? 1e9) - (y.cpmql ?? 1e9));
  }, [ads]);

  const voltando = useMemo(() => ads.filter((a: any) => a.mql > 0 && a.cpmql_brl != null).sort((a: any, b: any) => (a.cpmql_brl ?? 1e9) - (b.cpmql_brl ?? 1e9)).slice(0, 3), [ads]);
  const sumindo = useMemo(() => ads.filter((a: any) => a.mql === 0 && Number(a.gasto ?? 0) > 0).sort((a: any, b: any) => Number(b.gasto ?? 0) - Number(a.gasto ?? 0)).slice(0, 3), [ads]);

  const recomendacoes = useMemo(() => {
    const recs: { tone: string; texto: string }[] = [];
    const comMql = ads.filter((a: any) => a.mql > 0);
    const gastoMql = comMql.reduce((s: number, a: any) => s + Number(a.gasto ?? 0), 0);
    const totalMql = comMql.reduce((s: number, a: any) => s + Number(a.mql ?? 0), 0);
    const cpmqlMedio = totalMql > 0 ? gastoMql / totalMql : null;

    if (cpmqlMedio != null && cpmqlMedio < 100) recs.push({ tone: "verde", texto: `CPMQL médio em ${brl(cpmqlMedio)} (saudável). Escalar as campanhas Business vencedoras com boost de ~20% no orçamento.` });
    else if (cpmqlMedio != null && cpmqlMedio > 200) recs.push({ tone: "vermelho", texto: `CPMQL médio em ${brl(cpmqlMedio)} (alto). Reduzir gasto ~30% e refazer criativos antes de escalar.` });
    else if (cpmqlMedio != null) recs.push({ tone: "amarelo", texto: `CPMQL médio em ${brl(cpmqlMedio)}. Zona intermediária — otimizar criativos e segmentação antes de escalar.` });

    for (const a of ads.filter((a: any) => a.leads_meta > 5 && a.mql === 0).sort((a: any, b: any) => Number(b.gasto ?? 0) - Number(a.gasto ?? 0)).slice(0, 3))
      recs.push({ tone: "vermelho", texto: `"${a.ad_nome}" tem ${num(a.leads_meta)} leads Meta e 0 MQL — provável público errado. Pausar e revisar segmentação.` });

    const porCampAdset = new Map<string, Map<string, { gasto: number; mql: number; nome: string }>>();
    for (const a of comMql) {
      if (!a.ad_set_id) continue;
      const camp = porCampAdset.get(a.campanha_nome) ?? new Map();
      const cur = camp.get(a.ad_set_id) ?? { gasto: 0, mql: 0, nome: a.adset_nome ?? a.ad_set_id };
      cur.gasto += Number(a.gasto ?? 0); cur.mql += Number(a.mql ?? 0);
      camp.set(a.ad_set_id, cur); porCampAdset.set(a.campanha_nome, camp);
    }
    for (const [camp, adsets] of porCampAdset) {
      const arr = [...adsets.values()].map((x) => ({ ...x, cpmql: x.gasto / x.mql })).sort((a, b) => a.cpmql - b.cpmql);
      if (arr.length >= 2 && arr[0].cpmql < arr[arr.length - 1].cpmql * 0.6)
        recs.push({ tone: "amarelo", texto: `Na campanha "${camp}", o adset "${arr[0].nome}" tem CPMQL ${brl(arr[0].cpmql)} vs ${brl(arr[arr.length - 1].cpmql)} do pior. Realocar verba pro adset "${arr[0].nome}".` });
    }

    // LPs queimando verba: forms com 0 MQL (público chega mas não qualifica).
    for (const l of lps.filter((l: any) => l.submissions > 5 && l.mql === 0 && l.gasto > 100).sort((a: any, b: any) => b.gasto - a.gasto).slice(0, 2))
      recs.push({ tone: "vermelho", texto: `A LP "${l.nome}" recebeu ${num(l.submissions)} forms, ${brl(l.gasto)} de gasto e 0 MQL — não qualifica. Revisar oferta/segmentação ou cortar tráfego.` });

    // Melhor LP por CPMQL: priorizar tráfego pra ela.
    const lpTop = lps.filter((l: any) => l.mql > 0 && l.cpmql != null).sort((a: any, b: any) => a.cpmql - b.cpmql)[0];
    if (lpTop) recs.push({ tone: "verde", texto: `A LP "${lpTop.nome}" é a que mais qualifica (CPMQL ${brl(lpTop.cpmql)}, ${num(lpTop.mql)} MQL) — priorizar tráfego/verba pra ela.` });

    if (recs.length === 0) recs.push({ tone: "amarelo", texto: "Ainda sem MQL atribuído suficiente no período para gerar recomendações. Verifique a atribuição CRM→ad (utm_content)." });
    return recs;
  }, [ads, lps]);

  const carregando = adsCrm.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Lightbulb className="h-6 w-6 text-primary" /> Insights estratégicos</h1>
          <p className="text-sm text-muted-foreground">Qualificação (CRM) por ad · {periodoLabel(periodo)} vs período anterior</p>
        </div>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[180px]"><span className="text-muted-foreground mr-1">Período:</span><SelectValue /></SelectTrigger>
          <SelectContent>{PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Seção 1 — Diagnóstico geral */}
      <Card>
        <CardHeader><CardTitle>Diagnóstico geral</CardTitle><CardDescription>Volume e qualificação em {periodoLabel(periodo)}, com variação vs período anterior</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Leads CRM" value={num(leadsCrmAtual)} atual={leadsCrmAtual} anterior={leadsCrmAnt} />
          <Metric label="MQL confirmados" value={num(mqlAtual)} atual={mqlAtual} anterior={mqlAnt} />
          <Metric label="Taxa lead→MQL" value={taxaAtual == null ? "—" : `${taxaAtual.toFixed(1).replace(".", ",")}%`} atual={taxaAtual ?? 0} anterior={taxaAnt ?? 0} />
          <div>
            <div className="text-xs text-muted-foreground">CPMQL médio por produto</div>
            <div className="mt-1 space-y-0.5">
              {cpmqlPorProduto.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
              {cpmqlPorProduto.map((p) => (
                <div key={p.produto} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{p.produto}</span>
                  <span className="tabular-nums font-medium">{p.cpmql == null ? "—" : brl(p.cpmql)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2 — Dinheiro voltando */}
      <Card className="border-emerald-500/30">
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-emerald-600" /> Onde o dinheiro está voltando</CardTitle><CardDescription>Top 3 ads com menor CPMQL · {periodoLabel(periodo)}</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {carregando && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!carregando && voltando.length === 0 && <div className="text-sm text-muted-foreground">Nenhum ad com MQL atribuído no período.</div>}
          {voltando.map((a) => (
            <div key={a.ad_uuid} className="p-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="font-medium text-sm truncate" title={a.ad_nome}>{a.ad_nome}</div>
              <div className="text-xs text-muted-foreground truncate">{a.campanha_nome}</div>
              <div className="flex gap-3 text-xs tabular-nums">
                <span>Gasto {brl(a.gasto)}</span><span>{num(a.mql)} MQL</span>
                <span className="font-bold text-emerald-700">CPMQL {brl(a.cpmql_brl)}</span>
              </div>
              <Button size="sm" variant="outline" className="w-full" title="Cria uma cópia deste ad (PAUSADA) em outro ad set, pra escalar o que funciona sem recomeçar do zero" onClick={() => setDupAd({ id: a.ad_uuid, nome: a.ad_nome })}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Escalar: duplicar ad (PAUSED)
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Seção 3 — Dinheiro sumindo */}
      <Card className="border-red-500/30">
        <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-red-600" /> Onde o dinheiro está sumindo</CardTitle><CardDescription>Top 3 ads com maior gasto e 0 MQL · {periodoLabel(periodo)}</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {carregando && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!carregando && sumindo.length === 0 && <div className="text-sm text-muted-foreground">Nenhum ad gastando sem MQL no período. 🎉</div>}
          {sumindo.map((a) => (
            <div key={a.ad_uuid} className="p-4 rounded-md border border-red-500/30 bg-red-500/5 space-y-2">
              <div className="font-medium text-sm truncate" title={a.ad_nome}>{a.ad_nome}</div>
              <div className="text-xs text-muted-foreground truncate">{a.campanha_nome}</div>
              <div className="flex gap-3 text-xs tabular-nums">
                <span className="font-bold text-red-700">Gasto {brl(a.gasto)}</span><span>{num(a.leads_meta)} leads Meta</span><span>0 MQL</span>
              </div>
              {a.meta_ad_id
                ? <AbrirNoMetaButton url={urlMetaAd(a.meta_ad_id)} label="Pausar no Meta Ads Manager" />
                : <Badge variant="outline" className="text-muted-foreground">sem meta_ad_id</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Seção 3.5 — Qualificação por LP */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Qualificação por LP</CardTitle><CardDescription>Quais landing pages qualificam melhor (menor CPMQL) e quais queimam verba · {periodoLabel(periodo)}</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1"><Trophy className="h-4 w-4" /> Mais qualificam (menor CPMQL)</div>
            {lpMelhor.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma LP com MQL no período.</div>}
            <div className="space-y-1.5">
              {lpMelhor.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 text-sm p-2 rounded-md border border-emerald-500/20 bg-emerald-500/5">
                  <span className="font-medium truncate">{l.nome}</span>
                  <span className="tabular-nums text-xs shrink-0"><span className="text-muted-foreground">{num(l.mql)} MQL · </span><span className="font-bold text-emerald-700">CPMQL {brl(l.cpmql)}</span></span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1"><Flame className="h-4 w-4" /> Queimando verba (gasto e 0 MQL)</div>
            {lpQueimando.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma LP gastando sem MQL. 🎉</div>}
            <div className="space-y-1.5">
              {lpQueimando.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 text-sm p-2 rounded-md border border-red-500/20 bg-red-500/5">
                  <span className="font-medium truncate">{l.nome}</span>
                  <span className="tabular-nums text-xs shrink-0"><span className="font-bold text-red-700">Gasto {brl(l.gasto)}</span><span className="text-muted-foreground"> · {num(l.submissions)} forms · 0 MQL</span></span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 4 — Recomendação estratégica */}
      <Card className="border-primary/30">
        <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" /> Recomendação estratégica da semana</CardTitle><CardDescription>Regras automáticas a partir dos dados do período (v1 heurística)</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {recomendacoes.map((r, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-md border text-sm ${
              r.tone === "verde" ? "border-emerald-500/40 bg-emerald-500/5" : r.tone === "vermelho" ? "border-red-500/40 bg-red-500/5" : "border-yellow-500/40 bg-yellow-500/5"
            }`}>
              <Lightbulb className={`h-4 w-4 shrink-0 mt-0.5 ${r.tone === "verde" ? "text-emerald-600" : r.tone === "vermelho" ? "text-red-600" : "text-yellow-600"}`} />
              <span>{r.texto}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <DuplicarAdDialog ad={dupAd} onClose={() => setDupAd(null)} />
    </div>
  );
}

function Metric({ label, value, atual, anterior }: { label: string; value: string; atual: number; anterior: number }) {
  const varia = anterior > 0 ? ((atual - anterior) / anterior) * 100 : null;
  const up = (varia ?? 0) > 0.5, down = (varia ?? 0) < -0.5;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      <div className={`text-xs flex items-center gap-1 mt-0.5 ${up ? "text-emerald-600" : down ? "text-red-600" : "text-muted-foreground"}`}>
        {varia == null ? <><Minus className="h-3 w-3" /> sem base</> : <>{up ? <ArrowUpRight className="h-3 w-3" /> : down ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}{varia >= 0 ? "+" : ""}{varia.toFixed(0)}% vs período anterior</>}
      </div>
    </div>
  );
}
