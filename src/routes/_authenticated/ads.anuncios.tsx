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
import { callEdgeFunction } from "@/lib/ads-mutations";
import { DuplicarAdDialog, type DupTarget } from "@/components/ads/DuplicarAdDialog";
import { Pause, Play, Loader2, Copy } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/ads/anuncios")({
  component: Anuncios,
});

function Anuncios() {
  const { data, isLoading } = useQuery({
    queryKey: ["mads", "topAds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_top_ads_30d").select("*");
      if (error) throw error;
      return data ?? [];
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

  const rows = (data ?? []).filter((r) =>
    (camp === "all" || r.campanha_nome === camp) &&
    (status === "all" || r.status === status)
  ).sort((a, b) => (b.gasto_brl ?? 0) - (a.gasto_brl ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Top anúncios</h1>
        <p className="text-sm text-muted-foreground">Performance dos últimos 30 dias</p>
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
              <TableHead className="text-right">LP Views</TableHead><TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Gasto</TableHead><TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPC</TableHead><TableHead className="text-right">CPL</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Nenhum anúncio.</TableCell></TableRow>}
              {rows.map((a) => (
                <TableRow key={a.ad_uuid}>
                  <TableCell className="font-medium max-w-[260px] truncate">{a.ad_nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{a.campanha_nome}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadge(a.status)}>{a.status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{num(a.impressoes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(a.cliques_link)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(a.lp_views)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(a.leads)}</TableCell>
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
