import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { num, pct, brl } from "@/lib/ads-utils";
import { PERIODOS as STD_PERIODOS, rangeFromPeriodo, periodoLabel as stdLabel, type Periodo as StdPeriodo } from "@/lib/periodo";
import { AbrirNoMetaButton, urlMetaAd } from "@/components/ads/AbrirNoMeta";
import { ExternalLink, CheckCircle2, XCircle, Info, Globe, ShieldCheck, AlertTriangle, Star, ChevronDown, ChevronRight, X, RefreshCw } from "lucide-react";

// Normaliza URL pra casar LP (mads_lps.url) com o destino da campanha (lp_destino).
function urlKey(u: string | null | undefined): string {
  return (u ?? "").replace(/^https?:\/\//, "").replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
}

export const Route = createFileRoute("/_authenticated/ads/lps")({
  component: LPs,
});

const LS_FILTROS = "lps-filtros";
const LS_SHARED = "mads_periodo_dashboard"; // período padrão compartilhado com as outras telas
const LS_RESET = "mads_lps_desde_reset";     // "Desde reset" é exclusivo das LPs (não polui o compartilhado)

// Períodos: os 5 padrão (compartilhados) + "Desde reset" (só nas LPs).
type LpPeriodo = StdPeriodo | "desde_reset";
const PERIODOS: { v: LpPeriodo; l: string }[] = [...STD_PERIODOS, { v: "desde_reset", l: "Desde reset" }];

const SORTS = [
  { v: "manual", l: "Manual" },
  { v: "cvr", l: "Melhor CVR Meta" },
  { v: "cpl", l: "Menor CPL" },
  { v: "leads", l: "Mais Leads" },
  { v: "leads_meta", l: "Mais Leads Meta" },
  { v: "views", l: "Mais Views Meta" },
  { v: "gasto", l: "Maior Gasto" },
  { v: "engajamento", l: "Maior Engajamento" },
  { v: "health", l: "Pior Health" },
] as const;
type SortKey = (typeof SORTS)[number]["v"];

const HEALTH_PRIORITY: Record<string, number> = { erro_servidor: 0, erro_cliente: 1, nunca_verificada: 2, redirect: 3, online: 4 };

function healthBadge(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "online") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (v === "erro_cliente") return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
  if (v === "erro_servidor") return "bg-red-500/15 text-red-700 border-red-500/30";
  return "bg-zinc-500/15 text-zinc-600 border-zinc-500/30";
}
function sampleColor(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  if (v >= 30) return "text-emerald-600";
  if (v >= 10) return "text-yellow-600";
  return "text-red-600";
}
function convMetaClass(v: number | null | undefined) {
  if (v == null) return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
  if (v >= 10) return "bg-emerald-500/20 text-emerald-700 border-emerald-500/40";
  if (v >= 2) return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
  return "bg-red-500/15 text-red-700 border-red-500/30";
}
function cplColor(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  if (v <= 50) return "text-emerald-600";
  if (v <= 150) return "text-yellow-600";
  return "text-red-600";
}
// CPMQL por LP: ≤R$100 verde, ≤R$200 amarelo, >R$200 vermelho (régua padrão do app).
function cpmqlColor(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  if (v <= 100) return "text-emerald-600";
  if (v <= 200) return "text-yellow-600";
  return "text-red-600";
}
// Taxa de qualificação lead→MQL: ≥25% verde, ≥10% amarelo, <10% vermelho.
function taxaMqlClass(v: number | null | undefined) {
  if (v == null) return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
  if (v >= 25) return "bg-emerald-500/20 text-emerald-700 border-emerald-500/40";
  if (v >= 10) return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
  return "bg-red-500/15 text-red-700 border-red-500/30";
}
function tipoBadge(t: string | null | undefined) {
  const v = (t ?? "").toLowerCase();
  if (v === "business") return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  if (v === "contabil") return "bg-purple-500/15 text-purple-700 border-purple-500/30";
  if (v === "academy") return "bg-pink-500/15 text-pink-700 border-pink-500/30";
  if (v === "isca") return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  return "bg-zinc-500/15 text-zinc-600 border-zinc-500/30";
}

function readLS(key: string): any {
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}

