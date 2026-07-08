import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl, num } from "@/lib/ads-utils";
import { DuplicarAdDialog, type DupTarget } from "@/components/ads/DuplicarAdDialog";
import { AbrirNoMetaButton, urlMetaAd } from "@/components/ads/AbrirNoMeta";
import { Trophy, Flame, Lightbulb, Copy, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ads/insights")({
  component: Insights,
});

// Janela fixa de 30 dias (análise estratégica), comparada com os 30 dias anteriores.
function diaISO(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function Insights() {
  const hoje = diaISO(0);
  const ini30 = diaISO(30);
  const ini60 = diaISO(60);

  const adsCrm = useQuery({
    queryKey: ["mads", "ads_crm_30d"],
    queryFn: async () => {
      const [crmRes, adsRes, adsetRes, campRes, topRes] = await Promise.all([
        (supabase as any).from("mads_v_ads_crm_30d").select("*"),
        supabase.from("mads_ads").select("id, nome, status, meta_ad_id, ad_set_id"),
        supabase.from("mads_ad_sets").select("id, nome, campanha_id"),
        supabase.from("mads_campaigns").select("id, nome, tipo_lead"),
        supabase.from("mads_v_top_ads_30d").select("ad_uuid, leads, gasto_brl"),
      ]);
      const adById = new Map((adsRes.data ?? []).map((a: any) => [a.id, a]));
      const adsetById = new Map((adsetRes.data ?? []).map((a: any) => [a.id, a]));
      const campById = new Map((campRes.data ?? []).map((c: any) => [c.id, c]));
      const leadsMetaByAd = new Map((topRes.data ?? []).map((t: any) => [t.ad_uuid, t.leads]));
      return (crmRes.data ?? []).map((r: any) => {
        const ad: any = adById.get(r.ad_uuid) ?? {};
        const adset: any = adsetById.get(ad.ad_set_id) ?? {};
        const camp: any = campById.get(adset.campanha_id) ?? {};
        return {
          ad_uuid: r.ad_uuid,
          ad_nome: ad.nome ?? "—",
          status: ad.status ?? null,
          meta_ad_id: ad.meta_ad_id ?? null,
          ad_set_id: ad.ad_set_id ?? null,
          adset_nome: adset.nome ?? null,
          campanha_nome: camp.nome ?? "—",
          produto: camp.tipo_lead ?? "—",
          gasto: Number(r.gasto_30d ?? 0),
          leads_crm: Number(r.leads_crm ?? 0),
          leads_meta: Number(leadsMetaByAd.get(r.ad_uuid) ?? 0),
          mql: Number(r.mql ?? 0),
          cpmql_brl: r.cpmql_brl != null ? Number(r.cpmql_brl) : null,
        };
      });
    },
  });

  const mqlDiario = useQuery({
    queryKey: ["mads", "mql_diario", ini60],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("mads_v_mql_diario").select("dia, mql").gte("dia", ini60);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const funil = useQuery({
    queryKey: ["mads", "funil_crm_60d", ini60],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_funil_diario").select("dia, contacts_crm").gte("dia", ini60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [dupAd, setDupAd] = useState<DupTarget | null>(null);

  const ads: any[] = adsCrm.data ?? [];

  // ---- Seção 1: diagnóstico geral (30d atual vs 30d anterior) ----
  const somaEntre = (rows: any[], campo: string, ini: string, fim: string) =>
    rows.filter((r) => r.dia >= ini && r.dia < fim).reduce((a, r) => a + Number(r[campo] ?? 0), 0);

  const leadsCrmAtual = somaEntre(funil.data ?? [], "contacts_crm", ini30, hoje);
  const leadsCrmAnt = somaEntre(funil.data ?? [], "contacts_crm", ini60, ini30);
  const mqlAtual = somaEntre(mqlDiario.data ?? [], "mql", ini30, hoje);
  const mqlAnt = somaEntre(mqlDiario.data ?? [], "mql", ini60, ini30);
  const taxaAtual = leadsCrmAtual > 0 ? (mqlAtual / leadsCrmAtual) * 100 : null;
  const taxaAnt = leadsCrmAnt > 0 ? (mqlAnt / leadsCrmAnt) * 100 : null;

  // CPMQL médio por produto (ads com MQL)
  const cpmqlPorProduto = useMemo(() => {
    const acc = new Map<string, { gasto: number; mql: number }>();
    for (const a of ads) {
      if (a.mql <= 0) continue;
      const cur = acc.get(a.produto) ?? { gasto: 0, mql: 0 };
      cur.gasto += a.gasto; cur.mql += a.mql;
      acc.set(a.produto, cur);
    }
    return [...acc.entries()].map(([produto, v]) => ({ produto, cpmql: v.mql > 0 ? v.gasto / v.mql : null })).sort((x, y) => (x.cpmql ?? 1e9) - (y.cpmql ?? 1e9));
  }, [ads]);

  // ---- Seção 2: dinheiro voltando (top 3 menor CPMQL) ----
  const voltando = useMemo(() => ads.filter((a: any) => a.mql > 0 && a.cpmql_brl != null).sort((a: any, b: any) => (a.cpmql_brl ?? 1e9) - (b.cpmql_brl ?? 1e9)).slice(0, 3), [ads]);

  // ---- Seção 3: dinheiro sumindo (maior gasto sem MQL) ----
  const sumindo = useMemo(() => ads.filter((a: any) => a.mql === 0 && a.gasto > 0).sort((a: any, b: any) => b.gasto - a.gasto).slice(0, 3), [ads]);

  // ---- Seção 4: recomendações (heurísticas) ----
  const recomendacoes = useMemo(() => {
    const recs: { tone: string; texto: string }[] = [];
    const comMql = ads.filter((a: any) => a.mql > 0);
    const gastoMql = comMql.reduce((s: number, a: any) => s + a.gasto, 0);
    const totalMql = comMql.reduce((s: number, a: any) => s + a.mql, 0);
    const cpmqlMedio = totalMql > 0 ? gastoMql / totalMql : null;

    if (cpmqlMedio != null && cpmqlMedio < 100) recs.push({ tone: "verde", texto: `CPMQL médio em ${brl(cpmqlMedio)} (saudável). Escalar as campanhas Business vencedoras com boost de ~20% no orçamento.` });
    else if (cpmqlMedio != null && cpmqlMedio > 200) recs.push({ tone: "vermelho", texto: `CPMQL médio em ${brl(cpmqlMedio)} (alto). Reduzir gasto ~30% e refazer criativos antes de escalar.` });
    else if (cpmqlMedio != null) recs.push({ tone: "amarelo", texto: `CPMQL médio em ${brl(cpmqlMedio)}. Zona intermediária — otimizar criativos e segmentação antes de escalar.` });

    for (const a of ads.filter((a: any) => a.leads_meta > 5 && a.mql === 0).sort((a: any, b: any) => b.gasto - a.gasto).slice(0, 3))
      recs.push({ tone: "vermelho", texto: `"${a.ad_nome}" tem ${num(a.leads_meta)} leads Meta e 0 MQL — provável público errado. Pausar e revisar segmentação.` });

    // Realocação entre adsets da mesma campanha
    const porCampAdset = new Map<string, Map<string, { gasto: number; mql: number; nome: string }>>();
    for (const a of comMql) {
      if (!a.ad_set_id) continue;
      const camp = porCampAdset.get(a.campanha_nome) ?? new Map();
      const cur = camp.get(a.ad_set_id) ?? { gasto: 0, mql: 0, nome: a.adset_nome ?? a.ad_set_id };
      cur.gasto += a.gasto; cur.mql += a.mql;
      camp.set(a.ad_set_id, cur); porCampAdset.set(a.campanha_nome, camp);
    }
    for (const [camp, adsets] of porCampAdset) {
      const arr = [...adsets.values()].map((x) => ({ ...x, cpmql: x.gasto / x.mql })).sort((a, b) => a.cpmql - b.cpmql);
      if (arr.length >= 2 && arr[0].cpmql < arr[arr.length - 1].cpmql * 0.6)
        recs.push({ tone: "amarelo", texto: `Na campanha "${camp}", o adset "${arr[0].nome}" tem CPMQL ${brl(arr[0].cpmql)} vs ${brl(arr[arr.length - 1].cpmql)} do pior. Realocar verba pro adset "${arr[0].nome}".` });
    }

    if (recs.length === 0) recs.push({ tone: "amarelo", texto: "Ainda sem MQL atribuído suficiente no período para gerar recomendações. Verifique a atribuição CRM→ad (utm_content)." });
    return recs;
  }, [ads]);

  const carregando = adsCrm.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Lightbulb className="h-6 w-6 text-primary" /> Insights estratégicos</h1>
        <p className="text-sm text-muted-foreground">Análise de qualificação (CRM) por ad · últimos 30 dias vs 30 dias anteriores</p>
      </div>

      {/* Seção 1 — Diagnóstico geral */}
      <Card>
        <CardHeader><CardTitle>Diagnóstico geral</CardTitle><CardDescription>Volume e qualificação no período, com variação vs período anterior</CardDescription></CardHeader>
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
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-emerald-600" /> Onde o dinheiro está voltando</CardTitle><CardDescription>Top 3 ads com menor CPMQL</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {carregando && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!carregando && voltando.length === 0 && <div className="text-sm text-muted-foreground">Nenhum ad com MQL atribuído ainda.</div>}
          {voltando.map((a) => (
            <div key={a.ad_uuid} className="p-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="font-medium text-sm truncate" title={a.ad_nome}>{a.ad_nome}</div>
              <div className="text-xs text-muted-foreground truncate">{a.campanha_nome}</div>
              <div className="flex gap-3 text-xs tabular-nums">
                <span>Gasto {brl(a.gasto)}</span><span>{num(a.mql)} MQL</span>
                <span className="font-bold text-emerald-700">CPMQL {brl(a.cpmql_brl)}</span>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => setDupAd({ id: a.ad_uuid, nome: a.ad_nome })}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Duplicar para campanha
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Seção 3 — Dinheiro sumindo */}
      <Card className="border-red-500/30">
        <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-red-600" /> Onde o dinheiro está sumindo</CardTitle><CardDescription>Top 3 ads com maior gasto e 0 MQL</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {carregando && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!carregando && sumindo.length === 0 && <div className="text-sm text-muted-foreground">Nenhum ad gastando sem MQL. 🎉</div>}
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

      {/* Seção 4 — Recomendação estratégica */}
      <Card className="border-primary/30">
        <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" /> Recomendação estratégica da semana</CardTitle><CardDescription>Regras automáticas a partir dos dados (v1 heurística)</CardDescription></CardHeader>
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
