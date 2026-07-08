import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PERIODOS, rangeFromPeriodo, periodoLabel, type Periodo } from "@/lib/periodo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AbrirNoMetaButton, urlMetaAd } from "@/components/ads/AbrirNoMeta";
import { Film, ChevronDown, ChevronRight, Trophy, AlertTriangle, Rocket } from "lucide-react";
import { brl, num } from "@/lib/ads-utils";

export const Route = createFileRoute("/_authenticated/ads/criativos")({
  component: Criativos,
});

function semaforoClass(s: string | null | undefined) {
  switch ((s ?? "").toLowerCase()) {
    case "verde": return "bg-emerald-500 text-white";
    case "amarelo": return "bg-yellow-500 text-white";
    case "vermelho": return "bg-red-500 text-white";
    case "vermelho_desqualificado": return "bg-orange-500 text-white";
    case "kill": return "bg-black text-white";
    default: return "bg-gray-200 text-gray-500";
  }
}
function fmtPct1(n: number | null | undefined) {
  if (n == null) return "—";
  return `${Number(n).toFixed(1).replace(".", ",")}%`;
}
function MetricCell({ pct, semaforo }: { pct: number | null | undefined; semaforo: string | null | undefined }) {
  if ((semaforo ?? "") === "sem_dado" || pct == null) {
    return <Badge className="bg-gray-200 text-gray-500 border-transparent">—</Badge>;
  }
  const kill = (semaforo ?? "") === "kill";
  return <Badge className={`${semaforoClass(semaforo)} border-transparent tabular-nums gap-1`}>{kill && <AlertTriangle className="h-3 w-3" />}{fmtPct1(pct)}</Badge>;
}
// Célula de custo (CPMQL / CP SAL) colorida pelo semáforo. sem_dado → "sem dado" cinza.
function MoneyCell({ value, semaforo, primary }: { value: number | null | undefined; semaforo: string | null | undefined; primary?: boolean }) {
  if ((semaforo ?? "") === "sem_dado" || value == null) {
    return <Badge className="bg-gray-200 text-gray-500 border-transparent text-[11px]">sem dado</Badge>;
  }
  return <Badge className={`${semaforoClass(semaforo)} border-transparent tabular-nums ${primary ? "font-bold" : ""}`}>{brl(value)}</Badge>;
}

function ehBusinessOuContabil(nome: string | null | undefined) {
  const n = (nome ?? "").toLowerCase();
  return n.includes("business") || n.includes("contábil") || n.includes("contabil");
}

