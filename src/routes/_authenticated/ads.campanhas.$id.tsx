import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, num, pct, statusBadge, healthColor, healthLabel } from "@/lib/ads-utils";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { ArrowLeft, MessageSquare, Play, Pause, DollarSign, Archive, Loader2, Layers, Plus } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/ads/campanhas/$id")({
  component: CampanhaDetail,
});

function CampanhaDetail() {
  const { id } = Route.useParams();

  const camp = useQuery({
    queryKey: ["mads", "camp", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_conversao_vs_crm").select("*").eq("campanha_uuid", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const funil = useQuery({
    queryKey: ["mads", "funil", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_funil_diario").select("*").eq("campanha_uuid", id).order("dia");
      if (error) throw error;
      return data ?? [];
    },
  });

  const adSets = useQuery({
    queryKey: ["mads", "adsets", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_ad_sets").select("*").eq("campanha_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const adSetIds = (adSets.data ?? []).map((a) => a.id);
  const ads = useQuery({
    enabled: adSetIds.length > 0,
    queryKey: ["mads", "ads", id, adSetIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_ads").select("*").in("ad_set_id", adSetIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const contacts = useQuery({
    enabled: !!camp.data?.utm_campaign,
    queryKey: ["contacts", camp.data?.utm_campaign],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, cargo, faixa_de_faturamento, created_at")
        .eq("utm_campaign", camp.data!.utm_campaign!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [adsetBusy, setAdsetBusy] = useState<string | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [novoOrc, setNovoOrc] = useState("");

  const c = camp.data;
  const status = (c?.status ?? "").toLowerCase();

  async function mutate(acao: string, extra: Record<string, unknown> = {}, okMsg = "Feito ✅") {
    if (!c?.campanha_uuid) return;
    setBusy(acao);
    try {
      const r = await callEdgeFunction("meta-update-campaign", {
        entidade_tipo: "campaign",
        local_id: c.campanha_uuid,
        acao,
        ...extra,
      });
      if (r.ok) {
        toast.success(okMsg);
        await camp.refetch();
        qc.invalidateQueries();
      } else {
        toast.error(`Falhou: ${r.error ?? "erro desconhecido"}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function pausar() {
    if (!confirm("Pausar campanha agora?")) return;
    await mutate("pause", {}, "Campanha pausada no Meta ✅");
  }
  async function ativar() {
    if (!confirm("Ativar campanha agora?")) return;
    await mutate("activate", {}, "Campanha ativada no Meta ✅");
  }
  async function arquivar() {
    if (!confirm("Arquivar campanha? Ela deixa de veicular e some da lista ativa.")) return;
    await mutate("archive", {}, "Campanha arquivada ✅");
  }
  async function toggleAdset(adsetId: string, acao: "pause" | "activate") {
    setAdsetBusy(adsetId);
    try {
      const r = await callEdgeFunction("meta-update-campaign", { entidade_tipo: "adset", local_id: adsetId, acao });
      if (r.ok) {
        toast.success(acao === "pause" ? "Ad set pausado ✅" : "Ad set ativado ✅");
        await adSets.refetch();
        qc.invalidateQueries();
      } else {
        toast.error(`Falhou: ${r.error ?? "erro desconhecido"}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAdsetBusy(null);
    }
  }

  async function salvarOrcamento() {
    const v = parseFloat(novoOrc.replace(",", "."));
    if (!v || v < 1) {
      toast.error("Informe um valor válido (mín R$1).");
      return;
    }
    await mutate("update_budget", { novo_orcamento_diario_centavos: Math.round(v * 100) }, `Orçamento atualizado para ${brl(v)}/dia ✅`);
    setBudgetOpen(false);
    setNovoOrc("");
  }

  return (
    <div className="space-y-6">
      <Link to="/ads/campanhas" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{c?.campanha_nome ?? "Carregando..."}</h1>
          <div className="flex items-center gap-2 mt-2">
            {c?.status && <Badge variant="outline" className={statusBadge(c.status)}>{c.status}</Badge>}
            {c?.tipo_lead && <Badge variant="outline">{c.tipo_lead}</Badge>}
            {c?.status_conexao && <Badge variant="outline" className={healthColor(c.status_conexao)}>{healthLabel(c.status_conexao)}</Badge>}
          </div>
          {c?.diagnostico && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{c.diagnostico}</p>}
        </div>
        <Button variant="outline" disabled>
          <MessageSquare className="h-4 w-4 mr-2" /> Falar com Claude para gerenciar
        </Button>
      </div>

      {c && (
        <div className="flex flex-wrap items-center gap-2">
          {status === "pausada" && (
            <Button size="sm" onClick={ativar} disabled={!!busy}>
              {busy === "activate" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />} Ativar
            </Button>
          )}
          {status === "ativa" && (
            <Button size="sm" variant="outline" onClick={pausar} disabled={!!busy} className="border-yellow-500/40 text-yellow-600 hover:text-yellow-700">
              {busy === "pause" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />} Pausar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { setNovoOrc(String(c.orcamento_diario_brl ?? "")); setBudgetOpen(true); }} disabled={!!busy}>
            <DollarSign className="h-4 w-4 mr-2" /> Editar orçamento
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/ads/campanhas/$id/adicionar-adset" params={{ id: c.campanha_uuid ?? "" }}>
              <Layers className="h-4 w-4 mr-2" /> Adicionar adset
            </Link>
          </Button>
          <Button size="sm" variant="destructive" onClick={arquivar} disabled={!!busy || status === "arquivada"}>
            {busy === "archive" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />} Arquivar
          </Button>
        </div>
      )}

      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar orçamento diário</DialogTitle>
            <DialogDescription>Valor em reais. Atual: {brl(c?.orcamento_diario_brl)}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="orc">Novo orçamento diário (R$)</Label>
            <Input id="orc" type="number" min={1} step="1" value={novoOrc} onChange={(e) => setNovoOrc(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetOpen(false)}>Cancelar</Button>
            <Button onClick={salvarOrcamento} disabled={busy === "update_budget"}>
              {busy === "update_budget" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Gasto 30d" value={brl(c?.gasto_30d_brl)} />
        <Kpi label="LP Views" value={num(c?.lp_views_30d)} />
        <Kpi label="Leads Meta" value={num(c?.leads_meta_30d)} />
        <Kpi label="Contacts CRM" value={num(c?.contacts_crm_30d)} />
        <Kpi label="CPL Meta" value={brl(c?.cpl_meta_brl)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Evolução diária</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={funil.data ?? []}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(d) => d?.slice(5)} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="leads_meta" stroke="#3b82f6" strokeWidth={2} name="Leads Meta" dot={false} />
              <Line type="monotone" dataKey="contacts_crm" stroke="#10b981" strokeWidth={2} name="Contacts CRM" dot={false} />
              <Line type="monotone" dataKey="lp_views" stroke="#f59e0b" strokeWidth={2} name="LP Views" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ad Sets ({adSets.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ad Set</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Orçamento</TableHead><TableHead>Otimização</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(adSets.data ?? []).map((a: any) => {
                const orcBrl = a.orcamento_diario_brl ?? (a.orcamento_diario_centavos != null ? a.orcamento_diario_centavos / 100 : a.daily_budget_brl);
                const ativo = (a.status ?? "").toLowerCase() === "ativa";
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nome ?? a.name}</TableCell>
                    <TableCell><Badge variant="outline" className={statusBadge(a.status)}>{a.status}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{brl(orcBrl)}/dia</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.optimization_goal ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/ads/adsets/$id/adicionar-ad" params={{ id: a.id }}><Plus className="h-3.5 w-3.5 mr-1" /> Ad</Link>
                        </Button>
                        {ativo ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600 hover:text-yellow-700" title="Pausar ad set" disabled={adsetBusy === a.id} onClick={() => toggleAdset(a.id, "pause")}>
                            {adsetBusy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" title="Ativar ad set" disabled={adsetBusy === a.id} onClick={() => toggleAdset(a.id, "activate")}>
                            {adsetBusy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {adSets.data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem ad sets.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Anúncios ({ads.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(ads.data ?? []).slice(0, 50).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome ?? a.name}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadge(a.status)}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {ads.data?.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Sem anúncios.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leads atribuídos no CRM</CardTitle>
          <CardDescription>Contatos com utm_campaign = <code className="text-xs">{c?.utm_campaign ?? "—"}</code></CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Cargo</TableHead><TableHead>Faturamento</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
            <TableBody>
              {(contacts.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell className="text-xs">{p.email}</TableCell>
                  <TableCell className="text-xs">{p.cargo ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.faixa_de_faturamento ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                </TableRow>
              ))}
              {contacts.data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum contato atribuído.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </CardContent></Card>
  );
}
