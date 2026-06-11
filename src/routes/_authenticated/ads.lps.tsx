import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { num, pct, brl } from "@/lib/ads-utils";
import { ExternalLink, CheckCircle2, XCircle, Info, Globe, ShieldCheck, AlertTriangle, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ads/lps")({
  component: LPs,
});

function healthBadge(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "online") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (v === "erro_cliente") return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
  if (v === "erro_servidor") return "bg-red-500/15 text-red-700 border-red-500/30";
  return "bg-zinc-500/15 text-zinc-600 border-zinc-500/30";
}

// Fração do tráfego que o Clarity capturou: verde ≥30%, amarelo 10-29%, vermelho <10%.
function sampleColor(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  if (v >= 30) return "text-emerald-600";
  if (v >= 10) return "text-yellow-600";
  return "text-red-600";
}

// Conv % (Meta) — métrica primária: ≥10% verde forte, 2-9.99% amarelo, <2% vermelho.
function convMetaClass(v: number | null | undefined) {
  if (v == null) return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
  if (v >= 10) return "bg-emerald-500/20 text-emerald-700 border-emerald-500/40";
  if (v >= 2) return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
  return "bg-red-500/15 text-red-700 border-red-500/30";
}

// CPL real: ≤R$50 verde, R$50-150 amarelo, >R$150 vermelho.
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

function LPs() {
  const [tipo, setTipo] = useState<string>("todos");
  const [health, setHealth] = useState<string>("todos");
  const [comAlerta, setComAlerta] = useState<string>("todos");

  const lps = useQuery({
    queryKey: ["mads", "lp_performance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_lp_performance").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (lps.data ?? []) as any[];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tipo !== "todos" && (r.tipo_lead ?? "") !== tipo) return false;
      if (health !== "todos" && (r.health_status ?? "") !== health) return false;
      if (comAlerta === "sim" && !r.alerta) return false;
      if (comAlerta === "nao" && r.alerta) return false;
      return true;
    });
  }, [rows, tipo, health, comAlerta]);

  const total = rows.length;
  const online = rows.filter((r) => (r.health_status ?? "").toLowerCase() === "online").length;
  const comPixel = rows.filter((r) => r.pixel_meta_detectado).length;
  const comAlertas = rows.filter((r) => r.alerta).length;

  const tipos = Array.from(new Set(rows.map((r) => r.tipo_lead).filter(Boolean)));
  const healths = Array.from(new Set(rows.map((r) => r.health_status).filter(Boolean)));

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
                <CardDescription>
                  Sessions Clarity + LP Views Meta + Forms (últimos 30d)
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="inline h-3 w-3 ml-1 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Sessions Clarity vai acumular conforme dados diários sincronizam. API do Clarity dá só últimos 3 dias por request.
                    </TooltipContent>
                  </Tooltip>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={health} onValueChange={setHealth}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Health" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos health</SelectItem>
                    {healths.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={comAlerta} onValueChange={setComAlerta}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Alerta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Com alerta</SelectItem>
                    <SelectItem value="nao">Sem alerta</SelectItem>
                  </SelectContent>
                </Select>
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
                      <TooltipContent className="max-w-xs">Fração do tráfego real (Meta LP Views) que o Clarity conseguiu rastrear. Quanto menor, mais o tráfego vem de in-app browsers (FB/IG) que bloqueiam o script.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">LP Views Meta</TableHead>
                  <TableHead className="text-right">Forms 30d</TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1 font-semibold text-foreground">Conv % (Meta) <Star className="h-3 w-3 text-amber-500 fill-amber-500" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Conversion rate real: submissions com utm_source=meta ÷ LP views da Meta. Esta é a métrica primária pra decisão de escalonamento.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">CPL real <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Custo por form-submit. Gasto Meta total ÷ submissions com utm_source=meta.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">Conv % (amostra Clarity) <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">Conversion rate calculada com sessões do Clarity. Como Clarity captura só 3-49% do tráfego real (in-app browsers bloqueiam), esse valor é impreciso. Use "Conv % (Meta)" pra decisões.</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>Alerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lps.isLoading && <TableRow><TableCell colSpan={13} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>}
                {!lps.isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={13} className="text-center py-6 text-muted-foreground">Nenhuma LP encontrada.</TableCell></TableRow>}
                {filtered.map((r) => (
                  <TableRow key={r.lp_id ?? r.id ?? r.url}>
                    <TableCell>
                      <div className="font-medium">{r.nome ?? "—"}</div>
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
                    <TableCell className="text-right tabular-nums">{num(r.sessions_clarity_30d)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.clarity_sample_rate_pct == null ? <span className="text-muted-foreground">—</span> : <span className={sampleColor(r.clarity_sample_rate_pct)}>{Number(r.clarity_sample_rate_pct).toFixed(1)}%</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{num(r.meta_lp_views_30d)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(r.submissions_30d)}</TableCell>
                    <TableCell className="text-right">
                      {(() => { const m = r.cvr_meta_pct_30d ?? r.taxa_conversao_meta_pct; return <Badge variant="outline" className={`tabular-nums ${convMetaClass(m)}`}>{m == null ? "—" : pct(m)}</Badge>; })()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.cpl_real_30d == null ? <span className="text-muted-foreground">—</span> : <span className={cplColor(r.cpl_real_30d)}>{brl(r.cpl_real_30d)}</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {(() => { const c = r.cvr_clarity_pct_30d ?? r.taxa_conversao_clarity_pct; return c == null ? "—" : pct(c); })()}
                    </TableCell>
                    <TableCell>
                      {r.alerta ? <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-500/30">{r.alerta}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