function LPs() {
  const savedF = typeof window !== "undefined" ? (readLS(LS_FILTROS) ?? {}) : {};
  const savedShared = typeof window !== "undefined" ? readLS(LS_SHARED) : null;
  const savedReset = typeof window !== "undefined" && localStorage.getItem(LS_RESET) === "1";
  const [sortBy, setSortBy] = useState<SortKey>(savedF.sortBy ?? "manual");
  const [periodo, setPeriodo] = useState<LpPeriodo>(savedReset ? "desde_reset" : (savedShared ?? "7d"));
  const [soAtivas, setSoAtivas] = useState<boolean>(savedF.soAtivas ?? true);
  const [tiposSel, setTiposSel] = useState<string[] | null>(savedF.tipos ?? null);
  const [busca, setBusca] = useState("");

  // "Desde reset" fica no localStorage local; os padrão vão pro compartilhado (propaga entre telas).
  useEffect(() => {
    try {
      if (periodo === "desde_reset") { localStorage.setItem(LS_RESET, "1"); }
      else { localStorage.setItem(LS_RESET, "0"); localStorage.setItem(LS_SHARED, JSON.stringify(periodo)); }
    } catch { /* ignore */ }
  }, [periodo]);

  const stdPeriodo: StdPeriodo = periodo === "desde_reset" ? "30d" : periodo;
  const { since, until } = rangeFromPeriodo(stdPeriodo);

  const lps = useQuery({
    queryKey: ["mads", "lp_performance", since, until],
    queryFn: async () => {
      const [baseRes, multiRes, fnRes] = await Promise.all([
        supabase.from("mads_v_lp_performance").select("*"),
        (supabase as any).from("mads_v_lp_performance_multi").select("id, refeita_em, dias_desde_reset, meta_lp_views_desde_reset, gasto_meta_desde_reset, submissions_desde_reset, submissions_meta_desde_reset"),
        (supabase as any).rpc("mads_f_lp_performance", { p_since: since, p_until: until }),
      ]);
      if (baseRes.error) throw baseRes.error;
      const multiById = new Map((multiRes.data ?? []).map((m: any) => [m.id, m]));
      const fnById = new Map((fnRes.data ?? []).map((f: any) => [f.id, f]));
      // base: health/clarity/alerta/engajamento + *_30d p/ ordenação; multi: refeita_em + desde_reset; fn: janela escolhida.
      return (baseRes.data ?? []).map((b: any) => {
        const m: any = multiById.get(b.id) ?? {};
        const f: any = fnById.get(b.id) ?? {};
        return { ...m, ...b, fn_views: f.meta_lp_views, fn_gasto: f.gasto_meta, fn_forms: f.submissions, fn_subs_meta: f.submissions_meta, fn_mql: f.mql };
      });
    },
  });

  const rows = (lps.data ?? []) as any[];

  // Etapa 2 — ads que apontam pra cada LP (drill-down por lp_destino da campanha).
  const adsLp = useQuery({
    queryKey: ["mads", "ads_por_lp", since, until],
    queryFn: async () => {
      const [adsRes, adsetRes, campRes] = await Promise.all([
        (supabase as any).rpc("mads_f_ads_crm", { p_since: since, p_until: until }),
        supabase.from("mads_ad_sets").select("id, campanha_id"),
        supabase.from("mads_campaigns").select("id, lp_destino"),
      ]);
      const lpDestByCamp = new Map((campRes.data ?? []).map((c: any) => [c.id, c.lp_destino]));
      const campByAdset = new Map((adsetRes.data ?? []).map((a: any) => [a.id, a.campanha_id]));
      return (adsRes.data ?? []).map((r: any) => ({ ...r, lpKey: urlKey(lpDestByCamp.get(campByAdset.get(r.ad_set_id))) }));
    },
  });
  const adsByLp = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const a of (adsLp.data ?? []) as any[]) {
      if (!a.lpKey) continue;
      // só ads com atividade no período (evita despejar dezenas de ads zerados)
      if (Number(a.gasto ?? 0) <= 0 && Number(a.leads_meta ?? 0) <= 0 && Number(a.mql ?? 0) <= 0) continue;
      const arr = m.get(a.lpKey) ?? []; arr.push(a); m.set(a.lpKey, arr);
    }
    for (const arr of m.values()) arr.sort((x, y) => Number(y.gasto ?? 0) - Number(x.gasto ?? 0));
    return m;
  }, [adsLp.data]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const tiposDisponiveis = useMemo(() => {
    const all = Array.from(new Set(rows.map((r) => r.tipo_lead).filter(Boolean))) as string[];
    return all.filter((t) => {
      const tl = t.toLowerCase();
      if (tl === "isca" || tl === "advocacia") return rows.some((r) => (r.tipo_lead ?? "").toLowerCase() === tl && r.ativa === true);
      return true;
    });
  }, [rows]);

  useEffect(() => {
    if (tiposSel === null && tiposDisponiveis.length > 0) setTiposSel(tiposDisponiveis);
  }, [tiposDisponiveis, tiposSel]);

  useEffect(() => {
    try { localStorage.setItem(LS_FILTROS, JSON.stringify({ sortBy, soAtivas, tipos: tiposSel })); } catch { /* ignore */ }
  }, [sortBy, soAtivas, tiposSel]);

  const tiposAtivos = tiposSel;

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (soAtivas && r.ativa !== true) return false;
      if (tiposAtivos && !tiposAtivos.includes(r.tipo_lead)) return false;
      if (busca && !(r.nome ?? "").toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
    const a = [...list];
    switch (sortBy) {
      case "cvr": return a.sort((x, y) => (y.cvr_meta_pct_30d ?? -1) - (x.cvr_meta_pct_30d ?? -1));
      case "cpl": return a.sort((x, y) => (x.cpl_real_30d ?? Infinity) - (y.cpl_real_30d ?? Infinity));
      case "leads": return a.sort((x, y) => (y.submissions_30d ?? 0) - (x.submissions_30d ?? 0));
      case "leads_meta": return a.sort((x, y) => (y.submissions_meta_30d ?? 0) - (x.submissions_meta_30d ?? 0));
      case "views": return a.sort((x, y) => (y.meta_lp_views_30d ?? 0) - (x.meta_lp_views_30d ?? 0));
      case "gasto": return a.sort((x, y) => Number(y.gasto_meta_30d ?? 0) - Number(x.gasto_meta_30d ?? 0));
      case "engajamento": return a.sort((x, y) => (y.engagement_seg_avg ?? -1) - (x.engagement_seg_avg ?? -1));
      case "health": return a.sort((x, y) => (HEALTH_PRIORITY[x.health_status] ?? 5) - (HEALTH_PRIORITY[y.health_status] ?? 5));
      default: return a.sort((x, y) => (x.display_order ?? 999) - (y.display_order ?? 999) || String(x.nome ?? "").localeCompare(String(y.nome ?? "")));
    }
  }, [rows, soAtivas, tiposAtivos, busca, sortBy]);

  const total = rows.length;
  const online = rows.filter((r) => (r.health_status ?? "").toLowerCase() === "online").length;
  const comPixel = rows.filter((r) => r.pixel_meta_detectado).length;
  const comAlertas = rows.filter((r) => r.alerta).length;

  const is30 = periodo === "30d"; // Clarity só tem 30d
  const sortLabel = SORTS.find((s) => s.v === sortBy)?.l;
  const periodoLabel = periodo === "desde_reset" ? "Desde reset" : stdLabel(periodo);
  const tipoLabel = !tiposAtivos || tiposAtivos.length === tiposDisponiveis.length ? "Todos" : `${tiposAtivos.length} tipo(s)`;

  function toggleTipo(t: string, on: boolean) {
    const atual = tiposAtivos ?? tiposDisponiveis;
    setTiposSel(on ? [...new Set([...atual, t])] : atual.filter((x) => x !== t));
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Landing Pages</h1>
          <p className="text-sm text-muted-foreground">Performance, saúde e conversão das LPs</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Globe className="h-3.5 w-3.5" />Total de LPs</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{total}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />Online</div>
            <div className="text-2xl font-bold tabular-nums mt-1 text-emerald-600">{online}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Com Pixel Meta</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{comPixel}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" />Com alerta</div>
            <div className={`text-2xl font-bold tabular-nums mt-1 ${comAlertas > 0 ? "text-red-600" : ""}`}>{comAlertas}</div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Performance por LP</CardTitle>
              <CardDescription>Métricas · {periodoLabel} · {filtered.length} LP(s)</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as LpPeriodo)}>
                <SelectTrigger className="w-[190px]"><span className="text-muted-foreground mr-1">Período:</span><SelectValue /></SelectTrigger>
                <SelectContent>{PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-[190px]"><span className="text-muted-foreground mr-1">Ordenar:</span><SelectValue /></SelectTrigger>
                <SelectContent>{SORTS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between font-normal min-w-[140px]">
                    <span><span className="text-muted-foreground mr-1">Tipo:</span>{tipoLabel}</span>
                    <ChevronDown className="h-4 w-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-2" align="start">
                  <div className="space-y-1.5">
                    {tiposDisponiveis.map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm cursor-pointer px-1 py-1 rounded hover:bg-accent">
                        <Checkbox checked={(tiposAtivos ?? tiposDisponiveis).includes(t)} onCheckedChange={(c) => toggleTipo(t, !!c)} />
                        {t}
                      </label>
                    ))}
                    {tiposDisponiveis.length === 0 && <div className="text-xs text-muted-foreground px-1">Sem tipos.</div>}
                  </div>
                </PopoverContent>
              </Popover>

              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <Switch checked={soAtivas} onCheckedChange={setSoAtivas} />
                Só ativas
              </label>

              {sortBy !== "manual" && (
                <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30">
                  Ordenado por: {sortLabel}
                  <button type="button" onClick={() => setSortBy("manual")} className="hover:text-foreground" aria-label="Voltar para manual"><X className="h-3 w-3" /></button>
                </Badge>
              )}

              <div className="ml-auto">
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome..." className="w-[220px]" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LP</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Resp. (ms)</TableHead>
                  <TableHead className="text-center">Pixel</TableHead>
                  <TableHead className="text-right">Sessions Clarity</TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">% Clarity captura <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Fração do tráfego real (Meta LP Views) que o Clarity rastreou. Só disponível em 30d.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">LP Views Meta</TableHead>
                  <TableHead className="text-right">Forms</TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1 font-semibold text-foreground">Conv % (Meta) <Star className="h-3 w-3 text-amber-500 fill-amber-500" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">CVR real: submissions meta ÷ LP views da Meta (no período escolhido). Métrica primária.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">CPL real <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Custo por form-submit: gasto Meta ÷ submissions meta (no período escolhido).</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">MQL <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Leads desta LP (por page_url do form) que viraram MQL no CRM (qualification_status='mql').</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1 font-semibold text-foreground">CVR → MQL <Star className="h-3 w-3 text-amber-500 fill-amber-500" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Taxa de qualificação REAL da LP: MQL ÷ forms. É o que mostra se a LP gera lead que presta, não só volume.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">CPMQL <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Custo por MQL: gasto Meta das campanhas que apontam pra esta LP ÷ MQL gerados.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">Conv % (amostra Clarity) <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">CVR com sessões Clarity (amostra imprecisa). Só 30d.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>Alerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lps.isLoading && <TableRow><TableCell colSpan={16} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>}
                {!lps.isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={16} className="text-center py-6 text-muted-foreground">Nenhuma LP encontrada.</TableCell></TableRow>}
                {filtered.map((r) => {
                  const reset = periodo === "desde_reset";
                  const semReset = reset && !r.refeita_em;
                  const views = reset ? (semReset ? null : r.meta_lp_views_desde_reset) : r.fn_views;
                  const gasto = reset ? (semReset ? null : r.gasto_meta_desde_reset) : r.fn_gasto;
                  const forms = reset ? (semReset ? null : r.submissions_desde_reset) : r.fn_forms;
                  const subsMeta = reset ? (semReset ? null : r.submissions_meta_desde_reset) : r.fn_subs_meta;
                  const cvrMeta = views > 0 && subsMeta != null ? (subsMeta / views) * 100 : null;
                  const cpl = subsMeta > 0 && gasto != null ? gasto / subsMeta : null;
                  // MQL por LP (só nos períodos padrão; "desde reset" não tem recorte de MQL).
                  const mqlLp = reset ? null : r.fn_mql;
                  const cvrMql = !reset && forms > 0 && mqlLp != null ? (mqlLp / forms) * 100 : null;
                  const cpmqlLp = !reset && mqlLp > 0 && gasto != null ? gasto / mqlLp : null;
                  const inativa = r.ativa !== true;
                  const dash = <span className="text-muted-foreground">—</span>;
                  const lpAds = adsByLp.get(urlKey(r.url)) ?? [];
                  const isOpen = expanded === (r.id ?? r.url);
                  return (
                    <Fragment key={r.id ?? r.url}>
                    <TableRow>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => setExpanded(isOpen ? null : (r.id ?? r.url))} className="text-muted-foreground hover:text-foreground shrink-0" title="Ver criativos/anúncios que apontam pra esta LP" disabled={lpAds.length === 0}>
                            {lpAds.length === 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-30" /> : isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                          {r.nome ?? "—"}
                          {lpAds.length > 0 && <span className="text-[10px] text-muted-foreground">({lpAds.length} ad{lpAds.length > 1 ? "s" : ""})</span>}
                          {inativa && <Badge variant="outline" className="bg-zinc-500/15 text-zinc-500 border-zinc-500/30 text-[10px]">inativa</Badge>}
                          {r.refeita_em && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                                  <RefreshCw className="h-2.5 w-2.5" /> refeita há {r.dias_desde_reset ?? "?"} dias
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                LP refeita em {new Date(r.refeita_em).toLocaleDateString("pt-BR")}. O histórico anterior fica preservado, mas "Desde reset" te dá a visão limpa da versão atual — selecione no dropdown de período.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        {r.url && (
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                            {r.url.replace(/^https?:\/\//, "").slice(0, 50)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline" className={tipoBadge(r.tipo_lead)}>{r.tipo_lead ?? "—"}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={healthBadge(r.health_status)}>{r.health_status ?? "—"}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.ultimo_tempo_ms ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {r.pixel_meta_detectado ? <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" /> : <XCircle className="h-4 w-4 text-red-500 inline" />}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{is30 ? num(r.sessions_clarity_30d) : dash}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {!is30 ? dash : r.clarity_sample_rate_pct == null ? dash : <span className={sampleColor(r.clarity_sample_rate_pct)}>{Number(r.clarity_sample_rate_pct).toFixed(1)}%</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{semReset ? dash : num(views)}</TableCell>
                      <TableCell className="text-right tabular-nums">{semReset ? dash : num(forms)}</TableCell>
                      <TableCell className="text-right">
                        {semReset ? dash : <Badge variant="outline" className={`tabular-nums ${convMetaClass(cvrMeta)}`}>{cvrMeta == null ? "—" : pct(cvrMeta)}</Badge>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {semReset ? dash : cpl == null ? dash : <span className={cplColor(cpl)}>{brl(cpl)}</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{reset ? dash : (mqlLp ?? 0) > 0 ? num(mqlLp) : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right">
                        {reset ? dash : <Badge variant="outline" className={`tabular-nums ${taxaMqlClass(cvrMql)}`}>{cvrMql == null ? "—" : pct(cvrMql)}</Badge>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {reset ? dash : cpmqlLp == null ? dash : <span className={cpmqlColor(cpmqlLp)}>{brl(cpmqlLp)}</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {!is30 ? "—" : (() => { const c = r.cvr_clarity_pct_30d ?? r.taxa_conversao_clarity_pct; return c == null ? "—" : pct(c); })()}
                      </TableCell>
                      <TableCell>
                        {r.alerta ? <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-500/30">{r.alerta}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={16} className="bg-muted/30 p-0">
                          <div className="p-3">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">Criativos / anúncios que apontam pra esta LP · {periodoLabel}</div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-muted-foreground border-b border-border/50">
                                    <th className="py-1 pr-3 font-medium">Ad</th>
                                    <th className="py-1 pr-3 font-medium">Campanha</th>
                                    <th className="py-1 pr-3 font-medium text-right">Gasto</th>
                                    <th className="py-1 pr-3 font-medium text-right">Leads Meta</th>
                                    <th className="py-1 pr-3 font-medium text-right">MQL</th>
                                    <th className="py-1 pr-3 font-medium text-right">CPMQL</th>
                                    <th className="py-1"></th>
                                  </tr>
                                </thead>
                                <tbody className="[&>tr]:border-b [&>tr]:border-border/30">
                                  {lpAds.map((a: any) => (
                                    <tr key={a.ad_uuid}>
                                      <td className="py-1.5 pr-3 font-medium max-w-[220px] truncate" title={a.ad_nome}>{a.ad_nome}</td>
                                      <td className="py-1.5 pr-3 text-muted-foreground max-w-[180px] truncate">{a.campanha_nome}</td>
                                      <td className="py-1.5 pr-3 text-right tabular-nums">{brl(a.gasto)}</td>
                                      <td className="py-1.5 pr-3 text-right tabular-nums">{num(a.leads_meta)}</td>
                                      <td className="py-1.5 pr-3 text-right tabular-nums">{(a.mql ?? 0) > 0 ? num(a.mql) : <span className="text-muted-foreground">—</span>}</td>
                                      <td className="py-1.5 pr-3 text-right tabular-nums">{a.cpmql_brl == null ? <span className="text-muted-foreground">—</span> : <span className={cpmqlColor(Number(a.cpmql_brl))}>{brl(a.cpmql_brl)}</span>}</td>
                                      <td className="py-1.5 text-right">{a.meta_ad_id && <AbrirNoMetaButton url={urlMetaAd(a.meta_ad_id)} label="Meta" />}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
