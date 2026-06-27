import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Webhook, Info, ExternalLink, Send, Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { brl, num } from "@/lib/ads-utils";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend, ReferenceLine } from "recharts";

export const Route = createFileRoute("/_authenticated/ads/capi-events")({
  component: CapiEvents,
});

const META_PIXEL = "619312151238896";
const EVENTS_MANAGER_URL = `https://business.facebook.com/events_manager2/list/pixel/${META_PIXEL}/test_events`;
const META_GOAL = 500;

function statusBadgeClass(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "sent") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (v === "pending") return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
  if (v === "failed") return "bg-red-500/15 text-red-600 border-red-500/30";
  if (v === "skipped_too_old" || v === "skipped") return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
  return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
}

function fmtData(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function CapiEvents() {
  const qc = useQueryClient();
  const [testCode, setTestCode] = useState("");
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const status = useQuery({
    queryKey: ["capi", "status"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("v_meta_capi_status").select("*").maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const recent = useQuery({
    queryKey: ["capi", "recent"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("v_meta_capi_recent").select("*").order("event_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const daily = useQuery({
    queryKey: ["capi", "daily"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("v_meta_capi_daily").select("*").order("dia");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const s = status.data;
  const sentTotal = Number(s?.sent_total ?? 0);
  const pending = Number(s?.pending ?? 0);
  const failed = Number(s?.failed ?? 0);
  const faltam = Number(s?.faltam_pra_otimizacao_sal ?? Math.max(0, META_GOAL - sentTotal));
  const progresso = Math.min(100, (sentTotal / META_GOAL) * 100);

  // Agrega o diário por dia (a view tem dimensão event_name).
  const byDay = new Map<string, { dia: string; enviados: number; falhas: number; valor: number }>();
  for (const r of daily.data ?? []) {
    const k = r.dia ?? "";
    const cur = byDay.get(k) ?? { dia: k, enviados: 0, falhas: 0, valor: 0 };
    cur.enviados += Number(r.enviados ?? 0);
    cur.falhas += Number(r.falhas ?? 0);
    cur.valor += Number(r.valor_total_brl ?? 0);
    byDay.set(k, cur);
  }
  const chart = [...byDay.values()].sort((a, b) => a.dia.localeCompare(b.dia)).map((d) => ({ ...d, label: d.dia.slice(5) }));

  async function enviarTeste() {
    if (!testCode.trim()) {
      toast.error("Cole o Test Event Code da Meta.");
      return;
    }
    setSending(true);
    setTestResult(null);
    try {
      const r = await callEdgeFunction("meta-capi-send-event", { limit: 1, test_event_code: testCode.trim() });
      if (r.ok !== false && !r.error) {
        setTestResult({ ok: true, msg: `Evento enviado. Veja em Test Events da Meta.${r.fbtrace_id ? ` (fbtrace: ${r.fbtrace_id})` : ""}` });
        toast.success("Evento de teste enviado ✓");
        qc.invalidateQueries({ queryKey: ["capi"] });
      } else {
        setTestResult({ ok: false, msg: r.error ?? "Falha ao enviar." });
        toast.error(`Falha: ${r.error ?? "erro desconhecido"}`);
      }
    } catch (e) {
      setTestResult({ ok: false, msg: (e as Error).message });
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function processarFila() {
    setProcessing(true);
    toast.info("Processando fila CAPI...");
    try {
      const r = await callEdgeFunction("meta-capi-send-event", { limit: 50 });
      const enviados = r.sent ?? r.enviados ?? r.processed ?? 0;
      const falharam = r.failed ?? r.falhas ?? 0;
      toast.success(`✓ ${num(enviados)} enviados, ${num(falharam)} falharam`);
      qc.invalidateQueries({ queryKey: ["capi"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Webhook className="h-6 w-6 text-primary" /> Eventos CAPI</h1>
            <p className="text-sm text-muted-foreground">Conversions API · evento SAL_accepted enviado ao Meta Pixel automaticamente</p>
          </div>
          <Button variant="outline" onClick={processarFila} disabled={processing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${processing ? "animate-spin" : ""}`} /> Processar fila agora
          </Button>
        </div>

        {/* Bloco 1 — Cards de status */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Kpi label="Enviados (total)" value={num(sentTotal)} accent="text-primary" />
          <Kpi label="Pendentes" value={num(pending)} accent={pending > 0 ? "text-yellow-600" : "text-emerald-600"} />
          <Kpi label="Falhas" value={num(failed)} accent={failed > 0 ? "text-red-600" : "text-emerald-600"} />
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Faltam pra 500
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs">Quando atingir 500 eventos SAL_accepted, a Meta tem volume suficiente pra otimizar campanhas pra esse evento em vez de Lead. Isso melhora a qualidade dos leads que o anúncio atrai.</TooltipContent>
                </Tooltip>
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums">{num(faltam)}</div>
              <Progress value={progresso} className="mt-2 h-2" />
              <div className="text-[10px] text-muted-foreground mt-1">{num(sentTotal)}/{META_GOAL} ({progresso.toFixed(0)}%)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">Último envio</div>
              <div className="mt-2 text-lg font-semibold">
                {s?.last_sent_at ? `há ${formatDistanceToNow(new Date(s.last_sent_at), { locale: ptBR })}` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bloco 2 — Disparar Test Event */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disparar Test Event</CardTitle>
            <CardDescription>Envia 1 evento marcado como teste para validar a integração no Events Manager.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center gap-1">
                <Label htmlFor="testcode">Cole o código do Test Events Tool da Meta</Label>
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs">Vá em Events Manager → Pixel IA Aplicada → aba Test Events → copie o código "TESTxxxx" que aparece.</TooltipContent>
                </Tooltip>
              </div>
              <Input id="testcode" value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="TEST12345" />
              <a href={EVENTS_MANAGER_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Abrir Events Manager <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Button onClick={enviarTeste} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Enviar evento de teste
            </Button>
            {testResult && (
              <div className={`text-sm flex items-start gap-2 ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
                {testResult.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                {testResult.msg}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 4 — Gráfico por dia */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos por dia (30 dias)</CardTitle>
            <CardDescription>Enviados vs falhas · linha tracejada = meta diária (10) para chegar a 500 em 30 dias</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {daily.isLoading ? (
              <div className="h-full w-full animate-pulse bg-muted/30 rounded-md" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: any, n: any) => [num(Number(v)), n]}
                    labelFormatter={(l: any) => {
                      const row = chart.find((c) => c.label === l);
                      return `${l}${row ? ` · ${num(row.enviados)} SAL · ${brl(row.valor)}` : ""}`;
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={10} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 2" label={{ value: "meta/dia", fontSize: 10, fill: "hsl(var(--muted-foreground))", position: "right" }} />
                  <Bar dataKey="enviados" name="Enviados" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="falhas" name="Falhas" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bloco 3 — Tabela de eventos recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos recentes</CardTitle>
            <CardDescription>Últimos 100 · clique numa linha para ver detalhes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Quando</TableHead><TableHead>Evento</TableHead><TableHead>Status</TableHead>
                <TableHead>Lead</TableHead><TableHead>Email</TableHead><TableHead>Deal</TableHead>
                <TableHead className="text-right">Valor</TableHead><TableHead>UTM Source</TableHead>
                <TableHead>Campanha</TableHead><TableHead className="text-center">Meta</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {recent.isLoading && <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>}
                {!recent.isLoading && (recent.data?.length ?? 0) === 0 && <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Nenhum evento ainda.</TableCell></TableRow>}
                {(recent.data ?? []).map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtData(e.event_at)}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-blue-500/15 text-blue-600 border-blue-500/30">{e.event_name ?? "—"}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusBadgeClass(e.status)}>{e.status ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{[e.first_name, e.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell className="text-xs">{e.email ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{e.deal_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{e.deal_value != null ? brl(e.deal_value) : "—"}</TableCell>
                    <TableCell className="text-xs">{e.utm_source ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">{e.utm_campaign ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      {String(e.meta_events_received) === "1" ? <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" /> : <span className="text-xs text-muted-foreground">{e.meta_events_received ?? "—"}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do evento</DialogTitle>
              <DialogDescription>{selected?.event_name} · {fmtData(selected?.event_at)}</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-2 text-sm">
                <Det label="Status" value={selected.status} />
                <Det label="Event ID" value={selected.event_id} mono />
                <Det label="Lead" value={[selected.first_name, selected.last_name].filter(Boolean).join(" ") || "—"} />
                <Det label="Email" value={selected.email} />
                <Det label="Deal" value={selected.deal_name} />
                <Det label="Valor" value={selected.deal_value != null ? brl(selected.deal_value) : "—"} />
                <Det label="UTM Source" value={selected.utm_source} />
                <Det label="UTM Campaign" value={selected.utm_campaign} />
                <Det label="Tentativas" value={String(selected.attempt_count ?? "—")} />
                <Det label="Test Event Code" value={selected.test_event_code} mono />
                <Det label="Meta events_received" value={String(selected.meta_events_received ?? "—")} />
                <Det label="fbtrace_id" value={selected.meta_fbtrace_id} mono />
                {selected.last_error && (
                  <div>
                    <div className="text-xs text-muted-foreground">Erro</div>
                    <div className="text-xs text-red-700 whitespace-pre-wrap bg-red-500/5 rounded p-2 mt-1">{selected.last_error}</div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-2 text-2xl font-bold tabular-nums ${accent ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Det({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs text-right break-all ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}
