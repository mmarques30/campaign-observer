import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Building2, Plus, Search, Pencil, Users, Ban, CheckCircle2, Eye, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader, Kpi, StatusPill, EmptyState } from "@/components/ads/kit";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { GRUPOS, RECURSOS_EMPRESA, RECURSOS_EMPRESA_PADRAO, RECURSOS_SO_INTERNA, motivoSoInterna, usePermissoes } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ads/admin/empresas")({
  component: AdminEmpresas,
});

type Empresa = {
  id: string; nome: string; slug: string | null; interna: boolean; ativo: boolean; recursos: string[];
  logo_url: string | null; observacoes: string | null; created_at: string; membros: number;
};
type Usuario = { user_id: string; email: string; nome: string | null; vinculos: { empresa_id: string; papel: string }[] };

const FN = "mads-admin-users";

function AdminEmpresas() {
  const qc = useQueryClient();
  const perm = usePermissoes();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [aberta, setAberta] = useState<Empresa | "nova" | null>(null);

  const q = useQuery({
    queryKey: ["mads", "admin", "usuarios"],
    queryFn: async () => {
      const r = await callEdgeFunction<{ usuarios?: Usuario[]; empresas?: Empresa[]; error?: string }>(FN, { acao: "list" });
      if (r?.error) throw new Error(r.error);
      return r;
    },
  });
  const empresas = (q.data?.empresas ?? []) as Empresa[];
  const usuarios = (q.data?.usuarios ?? []) as Usuario[];

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return empresas.filter((e) =>
      (!t || e.nome.toLowerCase().includes(t) || (e.slug ?? "").includes(t)) &&
      (status === "todos" || (status === "ativa" ? e.ativo : !e.ativo)),
    );
  }, [empresas, busca, status]);

  const clientes = empresas.filter((e) => !e.interna);
  const pessoasClientes = new Set(
    usuarios.filter((u) => u.vinculos.some((v) => clientes.some((c) => c.id === v.empresa_id))).map((u) => u.user_id),
  ).size;
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["mads", "admin"] });
    perm.recarregar(); // o seletor de empresas do menu reflete na hora
  };
  const temFiltro = busca || status !== "todos";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Empresas"
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/ads/admin"><Users className="h-4 w-4" />Usuários</Link></Button>
            <Button onClick={() => setAberta("nova")}><Plus className="h-4 w-4" />Nova empresa</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa" className="pl-8 w-[260px] h-9 bg-card/60" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] h-9 bg-card/60"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todas</SelectItem><SelectItem value="ativa">Ativas</SelectItem><SelectItem value="inativa">Inativas</SelectItem></SelectContent>
        </Select>
        {temFiltro && <Button variant="ghost" size="sm" onClick={() => { setBusca(""); setStatus("todos"); }}>Limpar</Button>}
        <Button variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground" onClick={() => q.refetch()} aria-label="Recarregar">
          <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 stagger">
        <Kpi icon={Building2} tone="success" label="Empresas clientes ativas" value={String(clientes.filter((e) => e.ativo).length)} hint={`${clientes.length} cadastradas`} loading={q.isLoading} />
        <Kpi icon={Users} tone="info" label="Pessoas em empresas clientes" value={String(pessoasClientes)} loading={q.isLoading} />
        <Kpi icon={Ban} tone={clientes.some((e) => !e.ativo) ? "warning" : "neutral"} label="Empresas inativas" value={String(clientes.filter((e) => !e.ativo).length)} hint="acesso bloqueado" loading={q.isLoading} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Módulos liberados</TableHead>
                <TableHead className="text-right">Pessoas</TableHead>
                <TableHead>Cadastrada</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && [0, 1, 2].map((i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-9 w-full" /></TableCell></TableRow>)}
              {q.isError && (
                <TableRow><TableCell colSpan={6}>
                  <EmptyState icon={Ban} title="Não foi possível carregar as empresas" description={(q.error as Error).message}
                    action={<Button variant="outline" size="sm" onClick={() => q.refetch()}>Tentar de novo</Button>} />
                </TableCell></TableRow>
              )}
              {!q.isLoading && !q.isError && filtradas.length === 0 && (
                <TableRow><TableCell colSpan={6}>
                  <EmptyState icon={Building2} title={temFiltro ? "Nenhuma empresa com esses filtros" : "Nenhuma empresa cliente ainda"}
                    action={!temFiltro && <Button onClick={() => setAberta("nova")}><Plus className="h-4 w-4" />Nova empresa</Button>} />
                </TableCell></TableRow>
              )}
              {filtradas.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setAberta(e)}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="h-8 w-8 shrink-0 rounded-lg bg-primary/12 text-primary text-[11px] font-bold flex items-center justify-center">{e.nome.slice(0, 2).toUpperCase()}</span>
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2">{e.nome}{e.interna && <Badge variant="brand"><ShieldCheck className="h-3 w-3" />IAplicada</Badge>}</div>
                        {e.slug && <div className="text-xs text-muted-foreground">{e.slug}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><StatusPill tone={e.ativo ? "success" : "danger"}>{e.ativo ? "ativa" : "inativa"}</StatusPill></TableCell>
                  <TableCell>
                    {e.interna ? <span className="text-sm text-muted-foreground">Todos os módulos</span> : (
                      <div className="flex flex-wrap gap-1 max-w-[420px]">
                        {e.recursos.length === 0 && <span className="text-sm text-muted-foreground">Nenhum</span>}
                        {GRUPOS.filter((g) => RECURSOS_EMPRESA.some((r) => r.grupo === g.id && e.recursos.includes(r.key))).map((g) => {
                          const n = RECURSOS_EMPRESA.filter((r) => r.grupo === g.id && e.recursos.includes(r.key)).length;
                          const t = RECURSOS_EMPRESA.filter((r) => r.grupo === g.id).length;
                          return <Badge key={g.id} variant="neutral">{g.label} · {n}/{t}</Badge>;
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{e.membros}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(e.created_at), { locale: ptBR, addSuffix: true })}</TableCell>
                  <TableCell><Button variant="ghost" size="icon-sm" aria-label="Editar"><Pencil className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmpresaSheet
        empresa={aberta}
        usuarios={usuarios}
        onOpenChange={(o) => !o && setAberta(null)}
        onSalva={() => { invalidar(); setAberta(null); }}
      />
    </div>
  );
}

function EmpresaSheet({ empresa, usuarios, onOpenChange, onSalva }: {
  empresa: Empresa | "nova" | null; usuarios: Usuario[]; onOpenChange: (o: boolean) => void; onSalva: () => void;
}) {
  const nova = empresa === "nova";
  const e = nova ? null : empresa;
  const [chave, setChave] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [recursos, setRecursos] = useState<string[]>(RECURSOS_EMPRESA_PADRAO);
  const [observacoes, setObservacoes] = useState("");

  // Sincroniza o formulário ao abrir outra empresa.
  const k = empresa ? (nova ? "nova" : e!.id) : null;
  if (k !== chave) {
    setChave(k);
    setNome(e?.nome ?? "");
    setAtivo(e?.ativo ?? true);
    setRecursos(e ? e.recursos : RECURSOS_EMPRESA_PADRAO);
    setObservacoes(e?.observacoes ?? "");
  }

  const salvar = useMutation({
    mutationFn: async () => {
      const r = await callEdgeFunction<{ ok?: boolean; error?: string }>(FN, {
        acao: "empresa_save", id: e?.id, nome, ativo, recursos, observacoes,
      });
      if (r?.error) throw new Error(r.error);
    },
    onSuccess: () => { toast.success(nova ? `Empresa ${nome} cadastrada` : "Empresa salva"); onSalva(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggle = (key: string, v: boolean) => setRecursos((rs) => (v ? [...new Set([...rs, key])] : rs.filter((x) => x !== key)));
  const toggleGrupo = (grupo: string, v: boolean) => {
    const keys = RECURSOS_EMPRESA.filter((r) => r.grupo === grupo).map((r) => r.key);
    setRecursos((rs) => (v ? [...new Set([...rs, ...keys])] : rs.filter((x) => !keys.includes(x))));
  };
  const pessoas = e ? usuarios.filter((u) => u.vinculos.some((v) => v.empresa_id === e.id)) : [];

  return (
    <Sheet open={!!empresa} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{nova ? "Nova empresa" : e?.nome}</SheetTitle>
          <SheetDescription>
            {e?.interna ? "A IAplicada vê todos os módulos e todos os dados internos." : "Libere os módulos que esta empresa pode usar. Os dados de cada empresa ficam separados."}
          </SheetDescription>
        </SheetHeader>

        <form className="mt-6 space-y-6" onSubmit={(ev) => { ev.preventDefault(); salvar.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="emp-nome">Nome</Label>
            <Input id="emp-nome" value={nome} onChange={(ev) => setNome(ev.target.value)} required autoComplete="off" />
          </div>

          {!e?.interna && (
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
              <div><div className="text-sm font-medium">Empresa ativa</div><div className="text-xs text-muted-foreground">Desativar bloqueia o acesso das pessoas desta empresa</div></div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
          )}

          {!e?.interna && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Módulos liberados</div>
              {GRUPOS.filter((g) => RECURSOS_EMPRESA.some((r) => r.grupo === g.id)).map((g) => {
                const itens = RECURSOS_EMPRESA.filter((r) => r.grupo === g.id);
                const marcados = itens.filter((r) => recursos.includes(r.key)).length;
                return (
                  <div key={g.id} className="rounded-xl border border-border/70 overflow-hidden">
                    <label className="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/40 cursor-pointer">
                      <span className="text-sm font-semibold">{g.label}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {marcados}/{itens.length}
                        <Switch checked={marcados === itens.length} onCheckedChange={(v) => toggleGrupo(g.id, v)} aria-label={`Liberar todo o grupo ${g.label}`} />
                      </span>
                    </label>
                    <div className="divide-y divide-border/60">
                      {itens.map((r) => (
                        <label key={r.key} className="flex items-center justify-between gap-3 px-4 py-2 cursor-pointer">
                          <span className="text-sm flex items-center gap-2">
                            {r.label}
                            {r.compartilhado && <Badge variant="info" className="gap-1"><Eye className="h-3 w-3" />biblioteca IAplicada · só consulta</Badge>}
                          </span>
                          <Checkbox checked={recursos.includes(r.key)} onCheckedChange={(v) => toggle(r.key, v === true)} />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {RECURSOS_SO_INTERNA.length > 0 && (
                <details className="rounded-xl border border-dashed border-border/70 px-4 py-2.5 group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground flex items-center justify-between">
                    Ainda só na IAplicada
                    <span className="text-xs">{RECURSOS_SO_INTERNA.length}</span>
                  </summary>
                  <ul className="mt-2 divide-y divide-border/50">
                    {RECURSOS_SO_INTERNA.map((r) => (
                      <li key={r.key} className="py-2 flex items-start justify-between gap-3 opacity-70">
                        <span className="text-sm">
                          {r.label}
                          <span className="block text-xs text-muted-foreground">{motivoSoInterna(r)}</span>
                        </span>
                        <Checkbox disabled checked={false} aria-label={`${r.label} indisponível para empresas`} />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="emp-obs">Observações</Label>
            <Textarea id="emp-obs" value={observacoes} onChange={(ev) => setObservacoes(ev.target.value)} rows={3} placeholder="Contrato, contato, combinados…" />
          </div>

          {!nova && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Pessoas ({pessoas.length})</div>
                <Button variant="link" size="sm" asChild className="h-auto p-0"><Link to="/ads/admin">Gerenciar em Usuários</Link></Button>
              </div>
              {pessoas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-5 text-center text-sm text-muted-foreground">
                  Ninguém vinculado. Em Usuários, crie a pessoa e escolha esta empresa.
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 divide-y divide-border/60">
                  {pessoas.map((u) => {
                    const papel = u.vinculos.find((v) => v.empresa_id === e!.id)?.papel;
                    return (
                      <div key={u.user_id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                        <div className="min-w-0"><div className="font-medium truncate">{u.nome ?? u.email}</div><div className="text-xs text-muted-foreground truncate">{u.email}</div></div>
                        <Badge variant={papel === "admin" ? "brand" : "neutral"}>{papel === "admin" ? "Admin da empresa" : "Membro"}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-background/90 backdrop-blur border-t border-border/60 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={salvar.isPending || !nome.trim()}>
              {salvar.isPending ? "Salvando…" : nova ? <><CheckCircle2 className="h-4 w-4" />Cadastrar empresa</> : "Salvar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
