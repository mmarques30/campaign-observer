import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl, num, pct, statusBadge } from "@/lib/ads-utils";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { DuplicarAdDialog, type DupTarget } from "@/components/ads/DuplicarAdDialog";
import { AbrirNoMetaIcon, urlMetaAd } from "@/components/ads/AbrirNoMeta";
import { Pause, Play, Loader2, Copy } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { PERIODOS, rangeFromPeriodo, periodoLabel, type Periodo } from "@/lib/periodo";

export const Route = createFileRoute("/_authenticated/ads/anuncios")({
  component: Anuncios,
});

function semaforoText(s: string | null | undefined) {
  switch ((s ?? "").toLowerCase()) {
    case "verde": return "text-emerald-600";
    case "amarelo": return "text-yellow-600";
    case "vermelho": return "text-red-600";
    default: return "text-muted-foreground";
  }
}
// Semáforos calculados no front (a função devolve os valores; a régua é a mesma da view antiga).
function cpmqlSemaforo(mql: number | null | undefined, cpmql: number | null | undefined) {
  if (!mql || mql <= 0 || cpmql == null) return "sem_dado";
  if (cpmql <= 100) return "verde";
  if (cpmql <= 200) return "amarelo";
  return "vermelho";
}
function taxaQualifSemaforo(leadsCrm: number | null | undefined, mql: number | null | undefined) {
  if (!leadsCrm || leadsCrm <= 0) return "sem_dado";
  const t = (Number(mql ?? 0) / leadsCrm) * 100;
  if (t >= 50) return "verde";
  if (t >= 20) return "amarelo";
  return "vermelho";
}
// Célula CRM colorida por semáforo (taxa qualif. em % ou CPMQL em R$). sem_dado → "—".
function CrmCell({ value, semaforo, kind }: { value: number | null | undefined; semaforo: string | null | undefined; kind: "pct" | "brl" }) {
  if ((semaforo ?? "") === "sem_dado" || value == null) return <span className="text-muted-foreground">—</span>;
  const txt = kind === "pct" ? `${Number(value).toFixed(1).replace(".", ",")}%` : brl(value);
  return <span className={cn("tabular-nums font-semibold", semaforoText(semaforo))}>{txt}</span>;
}

