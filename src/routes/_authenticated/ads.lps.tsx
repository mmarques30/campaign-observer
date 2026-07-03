import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { ExternalLink, CheckCircle2, XCircle, Info, Globe, ShieldCheck, AlertTriangle, Star, ChevronDown, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ads/lps")({
  component: LPs,
});

const LS_KEY = "lps-filtros";

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
function tipoBadge(t: string | null | undefined) {
  const v = (t ?? "").toLowerCase();
  if (v === "business") return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  if (v === "contabil") return "bg-purple-500/15 text-purple-700 border-purple-500/30";
  if (v === "academy") return "bg-pink-500/15 text-pink-700 border-pink-500/30";
  if (v === "isca") return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  return "bg-zinc-500/15 text-zinc-600 border-zinc-500/30";
}

function readLS(): { sortBy?: SortKey; periodo?: "30d" | "7d"; tipos?: string[]; soAtivas?: boolean } {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"); } catch { return {}; }
}

function LPs() {
  const saved = typeof window !== "undefined" ? readLS() : {};
  const [sortBy, setSortBy] = useState<SortKey>(saved.sortBy ?? "manual");
  const [periodo, setPeriodo] = useState<"30d" | "7d">(saved.periodo ?? "30d");
  const [soAtivas, setSoAtivas] = useState<boolean>(saved.soAtivas ?? true);
  const [tiposSel, setTiposSel] = useState<string[] | null>(saved.tipos ?? null);
  const [busca, setBusca] = useState("");

  const lps = useQuery({
    queryKey: ["mads", "lp_performance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_lp_performance").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (lps.data ?? []) as any[];

  // Tipos disponíveis (isca/advocacia só se houver LP ativa desse tipo).
  const tiposDisponiveis = useMemo(() => {
    const all = Array.from(new Set(rows.map((r) => r.tipo_lead).filter(Boolean))) as string[];
    return all.filter((t) => {
      const tl = t.toLowerCase();
      if (tl === "isca" || tl === "advocacia") return rows.some((r) => (r.tipo_lead ?? "").toLowerCase() === tl && r.ativa === true);
      return true;
    });
  }, [rows]);

  // Default: todos marcados quando ainda não escolhido.
  useEffect(() => {
    if (tiposSel === null && tiposDisponiveis.length > 0) setTiposSel(tiposDisponiveis);
  }, [tiposDisponiveis, tiposSel]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ sortBy, periodo, tipos: tiposSel, soAtivas })); } catch { /* ignore */ }
  }, [sortBy, periodo, tiposSel, soAtivas]);

  const tiposAtivos = tiposSel; // null = todos

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

  const is30 = periodo === "30d";
  const sortLabel = SORTS.find((s) => s.v === sortBy)?.l;
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
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Performance por LP</CardTitle>
                <CardDescription>Métricas dos últimos {is30 ? "30" : "7"} dias · {filtered.length} LP(s)</CardDescription>
              </div>
            </div>

            {/* Barra de controles */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-[190px]"><span className="text-muted-foreground mr-1">Ordenar:</span><SelectValue /></SelectTrigger>
                <SelectContent>{SORTS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>

              <Select value={periodo} onValueChange={(v) => setPeriodo(v as "30d" | "7d")}>
                <SelectTrigger className="w-[130px]"><span className="text-muted-foreground mr-1">Período:</span><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">30 dias</SelectItem>
                  <SelectItem value="7d">7 dias</SelectItem>
                </SelectContent>
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
                      <TooltipContent className="max-w-xs">Fração do tráfego real (Meta LP Views) que o Clarity conseguiu rastrear. Só disponível em 30d.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">LP Views Meta</TableHead>
                  <TableHead className="text-right">Forms</TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1 font-semibold text-foreground">Conv % (Meta) <Star className="h-3 w-3 text-amber-500 fill-amber-500" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Conversion rate real: submissions com utm_source=meta ÷ LP views da Meta. Métrica primária pra decisão.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">CPL real <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Custo por form-submit (Gasto Meta ÷ submissions meta). Só disponível em 30d.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">Conv % (amostra Clarity) <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">CVR com sessões Clarity (amostra 3-49%, imprecisa). Use "Conv % (Meta)". Só 30d.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>Alerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lps.isLoading && <TableRow><TableCell colSpan={13} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>}
                {!lps.isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={13} className="text-center py-6 text-muted-foreground">Nenhuma LP encontrada.</TableCell></TableRow>}
                {filtered.map((r) => {
                  const sClarity = is30 ? r.sessions_clarity_30d : r.sessions_clarity_7d;
                  const views = is30 ? r.meta_lp_views_30d : r.meta_lp_views_7d;
                  const forms = is30 ? r.submissions_30d : r.submissions_7d;
                  const cvrMeta = is30 ? (r.cvr_meta_pct_30d ?? r.taxa_conversao_meta_pct) : r.cvr_meta_pct_7d;
                  const inativa = r.ativa !== true;
                  return (
                    <TableRow key={r.id ?? r.url}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          {r.nome ?? "—"}
                          {inativa && <Badge variant="outline" className="bg-zinc-500/15 text-zinc-500 border-zinc-500/30 text-[10px]">inativa</Badge>}
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
                      <TableCell className="text-right tabular-nums">{num(sClarity)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {!is30 ? <span className="text-muted-foreground">—</span> : r.clarity_sample_rate_pct == null ? <span className="text-muted-foreground">—</span> : <span className={sampleColor(r.clarity_sample_rate_pct)}>{Number(r.clarity_sample_rate_pct).toFixed(1)}%</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(views)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(forms)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`tabular-nums ${convMetaClass(cvrMeta)}`}>{cvrMeta == null ? "—" : pct(cvrMeta)}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {!is30 ? <span className="text-muted-foreground">—</span>
                          : r.cpl_real_30d == null ? <Badge variant="outline" className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-[10px]">sem dado</Badge>
                          : <span className={cplColor(r.cpl_real_30d)}>{brl(r.cpl_real_30d)}</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {!is30 ? "—" : (() => { const c = r.cvr_clarity_pct_30d ?? r.taxa_conversao_clarity_pct; return c == null ? "—" : pct(c); })()}
                      </TableCell>
                      <TableCell>
                        {r.alerta ? <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-500/30">{r.alerta}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
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
