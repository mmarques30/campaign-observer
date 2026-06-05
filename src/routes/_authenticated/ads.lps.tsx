import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { num, pct } from "@/lib/ads-utils";
import { ExternalLink, CheckCircle2, XCircle, Info, Globe, ShieldCheck, AlertTriangle } from "lucide-react";

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
                  <TableHead className="text-right">LP Views Meta</TableHead>
                  <TableHead className="text-right">Forms 30d</TableHead>
                  <TableHead className="text-right">Conv % (Meta)</TableHead>
                  <TableHead className="text-right">Conv % (Clarity)</TableHead>
                  <TableHead>Alerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lps.isLoading && <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>}
                {!lps.isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">Nenhuma LP encontrada.</TableCell></TableRow>}
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
                    <TableCell className="text-right tabular-nums">{num(r.meta_lp_views_30d)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(r.submissions_30d)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(r.taxa_conversao_meta_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(r.taxa_conversao_clarity_pct)}</TableCell>
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
