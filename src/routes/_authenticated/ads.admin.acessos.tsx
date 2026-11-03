import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users, Activity, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PeriodSelect, Kpi, EmptyState } from "@/components/ads/kit";
import { supabase } from "@/integrations/supabase/client";
import { rangeFromPeriodo, periodoLabel, type Periodo } from "@/lib/periodo";
import { RECURSOS } from "@/lib/permissoes";

export const Route = createFileRoute("/_authenticated/ads/admin/acessos")({
  component: AdminAcessos,
});

const ACAO_LABEL: Record<string, string> = { login: "Login", logout: "Saída", page_view: "Abriu tela", acao: "Ação", admin: "Administração" };
const ACAO_TONE: Record<string, any> = { login: "success", acao: "brand", admin: "warning", page_view: "neutral", logout: "neutral" };
const rotulo = (key: string | null) => (key ? RECURSOS.find((r) => r.key === key)?.label ?? (key === "admin" ? "Administração" : key) : "—");

function AdminAcessos() {
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [usuario, setUsuario] = useState("todos");
  const [acao, setAcao] = useState("todas");
  const [recurso, setRecurso] = useState("todos");
  const { since, until } = rangeFromPeriodo(periodo);

  const q = useQuery({
    queryKey: ["mads", "admin", "acessos_geral", since, until],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mads_acessos")
        .select("id, user_id, email, acao, recurso, detalhes, created_at")
        .gte("created_at", since + "T00:00:00")
        .lte("created_at", until + "T23:59:59.999")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const rows = q.data ?? [];

  const usuarios = useMemo(() => [...new Set(rows.map((r) => r.email).filter(Boolean))].sort() as string[], [rows]);
  const filtrados = useMemo(() => rows.filter((r) =>
    (usuario === "todos" || r.email === usuario) &&
    (acao === "todas" || r.acao === acao) &&
    (recurso === "todos" || r.recurso === recurso),
  ), [rows, usuario, acao, recurso]);

  const kpis = useMemo(() => ({
    logins: filtrados.filter((r) => r.acao === "login").length,
    pessoas: new Set(filtrados.map((r) => r.user_id)).size,
    acoes: filtrados.filter((r) => r.acao === "acao" || r.acao === "admin").length,
  }), [filtrados]);

  const temFiltro = usuario !== "todos" || acao !== "todas" || recurso !== "todos";

  const exportarCsv = () => {
    const linhas = [["data", "email", "acao", "tela", "detalhes"], ...filtrados.map((r) => [new Date(r.created_at).toISOString(), r.email ?? "", r.acao, r.recurso ?? "", JSON.stringify(r.detalhes ?? {})])];
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `acessos-${since}-${until}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Log de acessos"
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/ads/admin"><Users className="h-4 w-4" />Usuários</Link></Button>
            <Button variant="outline" size="sm" onClick={exportarCsv} disabled={filtrados.length === 0}><Download className="h-4 w-4" />CSV</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <PeriodSelect value={periodo} onChange={(v) => setPeriodo(v as Periodo)} />
        <Select value={usuario} onValueChange={setUsuario}>
          <SelectTrigger className="w-[220px] h-9 bg-card/60"><SelectValue placeholder="Usuário" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os usuários</SelectItem>{usuarios.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={acao} onValueChange={setAcao}>
          <SelectTrigger className="w-[170px] h-9 bg-card/60"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent><SelectItem value="todas">Todas as ações</SelectItem>{Object.entries(ACAO_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={recurso} onValueChange={setRecurso}>
          <SelectTrigger className="w-[200px] h-9 bg-card/60"><SelectValue placeholder="Tela" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todas as telas</SelectItem><SelectItem value="admin">Administração</SelectItem>{RECURSOS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
        {temFiltro && <Button variant="ghost" size="sm" onClick={() => { setUsuario("todos"); setAcao("todas"); setRecurso("todos"); }}>Limpar</Button>}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 stagger">
        <Kpi icon={Activity} tone="success" label={`Logins · ${periodoLabel(periodo)}`} value={String(kpis.logins)} loading={q.isLoading} />
        <Kpi icon={Users} tone="info" label="Pessoas diferentes" value={String(kpis.pessoas)} loading={q.isLoading} />
        <Kpi icon={Activity} tone="brand" label="Ações de edição" value={String(kpis.acoes)} loading={q.isLoading} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tela</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && [0, 1, 2, 3].map((i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
              {!q.isLoading && filtrados.length === 0 && <TableRow><TableCell colSpan={5}><EmptyState icon={Activity} title="Nenhum acesso no período" description="Ajuste o período ou os filtros." /></TableCell></TableRow>}
              {filtrados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums text-sm whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</TableCell>
                  <TableCell className="text-sm">{r.email ?? "—"}</TableCell>
                  <TableCell><Badge variant={ACAO_TONE[r.acao] ?? "neutral"}>{ACAO_LABEL[r.acao] ?? r.acao}</Badge></TableCell>
                  <TableCell className="text-sm">{rotulo(r.recurso)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[360px] truncate" title={r.detalhes ? JSON.stringify(r.detalhes) : undefined}>
                    {r.detalhes?.fn ?? r.detalhes?.op ?? (r.detalhes?.alvo ? `→ ${r.detalhes.alvo}` : "")}{r.detalhes?.alvo && r.detalhes?.op ? ` → ${r.detalhes.alvo}` : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtrados.length >= 2000 && <div className="px-5 py-2 text-xs text-muted-foreground border-t border-border/60">Mostrando os 2.000 registros mais recentes do período.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