function Criativos() {
  const [legendaAberta, setLegendaAberta] = useState(false);
  const [status, setStatus] = useState("ativos");
  const [campanha, setCampanha] = useState("all");
  const [busca, setBusca] = useState("");

  // Período compartilhado com dashboard/insights.
  const savedP = (() => { try { return JSON.parse(localStorage.getItem("mads_periodo_dashboard") ?? "null"); } catch { return null; } })();
  const [periodo, setPeriodo] = useState<Periodo>(typeof window !== "undefined" ? (savedP ?? "7d") : "7d");
  useEffect(() => { try { localStorage.setItem("mads_periodo_dashboard", JSON.stringify(periodo)); } catch { /* ignore */ } }, [periodo]);
  const { since, until } = rangeFromPeriodo(periodo);

  const criativos = useQuery({
    queryKey: ["mads", "criativos", since, until],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("mads_f_criativos_metricas", { p_since: since, p_until: until })
        .gt("video_plays", 0)
        .order("cpmql_brl", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Só Business/Contábil (exclui Academy).
  const base = useMemo(() => (criativos.data ?? []).filter((r) => ehBusinessOuContabil(r.campanha_nome)), [criativos.data]);

  const campanhas = useMemo(() => [...new Set(base.map((r) => r.campanha_nome).filter(Boolean))] as string[], [base]);

  // Ativos primeiro, depois pausados; dentro do grupo mantém a ordem por CPMQL (vinda da função).
  const rows = useMemo(() => base.filter((r) => {
    const st = (r.ad_status ?? "").toLowerCase();
    if (status === "ativos" && st !== "ativa") return false;
    if (status === "pausados" && st !== "pausada") return false;
    if (campanha !== "all" && r.campanha_nome !== campanha) return false;
    if (busca && !(r.ad_nome ?? "").toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  }).sort((a, b) => ((a.ad_status ?? "").toLowerCase() === "ativa" ? 0 : 1) - ((b.ad_status ?? "").toLowerCase() === "ativa" ? 0 : 1)), [base, status, campanha, busca]);

  // Cards de decisão — agora orientados por CPMQL (KPI real), não CVR.
  const melhor = useMemo(() => base
    .filter((r) => (r.cpmql_semaforo ?? "") === "verde" && (r.mql_no_crm ?? 0) > 0)
    .sort((a, b) => (a.cpmql_brl ?? Infinity) - (b.cpmql_brl ?? Infinity))[0], [base]);
  // Mata os fake positivos: vermelho no CPMQL OU volume de leads sem nenhum MQL (ex.: Contábil V2).
  const matar = useMemo(() => base
    .filter((r) => (r.ad_status ?? "").toLowerCase() === "ativa"
      && ((r.cpmql_semaforo ?? "") === "vermelho" || ((r.leads ?? 0) > 5 && (r.mql_no_crm ?? 0) === 0))
      && (r.gasto ?? 0) > 100)
    .sort((a, b) => (b.gasto ?? 0) - (a.gasto ?? 0))[0], [base]);
  const escalar = useMemo(() => base
    .filter((r) => (r.cpmql_semaforo ?? "") === "verde" && (r.gasto ?? 0) < 200 && (r.mql_no_crm ?? 0) > 0)
    .sort((a, b) => (a.cpmql_brl ?? Infinity) - (b.cpmql_brl ?? Infinity))[0], [base]);

  // Enquanto o ad-sync do Meta não reconciliar com o CRM, nenhum ad tem MQL atribuído.
  const semAtribuicaoCrm = useMemo(() => base.length > 0 && base.every((r) => (r.mql_no_crm ?? 0) === 0), [base]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Film className="h-6 w-6 text-primary" /> Métricas de Criativos</h1>
        <p className="text-sm text-muted-foreground">KPI primário: <strong className="text-foreground">CPMQL</strong> (custo por MQL) · funil do criativo (Hook → Body → Retenção → CTR → CVR) · Business & Contábil · {periodoLabel(periodo)}</p>
      </div>

      {semAtribuicaoCrm && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground">Atribuição CRM→ad pendente.</strong> As colunas MQL / CPMQL / CP SAL aparecem como “sem dado” porque os ad-IDs do CRM (<code>contacts.utm_term</code>) ainda não batem com os sincronizados em <code>mads_ads.meta_ad_id</code>. A estrutura já está pronta e acende sozinha quando o ad-sync do Meta reconciliar. Até lá, use CPL (secundário) e as métricas de vídeo.
          </span>
        </div>
      )}

      {/* Bloco 1 — Legenda dos benchmarks */}
      <Card>
        <button type="button" onClick={() => setLegendaAberta((v) => !v)} className="w-full text-left">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Como ler os semáforos</CardTitle>
              <CardDescription>Benchmarks do framework IAplicada (v2)</CardDescription>
            </div>
            {legendaAberta ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
        </button>
        {legendaAberta && (
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-1 pr-3">Etapa</th><th className="py-1 pr-3">O que mede</th>
                    <th className="py-1 pr-3">🟢 Bom</th><th className="py-1 pr-3">🟡 OK</th><th className="py-1 pr-3">🔴 Ruim</th><th className="py-1">⚫ Kill</th>
                  </tr>
                </thead>
                <tbody className="[&>tr]:border-b [&>tr]:border-border/50">
                  <LegRow etapa="1. Hook" mede="Video plays ÷ Impressões (thumb prende sem áudio?)" bom="≥85%" ok="60-85%" ruim="30-60%" kill="<30%" />
                  <LegRow etapa="2. Body" mede="3s views ÷ Plays (primeiros 3s prendem?)" bom="≥50%" ok="35-50%" ruim="25-35%" kill="<25%" />
                  <LegRow etapa="3. Retenção" mede="75% views ÷ 3s views (meio segura?)" bom="≥25%" ok="15-25%" ruim="10-15%" kill="<10%" />
                  <LegRow etapa="4. CTR real" mede="Cliques link ÷ 75% views (CTA convence?)" bom="8-30%" ok="30-60% ou 5-8%" ruim=">60%" kill="<5%" />
                  <LegRow etapa="5. CVR" mede="Leads ÷ 75% views (oferta+audiência convertem?)" bom="≥8%" ok="4-8%" ruim="2-4%" kill="<2%" />
                </tbody>
              </table>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><span className="inline-block h-2 w-2 rounded-full bg-orange-500 mr-1 align-middle" /><strong>CTR real &gt;60%</strong> = audiência clicando cedo demais ("desqualificado"). NÃO é kill automático — se o CVR também for verde e os leads virarem MQL/SAL, o ad converte mesmo assim. Verifique a qualidade dos leads.</p>
              <p><strong>Hook Rate ≥85% é NORMAL</strong> em vídeo Meta feed (autoplay dispara com 50% no viewport). O que sinaliza problema é Hook &lt;30% (carrossel/imagem com thumb fraco).</p>
              <p><strong>Gargalo típico:</strong> Retenção 75%. Boa parte dos top ads perde 88%+ da audiência antes do CTA — o meio do vídeo é onde investir.</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bloco 3 — Cards de decisão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DecisionCard
          tone="border-emerald-500/40 bg-emerald-500/5"
          icon={<Trophy className="h-5 w-5 text-emerald-600" />}
          title="Melhor criativo"
          ad={melhor}
          extra={melhor && <>CPMQL {brl(melhor.cpmql_brl)} · {num(melhor.mql_no_crm)} MQL · Taxa qualif. {fmtPct1(melhor.taxa_qualificacao_pct)}</>}
        />
        <DecisionCard
          tone="border-red-500/50 bg-red-500/10"
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          title="Precisa matar agora"
          cta="PAUSAR"
          ad={matar}
          extra={matar && <>{(matar.mql_no_crm ?? 0) === 0 ? <>{num(matar.leads)} leads, <strong className="text-red-600">0 MQL</strong></> : <>CPMQL {brl(matar.cpmql_brl)}</>} · Gasto {brl(matar.gasto)}</>}
        />
        <DecisionCard
          tone="border-indigo-500/40 bg-indigo-500/5"
          icon={<Rocket className="h-5 w-5 text-indigo-600" />}
          title="Escalar candidato"
          ad={escalar}
          extra={escalar && <>CPMQL {brl(escalar.cpmql_brl)} · {num(escalar.mql_no_crm)} MQL · Gasto {brl(escalar.gasto)}</>}
        />
      </div>

      {/* Bloco 2 — Tabela */}
      <div className="flex flex-wrap gap-3">
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[180px]"><span className="text-muted-foreground mr-1">Período:</span><SelectValue /></SelectTrigger>
          <SelectContent>{PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Só ativos</SelectItem>
            <SelectItem value="pausados">Só pausados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campanha} onValueChange={setCampanha}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Campanha" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas campanhas</SelectItem>
            {campanhas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar ad..." className="w-[220px]" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ad</TableHead><TableHead>Campanha</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">MQL</TableHead>
              <TableHead className="text-center">Taxa qualif.</TableHead>
              <TableHead className="text-center font-bold text-foreground">CPMQL ★</TableHead>
              <TableHead className="text-center">CP SAL</TableHead>
              <TableHead className="text-right text-muted-foreground font-normal">CPL</TableHead>
              <TableHead className="text-center">Hook</TableHead><TableHead className="text-center">Body</TableHead>
              <TableHead className="text-center">Retenção</TableHead><TableHead className="text-center">CTR real</TableHead>
              <TableHead className="text-center">CVR</TableHead>
              <TableHead>Diagnóstico</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {criativos.isLoading && <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!criativos.isLoading && rows.length === 0 && <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">Nenhum criativo com dados de vídeo.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.ad_uuid}>
                  <TableCell className="font-medium max-w-[220px] truncate" title={r.ad_nome}>{r.ad_nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{r.campanha_nome}</TableCell>
                  <TableCell><Badge variant="outline" className={(r.ad_status ?? "").toLowerCase() === "ativa" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-zinc-500/15 text-zinc-500 border-zinc-500/30"}>{r.ad_status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{brl(r.gasto)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(r.leads)}</TableCell>
                  <TableCell className="text-right tabular-nums">{(r.mql_no_crm ?? 0) > 0 ? num(r.mql_no_crm) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-center">{r.taxa_qualificacao_pct != null ? <span className="tabular-nums text-xs">{fmtPct1(r.taxa_qualificacao_pct)}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-center"><MoneyCell value={r.cpmql_brl} semaforo={r.cpmql_semaforo} primary /></TableCell>
                  <TableCell className="text-center"><MoneyCell value={r.cpsal_brl} semaforo={r.cpsal_semaforo} /></TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{r.cpl_brl != null ? brl(r.cpl_brl) : "—"}</TableCell>
                  <TableCell className="text-center"><MetricCell pct={r.hook_rate_pct} semaforo={r.hook_semaforo} /></TableCell>
                  <TableCell className="text-center"><MetricCell pct={r.body_rate_pct} semaforo={r.body_semaforo} /></TableCell>
                  <TableCell className="text-center"><MetricCell pct={r.retencao_75_pct} semaforo={r.retencao_semaforo} /></TableCell>
                  <TableCell className="text-center"><MetricCell pct={r.ctr_real_pct} semaforo={r.ctr_semaforo} /></TableCell>
                  <TableCell className="text-center"><MetricCell pct={r.cvr_pct} semaforo={r.cvr_semaforo} /></TableCell>
                  <TableCell className="text-xs font-medium max-w-[240px]">{r.diagnostico ?? "—"}</TableCell>
                  <TableCell>{r.meta_ad_id && <AbrirNoMetaButton url={urlMetaAd(r.meta_ad_id)} label="Meta" />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LegRow({ etapa, mede, bom, ok, ruim, kill }: { etapa: string; mede: string; bom: string; ok: string; ruim: string; kill: string }) {
  return (
    <tr>
      <td className="py-1 pr-3 font-semibold whitespace-nowrap">{etapa}</td>
      <td className="py-1 pr-3 text-muted-foreground">{mede}</td>
      <td className="py-1 pr-3"><span className="text-emerald-600 font-medium">{bom}</span></td>
      <td className="py-1 pr-3"><span className="text-yellow-600">{ok}</span></td>
      <td className="py-1 pr-3"><span className="text-red-600">{ruim}</span></td>
      <td className="py-1"><span className="text-foreground">{kill}</span></td>
    </tr>
  );
}

function DecisionCard({ tone, icon, title, ad, extra, cta }: { tone: string; icon: React.ReactNode; title: string; ad: any; extra: React.ReactNode; cta?: string }) {
  return (
    <Card className={tone}>
      <CardContent className="pt-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>
        {ad ? (
          <>
            <div className="font-medium text-sm truncate" title={ad.ad_nome}>{cta && <span className="text-red-600 font-bold mr-1">{cta} →</span>}{ad.ad_nome}</div>
            <div className="text-xs text-muted-foreground">{extra}</div>
            {ad.meta_ad_id && <AbrirNoMetaButton url={urlMetaAd(ad.meta_ad_id)} label="Abrir no Meta" />}
          </>
        ) : (
          <div className="text-xs text-muted-foreground">Nenhum criativo se encaixa agora.</div>
        )}
      </CardContent>
    </Card>
  );
}
