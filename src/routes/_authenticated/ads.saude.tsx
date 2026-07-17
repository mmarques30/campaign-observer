import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { healthColor, healthLabel, brl, num } from "@/lib/ads-utils";
import { AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight, Activity, ArrowRight, Info } from "lucide-react";

function acaoBadge(acao: string | null | undefined) {
  const a = (acao ?? "").toLowerCase();
  if (a.includes("create") || a.includes("activate") || a.includes("criar") || a.includes("ativar")) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (a.includes("pause") || a.includes("pausar")) return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
  if (a.includes("archive") || a.includes("arquivar") || a.includes("delete")) return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
  if (a.includes("budget") || a.includes("orcamento") || a.includes("update")) return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
}

export const Route = createFileRoute("/_authenticated/ads/saude")({
  component: Saude,
});

function Saude() {
  const SETE_DIAS = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

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

  // Falhas das rotinas/ações, já com o flag is_transient (classificação em SQL na view).
  const erros = useQuery({
    queryKey: ["mads", "erros7d"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mads_v_execution_falhas")
        .select("id, acao, entidade_tipo, origem, duracao_ms, created_at, erro_mensagem, is_transient")
        .gte("created_at", SETE_DIAS)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Auditoria de mutações de gestão (criar/pausar/editar/arquivar) — só ações com entidade.
  const acoes = useQuery({
    queryKey: ["mads", "auditoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mads_execution_log")
        .select("id, acao, entidade_tipo, sucesso, duracao_ms, created_at, origem, iniciado_por, erro_mensagem")
        .not("entidade_tipo", "is", null)
        .gte("created_at", SETE_DIAS)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Resumo das rotinas automáticas (detalhe completo fica em /ads/rotinas).
  const rotinas = useQuery({
    queryKey: ["mads", "rotinas-resumo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mads_execution_log")
        .select("acao, sucesso, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
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

  const [expandido, setExpandido] = useState<string | null>(null);
  const [mostrarTransientes, setMostrarTransientes] = useState(false);

  // Por padrão esconde erros transientes (instabilidade Meta que o retry já corrigiu).
  const todasFalhas = (erros.data ?? []) as any[];
  const transientesCount = todasFalhas.filter((l) => l.is_transient).length;
  const falhasVisiveis = mostrarTransientes ? todasFalhas : todasFalhas.filter((l) => !l.is_transient);

  const problemas = (conv.data ?? []).filter((c) => c.precisa_atencao === true);
  const activeCampaigns = new Set((conv.data ?? []).filter((c) => c.status === "ativa").map((c) => c.utm_campaign).filter(Boolean));

  const ultimaRotina = rotinas.data?.[0];
  const falhasRotina = (rotinas.data ?? []).filter((l: any) => l.sucesso === false).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saúde & diagnóstico</h1>
        <p className="text-sm text-muted-foreground">O que precisa de atenção agora — campanhas, falhas e ações.</p>
      </div>

      {/* 1. O que está com problema (campanhas) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {problemas.length > 0 ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            Campanhas que precisam de atenção
          </CardTitle>
          <CardDescription>{problemas.length} campanha(s) precisam de atenção</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {problemas.length === 0 && <div className="flex items-center gap-2 text-emerald-600 text-sm"><CheckCircle2 className="h-4 w-4" /> Tudo certo! Nenhuma campanha com problema.</div>}
          {problemas.map((p) => {
            const critical = p.status_conexao === "crm_nao_recebe" || p.status_conexao === "meta_nao_atribui";
            return (
              <div key={p.campanha_uuid} className={`p-4 rounded-md border ${critical ? "border-red-500/40 bg-red-500/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
                <div className="flex items-start gap-3">
                  {critical ? <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to="/ads/campanhas/$id" params={{ id: p.campanha_uuid ?? "" }} className="font-medium hover:underline">{p.campanha_nome}</Link>
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

      {/* 2. Falhas técnicas (rotinas/ações com erro) */}
      <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                {falhasVisiveis.length > 0 ? <XCircle className="h-5 w-5 text-red-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                Falhas recentes
              </CardTitle>
              <CardDescription>
                Execuções que precisam de ação nos últimos 7 dias (sync, health check, mutações).
                {!mostrarTransientes && transientesCount > 0 && <span className="ml-1">{transientesCount} transiente(s) oculto(s) (retry já corrigiu).</span>}
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none shrink-0">
              <Switch checked={mostrarTransientes} onCheckedChange={setMostrarTransientes} />
              Mostrar erros transientes
            </label>
          </div>
        </CardHeader>
        <CardContent className={falhasVisiveis.length === 0 ? "" : "p-0"}>
          {erros.isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!erros.isLoading && falhasVisiveis.length === 0 && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm"><CheckCircle2 className="h-4 w-4" /> Nenhuma falha que precise de ação nos últimos 7 dias.{transientesCount > 0 && !mostrarTransientes && <span className="text-muted-foreground">({transientesCount} transiente(s) — ligue o toggle pra ver.)</span>}</div>
          )}
          {falhasVisiveis.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Tipo</TableHead><TableHead>Ação</TableHead><TableHead>Origem</TableHead><TableHead>Erro</TableHead></TableRow></TableHeader>
              <TableBody>
                {falhasVisiveis.map((l: any) => (
                  <TableRow key={l.id} className={l.is_transient ? "bg-zinc-500/5" : "bg-red-500/5"}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={l.is_transient ? "gap-1 bg-zinc-500/15 text-zinc-500 border-zinc-500/30" : "gap-1 bg-red-500/15 text-red-700 border-red-500/30"}>
                            {l.is_transient ? "transiente" : "permanente"} <Info className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">is_transient: {String(!!l.is_transient)}. {l.is_transient ? "Instabilidade momentânea do Meta (5xx / \"please retry\" / código transiente) — o retry automático normalmente já resolveu. Não precisa de ação." : "Erro permanente (ex.: parâmetro inválido, code 100) — precisa de ação humana."}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={acaoBadge(l.acao)}>{l.acao ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.origem ?? "—"}</TableCell>
                    <TableCell className={`text-xs max-w-xl whitespace-pre-wrap ${l.is_transient ? "text-muted-foreground" : "text-red-700"}`}>{l.erro_mensagem ?? "Sem detalhes."}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </TooltipProvider>

      {/* 3. Health check (resumo de conexão) */}
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

      {/* 4. Auditoria de ações de gestão */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas ações de gestão</CardTitle>
          <CardDescription>Criar, pausar, editar e arquivar (últimos 7 dias) — quem fez o quê</CardDescription>
        </CardHeader>
        <CardContent className={(acoes.data?.length ?? 0) === 0 ? "" : "p-0"}>
          {acoes.isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!acoes.isLoading && (acoes.data?.length ?? 0) === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma ação de gestão registrada nos últimos 7 dias.</div>
          )}
          {(acoes.data?.length ?? 0) > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead><TableHead>Ação</TableHead><TableHead>Entidade</TableHead>
                  <TableHead>Resultado</TableHead><TableHead className="text-right">Duração</TableHead>
                  <TableHead>Quem</TableHead><TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(acoes.data ?? []).map((l: any) => {
                  const ok = l.sucesso === true;
                  const aberto = expandido === l.id;
                  return (
                    <Fragment key={l.id}>
                      <TableRow className={!ok ? "bg-red-500/5" : ""}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={acaoBadge(l.acao)}>{l.acao ?? "—"}</Badge></TableCell>
                        <TableCell className="text-xs">{l.entidade_tipo ?? "—"}</TableCell>
                        <TableCell>
                          {ok ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> sucesso</span>
                          ) : (
                            <button type="button" onClick={() => setExpandido(aberto ? null : l.id)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                              {aberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <XCircle className="h-3.5 w-3.5" /> erro
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{l.duracao_ms != null ? `${l.duracao_ms} ms` : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono max-w-[160px] truncate" title={l.iniciado_por ?? ""}>{l.iniciado_por ?? "—"}</TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{l.origem ?? "—"}</span></TableCell>
                      </TableRow>
                      {!ok && aberto && (
                        <TableRow className="bg-red-500/5">
                          <TableCell colSpan={7} className="text-xs text-red-700 whitespace-pre-wrap py-2">{l.erro_mensagem ?? "Sem detalhes de erro."}</TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 5. Rotinas automáticas — resumo + link para página dedicada */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Activity className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">Rotinas automáticas</div>
              <div className="text-xs text-muted-foreground">
                Sync, health check e clarity rodando em background.
                {ultimaRotina && <> Última: {new Date(ultimaRotina.created_at as string).toLocaleString("pt-BR")} ({ultimaRotina.acao}).</>}
                {falhasRotina > 0 ? <span className="text-red-600"> {falhasRotina} falha(s) recente(s).</span> : <span className="text-emerald-600"> Sem falhas recentes.</span>}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/ads/rotinas">Ver rotinas automáticas <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        </CardContent>
      </Card>

      {/* 6. Form submissions */}
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
