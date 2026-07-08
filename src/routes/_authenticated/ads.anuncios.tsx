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
import { useState, useMemo } from "react";

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
// Célula CRM colorida por semáforo (taxa qualif. em % ou CPMQL em R$). sem_dado → "—".
function CrmCell({ value, semaforo, kind }: { value: number | null | undefined; semaforo: string | null | undefined; kind: "pct" | "brl" }) {
  if ((semaforo ?? "") === "sem_dado" || value == null) return <span className="text-muted-foreground">—</span>;
  const txt = kind === "pct" ? `${Number(value).toFixed(1).replace(".", ",")}%` : brl(value);
  return <span className={cn("tabular-nums font-semibold", semaforoText(semaforo))}>{txt}</span>;
}

function Anuncios() {
  const { data, isLoading } = useQuery({
    queryKey: ["mads", "topAds"],
    queryFn: async () => {
      // Lista TODOS os anúncios (mads_ads) e enriquece com as métricas 30d da view
      // (a view top_ads corta em 50 por gasto e deixa de fora anúncios ativos sem volume).
      const [adsRes, viewRes, adsetRes, convRes, crmRes] = await Promise.all([
        supabase.from("mads_ads").select("id, nome, status, ad_set_id, meta_ad_id"),
        supabase.from("mads_v_top_ads_30d").select("*"),
        supabase.from("mads_ad_sets").select("id, campanha_id"),
        supabase.from("mads_v_conversao_vs_crm").select("campanha_uuid, campanha_nome"),
        (supabase as any).from("mads_v_ads_crm_30d").select("*"),
      ]);
      if (adsRes.error) throw adsRes.error;
      if (viewRes.error) throw viewRes.error;

      const viewByAd = new Map((viewRes.data ?? []).map((v: any) => [v.ad_uuid, v]));
      const adsetCamp = new Map((adsetRes.data ?? []).map((a: any) => [a.id, a.campanha_id]));
      const campNome = new Map((convRes.data ?? []).map((c: any) => [c.campanha_uuid, c.campanha_nome]));
      const crmByAd = new Map((crmRes.data ?? []).map((c: any) => [c.ad_uuid, c]));

      return (adsRes.data ?? []).map((a: any) => {
        const v: any = viewByAd.get(a.id) ?? {};
        const crm: any = crmByAd.get(a.id) ?? {};
        return {
          ad_uuid: a.id,
          ad_nome: a.nome,
          status: a.status,
          meta_ad_id: a.meta_ad_id ?? v.meta_ad_id ?? null,
          campanha_nome: v.campanha_nome ?? campNome.get(adsetCamp.get(a.ad_set_id)) ?? null,
          impressoes: v.impressoes ?? null,
          cliques_link: v.cliques_link ?? null,
          lp_views: v.lp_views ?? null,
          leads: v.leads ?? null,
          gasto_brl: v.gasto_brl ?? null,
          ctr_pct: v.ctr_pct ?? null,
          cpc_brl: v.cpc_brl ?? null,
          cpl_brl: v.cpl_brl ?? null,
          // CRM (dupla-chave por ad)
          leads_crm: crm.leads_crm ?? null,
          mql: crm.mql ?? null,
          sal: crm.sal ?? null,
          taxa_qualif_pct: crm.taxa_qualif_pct ?? null,
          taxa_qualif_semaforo: crm.taxa_qualif_semaforo ?? "sem_dado",
          cpmql_brl: crm.cpmql_brl ?? null,
          cpmql_semaforo: crm.cpmql_semaforo ?? "sem_dado",
        };
      });
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
        await qc.invalidateQueries({ queryKey: ["mads", "topAds"] });
      } else {
        toast.error(`Falhou: ${r.error ?? "erro desconhecido"}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const camps = useMemo(() => [...new Set((data ?? []).map((d) => d.campanha_nome).filter(Boolean))] as string[], [data]);
  const statuses = useMemo(() => [...new Set((data ?? []).map((d) => d.status).filter(Boolean))] as string[], [data]);

  // Default: menor CPMQL primeiro (NULLS LAST) — quem qualifica mais barato no topo.
  const rows = (data ?? []).filter((r) =>
    (camp === "all" || r.campanha_nome === camp) &&
    (status === "all" || r.status === status)
  ).sort((a, b) => (a.cpmql_brl ?? Infinity) - (b.cpmql_brl ?? Infinity));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Anúncios</h1>
        <p className="text-sm text-muted-foreground">Todos os anúncios · métricas dos últimos 30 dias</p>
      </div>

      <div className="flex flex-wrap gap-3">
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
              {rows.map((a) => (
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
