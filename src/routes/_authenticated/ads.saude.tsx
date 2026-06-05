import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { healthColor, healthLabel, brl, num } from "@/lib/ads-utils";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ads/saude")({
  component: Saude,
});

function Saude() {
  const health = useQuery({
    queryKey: ["mads", "health"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_health_check").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const conv = useQuery({
    queryKey: ["mads", "conversao"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_conversao_vs_crm").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const logs = useQuery({
    queryKey: ["mads", "logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_execution_log").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const forms = useQuery({
    queryKey: ["forms24h"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("form_submissions")
        .select("id, submitted_at, form_id, utm_source, utm_campaign, contacts:contact_id(email)")
        .gte("submitted_at", since)
        .order("submitted_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const problemas = (conv.data ?? []).filter((c) => c.precisa_atencao === true);
  const activeCampaigns = new Set((conv.data ?? []).filter((c) => c.status === "ativa").map((c) => c.utm_campaign).filter(Boolean));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saúde & diagnóstico</h1>
        <p className="text-sm text-muted-foreground">Health check, logs de execução e UTMs perdidos</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Health check</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Campanhas</TableHead></TableRow></TableHeader>
            <TableBody>
              {(health.data ?? []).map((h, i) => (
                <TableRow key={i}>
                  <TableCell><Badge variant="outline" className={healthColor(h.status_conexao)}>{healthLabel(h.status_conexao)}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{h.total_campanhas}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-2xl">{h.campanhas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico automático</CardTitle>
          <CardDescription>{problemas.length} campanha(s) precisam de atenção</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {problemas.length === 0 && <div className="flex items-center gap-2 text-emerald-400 text-sm"><CheckCircle2 className="h-4 w-4" /> Tudo certo!</div>}
          {problemas.map((p) => {
            const critical = p.status_conexao === "crm_nao_recebe" || p.status_conexao === "meta_nao_atribui";
            return (
              <div key={p.campanha_uuid} className={`p-4 rounded-md border ${critical ? "border-red-500/40 bg-red-500/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
                <div className="flex items-start gap-3">
                  {critical ? <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.campanha_nome}</span>
                      <Badge variant="outline" className={healthColor(p.status_conexao)}>{healthLabel(p.status_conexao)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{p.diagnostico}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground tabular-nums">
                      <span>Gasto: {brl(p.gasto_30d_brl)}</span>
                      <span>Leads Meta: {num(p.leads_meta_30d)}</span>
                      <span>Contacts CRM: {num(p.contacts_crm_30d)}</span>
                    </div>
                    <p className="text-xs mt-2 italic text-muted-foreground">→ Fale com Claude para investigar.</p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Últimos logs de execução</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Ação</TableHead><TableHead>Origem</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Duração</TableHead><TableHead>Mensagem</TableHead></TableRow></TableHeader>
            <TableBody>
              {(logs.data ?? []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-xs">{l.acao ?? l.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.origem ?? l.source ?? "—"}</TableCell>
                  <TableCell>
                    {l.sucesso || l.success ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">OK</Badge>
                      : <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">FAIL</Badge>}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{l.duracao_ms ?? l.duration_ms ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md truncate">{l.mensagem ?? l.message ?? l.erro ?? l.error}</TableCell>
                </TableRow>
              ))}
              {logs.data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Sem logs.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form submissions (últimas 24h)</CardTitle>
          <CardDescription>Destaque em vermelho: UTM "direct" com campanha ativa rodando (UTM perdido)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Form</TableHead><TableHead>UTM source</TableHead><TableHead>UTM campaign</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
            <TableBody>
              {(forms.data ?? []).map((f) => {
                const suspeito = (f.utm_source ?? "").toLowerCase() === "direct" && activeCampaigns.size > 0;
                return (
                  <TableRow key={f.id} className={suspeito ? "bg-red-500/5" : ""}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{f.submitted_at ? new Date(f.submitted_at).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-xs">{f.form_id ?? "—"}</TableCell>
                    <TableCell className="text-xs">{suspeito ? <span className="text-red-400 font-medium">{f.utm_source}</span> : (f.utm_source ?? "—")}</TableCell>
                    <TableCell className="text-xs">{f.utm_campaign ?? "—"}</TableCell>
                    <TableCell className="text-xs">{(f.contacts as any)?.email ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
              {forms.data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Sem submissões nas últimas 24h.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