function Anuncios() {
  // Período compartilhado com dashboard/insights/criativos.
  const savedP = (() => { try { return JSON.parse(localStorage.getItem("mads_periodo_dashboard") ?? "null"); } catch { return null; } })();
  const [periodo, setPeriodo] = useState<Periodo>(typeof window !== "undefined" ? (savedP ?? "7d") : "7d");
  useEffect(() => { try { localStorage.setItem("mads_periodo_dashboard", JSON.stringify(periodo)); } catch { /* ignore */ } }, [periodo]);
  const { since, until } = rangeFromPeriodo(periodo);

  const { data, isLoading } = useQuery({
    queryKey: ["mads", "ads_full", since, until],
    queryFn: async () => {
      // Uma função só: métricas Meta + CRM por ad na janela escolhida (dupla-chave).
      const { data, error } = await (supabase as any).rpc("mads_f_ads_crm", { p_since: since, p_until: until });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ad_uuid: r.ad_uuid,
        ad_nome: r.ad_nome,
        status: r.status,
        meta_ad_id: r.meta_ad_id ?? null,
        campanha_nome: r.campanha_nome ?? null,
        impressoes: r.impressoes ?? null,
        cliques_link: r.cliques_link ?? null,
        lp_views: r.lp_views ?? null,
        leads: r.leads_meta ?? null,
        gasto_brl: r.gasto ?? null,
        ctr_pct: r.ctr_pct ?? null,
        cpc_brl: r.cpc_brl ?? null,
        cpl_brl: r.cpl_brl ?? null,
        leads_crm: r.leads_crm ?? null,
        mql: r.mql ?? null,
        sal: r.sal ?? null,
        taxa_qualif_pct: r.taxa_qualif_pct ?? null,
        taxa_qualif_semaforo: taxaQualifSemaforo(r.leads_crm, r.mql),
        cpmql_brl: r.cpmql_brl ?? null,
        cpmql_semaforo: cpmqlSemaforo(r.mql, r.cpmql_brl),
      }));
    },
  });

  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [dupAd, setDupAd] = useState<DupTarget | null>(null);
  const [camp, setCamp] = useState("all");
  const [status, setStatus] = useState("all");

  async function toggleAd(adId: string, acao: "pause" | "activate") {
    setBusy(adId);
    try {
      const r = await callEdgeFunction("meta-update-campaign", { entidade_tipo: "ad", local_id: adId, acao });
      if (r.ok) {
        toast.success(acao === "pause" ? "Anúncio pausado ✅" : "Anúncio ativado ✅");
        await qc.invalidateQueries({ queryKey: ["mads", "ads_full"] });
      } else {
        toast.error(`Falhou: ${r.error ?? "erro desconhecido"}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const camps = useMemo(() => [...new Set((data ?? []).map((d: any) => d.campanha_nome).filter(Boolean))] as string[], [data]);
  const statuses = useMemo(() => [...new Set((data ?? []).map((d: any) => d.status).filter(Boolean))] as string[], [data]);

  // Default: menor CPMQL primeiro (NULLS LAST) — quem qualifica mais barato no topo.
  const rows = (data ?? []).filter((r: any) =>
    (camp === "all" || r.campanha_nome === camp) &&
    (status === "all" || r.status === status)
  ).sort((a: any, b: any) => (a.cpmql_brl ?? Infinity) - (b.cpmql_brl ?? Infinity));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Anúncios</h1>
        <p className="text-sm text-muted-foreground">Todos os anúncios · {periodoLabel(periodo)}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[180px]"><span className="text-muted-foreground mr-1">Período:</span><SelectValue /></SelectTrigger>
          <SelectContent>{PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={camp} onValueChange={setCamp}><SelectTrigger className="w-[280px]"><SelectValue placeholder="Campanha" /></SelectTrigger><SelectContent><SelectItem value="all">Todas campanhas</SelectItem>{camps.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos status</SelectItem>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Campanha</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Impr.</TableHead><TableHead className="text-right">Cliques</TableHead>
              <TableHead className="text-right">LP Views</TableHead>
              <TableHead className="text-right">Leads Meta</TableHead>
              <TableHead className="text-right">Leads CRM</TableHead>
              <TableHead className="text-right">MQL</TableHead>
              <TableHead className="text-right">SAL</TableHead>
              <TableHead className="text-right">Taxa qualif.</TableHead>
              <TableHead className="text-right font-bold text-foreground">CPMQL ★</TableHead>
              <TableHead className="text-right">Gasto</TableHead><TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPC</TableHead><TableHead className="text-right">CPL</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">Nenhum anúncio.</TableCell></TableRow>}
              {rows.map((a: any) => (
                <TableRow key={a.ad_uuid}>
                  <TableCell className="font-medium max-w-[260px] truncate">{a.ad_nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{a.campanha_nome}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadge(a.status)}>{a.status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{num(a.impressoes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(a.cliques_link)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(a.lp_views)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(a.leads)}</TableCell>
                  <TableCell className="text-right tabular-nums">{(a.leads_crm ?? 0) > 0 ? num(a.leads_crm) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{(a.mql ?? 0) > 0 ? num(a.mql) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{(a.sal ?? 0) > 0 ? num(a.sal) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right"><CrmCell value={a.taxa_qualif_pct} semaforo={a.taxa_qualif_semaforo} kind="pct" /></TableCell>
                  <TableCell className="text-right"><CrmCell value={a.cpmql_brl} semaforo={a.cpmql_semaforo} kind="brl" /></TableCell>
                  <TableCell className="text-right tabular-nums">{brl(a.gasto_brl)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(a.ctr_pct)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(a.cpc_brl)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(a.cpl_brl)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {(a.status ?? "").toLowerCase() === "ativa" ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600 hover:text-yellow-700" title="Pausar" disabled={busy === a.ad_uuid} onClick={() => toggleAd(a.ad_uuid ?? "", "pause")}>
                          {busy === a.ad_uuid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" title="Ativar" disabled={busy === a.ad_uuid} onClick={() => toggleAd(a.ad_uuid ?? "", "activate")}>
                          {busy === a.ad_uuid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Duplicar com variação" onClick={() => setDupAd({ id: a.ad_uuid ?? "", nome: a.ad_nome ?? "" })}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {a.meta_ad_id && <AbrirNoMetaIcon url={urlMetaAd(a.meta_ad_id)} title="Abrir anúncio no Meta" />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DuplicarAdDialog ad={dupAd} onClose={() => setDupAd(null)} />
    </div>
  );
}
