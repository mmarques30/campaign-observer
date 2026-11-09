import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Plus, Search, ShieldCheck, UserCheck, UserX, KeyRound, Trash2, Eye, Pencil, Ban, Users, Activity, ScrollText, RefreshCw, Copy, Building2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, Kpi, StatusPill, EmptyState } from "@/components/ads/kit";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { supabase } from "@/integrations/supabase/client";
import { GRUPOS, RECURSOS, NIVEL_LABEL, usePermissoes, type Nivel, type Recurso } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ads/admin/")({
  component: AdminUsuarios,
});

type Vinculo = { empresa_id: string; papel: "admin" | "membro" };
type Usuario = {
  user_id: string; email: string; nome: string | null; is_admin: boolean; ativo: boolean;
  ultimo_acesso_em: string | null; liberado_em: string | null; acessos_7d: number; recursos_liberados: number;
  permissoes: Record<string, Nivel>;
  permissoes_por_empresa: Record<string, Record<string, Nivel>>;
  vinculos: Vinculo[];
};
type EmpresaAdm = { id: string; nome: string; interna: boolean; ativo: boolean; recursos: string[] };

/** Telas que podem ser liberadas para a pessoa dentro de uma empresa. */
function recursosDaEmpresa(e: EmpresaAdm | undefined): Recurso[] {
  if (!e) return [];
  if (e.interna) return RECURSOS;
  return RECURSOS.filter((r) => r.empresa && e.recursos.includes(r.key));
}
/** A pessoa tem alguma tela liberada em alguma empresa? */
function temAlgumAcesso(u: Usuario) {
  if (u.is_admin) return true;
  if (u.vinculos.some((v) => v.papel === "admin")) return true;
  return Object.values(u.permissoes_por_empresa ?? {}).some((m) => Object.values(m).some((n) => n !== "none"));
}

const FN = "mads-admin-users";
const ACAO_LABEL: Record<string, string> = { login: "Login", logout: "Saída", page_view: "Abriu tela", acao: "Ação", admin: "Administração" };

function gerarSenha(n = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (v) => chars[v % chars.length]).join("");
}
function todasAs(nivel: Nivel, recursos: Recurso[] = RECURSOS): Record<string, Nivel> {
  // Bibliotecas compartilhadas nunca passam de "ver" fora da IAplicada (o banco também limita).
  return Object.fromEntries(recursos.map((r) => [r.key, nivel]));
}
function rotuloRecurso(key: string) {
  return RECURSOS.find((r) => r.key === key)?.label ?? (key === "admin" ? "Administração" : key);
}

function AdminUsuarios() {
  const qc = useQueryClient();
  const eu = usePermissoes();
  const [busca, setBusca] = useState("");
  const [perfil, setPerfil] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [novoAberto, setNovoAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<Usuario | null>(null);
  const [empresaFiltro, setEmpresaFiltro] = useState("todas");

  const lista = useQuery({
    queryKey: ["mads", "admin", "usuarios"],
    queryFn: async () => {
      const r = await callEdgeFunction<{ ok?: boolean; usuarios?: Usuario[]; empresas?: EmpresaAdm[]; error?: string }>(FN, { acao: "list" });
      if (r?.error) throw new Error(r.error);
      return r;
    },
  });
  const usuarios = ((lista.data?.usuarios ?? []) as Usuario[]).map((u) => ({
    ...u, vinculos: u.vinculos ?? [], permissoes_por_empresa: u.permissoes_por_empresa ?? {},
  }));
  const empresas = (lista.data?.empresas ?? []) as EmpresaAdm[];
  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome ?? "—";
  // Mantém o detalhe aberto sincronizado com a lista recarregada.
  const selAtual = selecionado ? usuarios.find((u) => u.user_id === selecionado.user_id) ?? selecionado : null;

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return usuarios.filter((u) =>
      (!q || (u.nome ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (perfil === "todos" || (perfil === "admin" ? u.is_admin : !u.is_admin)) &&
      (status === "todos" || (status === "ativo" ? u.ativo : !u.ativo)) &&
      (empresaFiltro === "todas" || u.vinculos.some((v) => v.empresa_id === empresaFiltro)),
    );
  }, [usuarios, busca, perfil, status, empresaFiltro]);

  const kpis = useMemo(() => ({
    ativos: usuarios.filter((u) => u.ativo).length,
    admins: usuarios.filter((u) => u.is_admin).length,
    acessos7d: usuarios.reduce((a, u) => a + Number(u.acessos_7d ?? 0), 0),
    semAcesso: usuarios.filter((u) => !u.is_admin && (!u.ativo || !temAlgumAcesso(u))).length,
  }), [usuarios]);

  const invalidar = () => qc.invalidateQueries({ queryKey: ["mads", "admin"] });
  const temFiltro = busca || perfil !== "todos" || status !== "todos" || empresaFiltro !== "todas";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Usuários"
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/ads/admin/empresas"><Building2 className="h-4 w-4" />Empresas</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/ads/admin/acessos"><ScrollText className="h-4 w-4" />Log de acessos</Link></Button>
            <Button onClick={() => setNovoAberto(true)}><Plus className="h-4 w-4" />Novo usuário</Button>
          </>
        }
      />

      {/* FilterBar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail" className="pl-8 w-[260px] h-9 bg-card/60" />
        </div>
        <Select value={perfil} onValueChange={setPerfil}>
          <SelectTrigger className="w-[180px] h-9 bg-card/60"><SelectValue placeholder="Perfil" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os perfis</SelectItem><SelectItem value="admin">Administradores</SelectItem><SelectItem value="usuario">Usuários</SelectItem></SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] h-9 bg-card/60"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="ativo">Ativos</SelectItem><SelectItem value="inativo">Inativos</SelectItem></SelectContent>
        </Select>
        <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
          <SelectTrigger className="w-[200px] h-9 bg-card/60"><SelectValue placeholder="Empresa" /></SelectTrigger>
          <SelectContent><SelectItem value="todas">Todas as empresas</SelectItem>{empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
        </Select>
        {temFiltro && <Button variant="ghost" size="sm" onClick={() => { setBusca(""); setPerfil("todos"); setStatus("todos"); setEmpresaFiltro("todas"); }}>Limpar</Button>}
        <Button variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground" onClick={() => lista.refetch()} aria-label="Recarregar"><RefreshCw className={cn("h-4 w-4", lista.isFetching && "animate-spin")} /></Button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 stagger">
        <Kpi icon={UserCheck} tone="success" label="Usuários ativos" value={String(kpis.ativos)} hint={`${usuarios.length} no total`} loading={lista.isLoading} />
        <Kpi icon={ShieldCheck} tone="brand" label="Administradores" value={String(kpis.admins)} loading={lista.isLoading} />
        <Kpi icon={Activity} tone="info" label="Acessos nos últimos 7 dias" value={String(kpis.acessos7d)} loading={lista.isLoading} />
        <Kpi icon={UserX} tone={kpis.semAcesso > 0 ? "warning" : "neutral"} label="Sem acesso liberado" value={String(kpis.semAcesso)} hint="inativos ou sem nenhuma tela em nenhuma empresa" loading={lista.isLoading} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Empresas</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="text-right">Acessos 7d</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.isLoading && [0, 1, 2].map((i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-9 w-full" /></TableCell></TableRow>
              ))}
              {lista.isError && (
                <TableRow><TableCell colSpan={7}><EmptyState icon={Ban} title="Não foi possível carregar os usuários" description={(lista.error as Error).message} action={<Button variant="outline" size="sm" onClick={() => lista.refetch()}>Tentar de novo</Button>} /></TableCell></TableRow>
              )}
              {!lista.isLoading && !lista.isError && filtrados.length === 0 && (
                <TableRow><TableCell colSpan={7}><EmptyState icon={Users} title={temFiltro ? "Nenhum usuário com esses filtros" : "Nenhum usuário cadastrado"} action={!temFiltro && <Button onClick={() => setNovoAberto(true)}><Plus className="h-4 w-4" />Novo usuário</Button>} /></TableCell></TableRow>
              )}
              {filtrados.map((u) => (
                <TableRow key={u.user_id} className="cursor-pointer" onClick={() => setSelecionado(u)}>
                  <TableCell>
                    <div className="font-medium">{u.nome ?? u.email.split("@")[0]}{u.user_id === eu.userId && <span className="ml-2 text-[10px] text-muted-foreground">(você)</span>}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>{u.is_admin ? <Badge variant="brand"><ShieldCheck className="h-3 w-3" />Admin</Badge> : <Badge variant="neutral">Usuário</Badge>}</TableCell>
                  <TableCell><StatusPill tone={u.ativo ? "success" : "danger"}>{u.ativo ? "ativo" : "inativo"}</StatusPill></TableCell>
                  <TableCell>
                    {u.is_admin ? <span className="text-sm text-muted-foreground">todas</span> : (
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {u.vinculos.length === 0 && <span className="text-sm text-muted-foreground">nenhuma</span>}
                        {u.vinculos.map((v) => (
                          <Badge key={v.empresa_id} variant={v.papel === "admin" ? "brand" : "neutral"}>{nomeEmpresa(v.empresa_id)}{v.papel === "admin" && " · admin"}</Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.ultimo_acesso_em ? `há ${formatDistanceToNow(new Date(u.ultimo_acesso_em), { locale: ptBR })}` : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.acessos_7d}</TableCell>
                  <TableCell><Button variant="ghost" size="icon-sm" aria-label="Editar"><Pencil className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NovoUsuarioSheet open={novoAberto} onOpenChange={setNovoAberto} onCriado={invalidar} empresas={empresas} empresaPadrao={eu.empresa?.id} />
      <UsuarioSheet usuario={selAtual} onOpenChange={(o) => !o && setSelecionado(null)} onMudou={invalidar} euId={eu.userId} empresas={empresas} />
    </div>
  );
}

/* ── Matriz de permissões ─────────────────────────────────────────────────── */
function MatrizPermissoes({ valor, onChange, desabilitada, recursos = RECURSOS, interna = true }: {
  valor: Record<string, Nivel>; onChange: (v: Record<string, Nivel>) => void; desabilitada?: boolean;
  /** Telas disponíveis na empresa (a IAplicada tem todas). */
  recursos?: Recurso[];
  /** Empresa cliente: bibliotecas compartilhadas ficam no máximo em "ver". */
  interna?: boolean;
}) {
  const limitar = (r: Recurso, n: Nivel): Nivel => (!interna && r.compartilhado && n === "edit" ? "view" : n);
  const set = (key: string, nivel: Nivel) => {
    const r = recursos.find((x) => x.key === key);
    onChange({ ...valor, [key]: r ? limitar(r, nivel) : nivel });
  };
  const setGrupo = (grupo: string, nivel: Nivel) => {
    const next = { ...valor };
    for (const r of recursos) if (r.grupo === grupo) next[r.key] = limitar(r, nivel);
    onChange(next);
  };
  const todas = (nivel: Nivel) => onChange(Object.fromEntries(recursos.map((r) => [r.key, limitar(r, nivel)])));
  if (recursos.length === 0) {
    return <EmptyState icon={Building2} title="Nenhum módulo liberado para esta empresa" description="Libere módulos em Administração › Empresas." />;
  }
  const Seg = ({ v, on, size = "md" }: { v: Nivel | null; on: (n: Nivel) => void; size?: "sm" | "md" }) => (
    <div className={cn("inline-flex rounded-lg border border-border bg-muted/40 p-0.5", size === "sm" && "scale-90 origin-right")} role="radiogroup">
      {(["none", "view", "edit"] as Nivel[]).map((n) => (
        <button
          key={n} type="button" role="radio" aria-checked={v === n} disabled={desabilitada}
          onClick={() => on(n)}
          className={cn(
            "px-2.5 h-7 rounded-md text-[11px] font-medium transition-colors inline-flex items-center gap-1",
            v === n ? (n === "none" ? "bg-card text-foreground shadow-sm" : n === "view" ? "bg-info-soft text-info" : "bg-primary text-primary-foreground") : "text-muted-foreground hover:text-foreground",
            desabilitada && "opacity-50 cursor-not-allowed",
          )}
        >
          {n === "view" && <Eye className="h-3 w-3" />}{n === "edit" && <Pencil className="h-3 w-3" />}{NIVEL_LABEL[n]}
        </button>
      ))}
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Aplicar a tudo:</span>
        <Button type="button" variant="outline" size="sm" disabled={desabilitada} onClick={() => todas("none")}>Nenhum</Button>
        <Button type="button" variant="outline" size="sm" disabled={desabilitada} onClick={() => todas("view")}><Eye className="h-3.5 w-3.5" />Ver tudo</Button>
        <Button type="button" variant="outline" size="sm" disabled={desabilitada} onClick={() => todas("edit")}><Pencil className="h-3.5 w-3.5" />Editar tudo</Button>
      </div>
      {GRUPOS.filter((g) => recursos.some((r) => r.grupo === g.id)).map((g) => {
        const itens = recursos.filter((r) => r.grupo === g.id);
        const niveis = new Set(itens.map((r) => valor[r.key] ?? "none"));
        const grupoNivel = niveis.size === 1 ? ([...niveis][0] as Nivel) : null;
        return (
          <div key={g.id} className="rounded-xl border border-border/70 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/40">
              <div className="text-sm font-semibold">{g.label}</div>
              <Seg v={grupoNivel} on={(n) => setGrupo(g.id, n)} size="sm" />
            </div>
            <div className="divide-y divide-border/60">
              {itens.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="text-sm">{r.label}{!interna && r.compartilhado && <span className="ml-2 text-[11px] text-muted-foreground">biblioteca IAplicada · até "Ver"</span>}</div>
                  <Seg v={valor[r.key] ?? "none"} on={(n) => set(r.key, n)} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Novo usuário ─────────────────────────────────────────────────────────── */
function NovoUsuarioSheet({ open, onOpenChange, onCriado, empresas, empresaPadrao }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCriado: () => void; empresas: EmpresaAdm[]; empresaPadrao?: string;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState(() => gerarSenha());
  const [isAdmin, setIsAdmin] = useState(false);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [papel, setPapel] = useState<"membro" | "admin">("membro");
  const empresaSel = empresas.find((e) => e.id === empresaId) ?? empresas.find((e) => e.id === empresaPadrao) ?? empresas[0];
  const recursosEmp = recursosDaEmpresa(empresaSel);
  const [perms, setPerms] = useState<Record<string, Nivel>>({});
  // Matriz começa em "Ver" em tudo que a empresa tem.
  const valorPerms = { ...todasAs("view", recursosEmp), ...perms };

  const criar = useMutation({
    mutationFn: async () => {
      if (!empresaSel) throw new Error("Escolha a empresa");
      const somenteDaEmpresa = Object.fromEntries(recursosEmp.map((r) => [r.key, valorPerms[r.key] ?? "none"]));
      const r = await callEdgeFunction<{ ok?: boolean; error?: string }>(FN, {
        acao: "create", nome, email, senha,
        is_admin: empresaSel.interna ? isAdmin : false,
        empresas: [{ empresa_id: empresaSel.id, papel }],
        permissoes: isAdmin || papel === "admin" ? {} : { [empresaSel.id]: somenteDaEmpresa },
      });
      if (r?.error) throw new Error(r.error);
    },
    onSuccess: () => {
      toast.success(`Usuário ${email} criado em ${empresaSel?.nome}. Envie a senha por um canal seguro.`);
      onCriado(); onOpenChange(false);
      setNome(""); setEmail(""); setSenha(gerarSenha()); setIsAdmin(false); setPerms({}); setPapel("membro"); setEmpresaId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo usuário</SheetTitle>
          <SheetDescription>A pessoa entra com o e-mail e a senha definidos aqui.</SheetDescription>
        </SheetHeader>
        <form className="mt-6 space-y-5" onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}>
          <div className="space-y-1.5"><Label htmlFor="nu-nome">Nome</Label><Input id="nu-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="off" /></div>
          <div className="space-y-1.5"><Label htmlFor="nu-email">E-mail</Label><Input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-senha">Senha</Label>
            <div className="flex gap-2">
              <Input id="nu-senha" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} autoComplete="new-password" className="font-mono" />
              <Button type="button" variant="outline" size="icon" onClick={() => setSenha(gerarSenha())} aria-label="Gerar senha"><RefreshCw className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard?.writeText(senha); toast.success("Senha copiada"); }} aria-label="Copiar senha"><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Select value={empresaSel?.id ?? ""} onValueChange={(v) => { setEmpresaId(v); setPerms({}); setIsAdmin(false); }}>
                <SelectTrigger><SelectValue placeholder="Escolha a empresa" /></SelectTrigger>
                <SelectContent>{empresas.filter((e) => e.ativo).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Papel na empresa</Label>
              <Select value={papel} onValueChange={(v) => setPapel(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="membro">Membro (telas escolhidas)</SelectItem><SelectItem value="admin">Admin da empresa (todos os módulos)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          {empresaSel?.interna && (
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
              <div><div className="text-sm font-medium">Administrador IAplicada</div><div className="text-xs text-muted-foreground">Acesso total a todas as empresas, incluindo esta administração</div></div>
              <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
            </div>
          )}
          {!isAdmin && papel === "membro" && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Permissões em {empresaSel?.nome}</div>
              <MatrizPermissoes valor={valorPerms} onChange={setPerms} recursos={recursosEmp} interna={!!empresaSel?.interna} />
            </div>
          )}
          <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-background/90 backdrop-blur border-t border-border/60 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={criar.isPending}>{criar.isPending ? "Criando…" : "Criar usuário"}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* ── Detalhe do usuário ───────────────────────────────────────────────────── */
function UsuarioSheet({ usuario, onOpenChange, onMudou, euId, empresas }: {
  usuario: Usuario | null; onOpenChange: (o: boolean) => void; onMudou: () => void; euId: string | null; empresas: EmpresaAdm[];
}) {
  const u = usuario;
  const souEu = !!u && u.user_id === euId;
  const [nome, setNome] = useState("");
  const [perms, setPerms] = useState<Record<string, Nivel>>({});
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaRemover, setConfirmaRemover] = useState(false);
  const [chaveAberta, setChaveAberta] = useState<string | null>(null);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [empresaPerm, setEmpresaPerm] = useState<string>("");

  // Sincroniza o formulário quando muda o usuário aberto.
  if (u && chaveAberta !== u.user_id) {
    setChaveAberta(u.user_id);
    setNome(u.nome ?? "");
    setNovaSenha("");
    setVinculos(u.vinculos ?? []);
    const primeira = (u.vinculos ?? [])[0]?.empresa_id ?? "";
    setEmpresaPerm(primeira);
    const emp = empresas.find((e) => e.id === primeira);
    setPerms({ ...todasAs("none", recursosDaEmpresa(emp)), ...(u.permissoes_por_empresa?.[primeira] ?? {}) });
  }
  const empPerm = empresas.find((e) => e.id === empresaPerm);
  const papelPerm = u?.vinculos.find((v) => v.empresa_id === empresaPerm)?.papel;
  const trocarEmpresaPerm = (id: string) => {
    setEmpresaPerm(id);
    const emp = empresas.find((e) => e.id === id);
    setPerms({ ...todasAs("none", recursosDaEmpresa(emp)), ...(u?.permissoes_por_empresa?.[id] ?? {}) });
  };
  const vinculosMudaram = JSON.stringify([...vinculos].sort((a, b) => a.empresa_id.localeCompare(b.empresa_id))) !==
    JSON.stringify([...(u?.vinculos ?? [])].sort((a, b) => a.empresa_id.localeCompare(b.empresa_id)));

  const chamar = async (payload: Record<string, unknown>) => {
    const r = await callEdgeFunction<{ ok?: boolean; error?: string }>(FN, payload);
    if (r?.error) throw new Error(r.error);
  };
  const salvarDados = useMutation({
    mutationFn: () => chamar({ acao: "update", user_id: u!.user_id, nome }),
    onSuccess: () => { toast.success("Dados salvos"); onMudou(); }, onError: (e: Error) => toast.error(e.message),
  });
  const toggleAdmin = useMutation({
    mutationFn: (v: boolean) => chamar({ acao: "update", user_id: u!.user_id, is_admin: v }),
    onSuccess: () => { toast.success("Perfil atualizado"); onMudou(); }, onError: (e: Error) => toast.error(e.message),
  });
  const toggleAtivo = useMutation({
    mutationFn: (v: boolean) => chamar({ acao: "update", user_id: u!.user_id, ativo: v }),
    onSuccess: (_, v) => { toast.success(v ? "Acesso reativado" : "Acesso desativado"); onMudou(); }, onError: (e: Error) => toast.error(e.message),
  });
  const salvarPerms = useMutation({
    mutationFn: () => chamar({ acao: "set_permissoes", user_id: u!.user_id, empresa_id: empresaPerm, permissoes: perms }),
    onSuccess: () => { toast.success(`Permissões em ${empPerm?.nome ?? "empresa"} salvas`); onMudou(); }, onError: (e: Error) => toast.error(e.message),
  });
  const salvarEmpresas = useMutation({
    mutationFn: () => chamar({ acao: "set_empresas", user_id: u!.user_id, empresas: vinculos }),
    onSuccess: () => { toast.success("Empresas atualizadas"); onMudou(); }, onError: (e: Error) => toast.error(e.message),
  });
  const redefinirSenha = useMutation({
    mutationFn: () => chamar({ acao: "set_password", user_id: u!.user_id, senha: novaSenha }),
    onSuccess: () => { toast.success("Senha redefinida. Envie por um canal seguro."); }, onError: (e: Error) => toast.error(e.message),
  });
  const remover = useMutation({
    mutationFn: () => chamar({ acao: "delete", user_id: u!.user_id }),
    onSuccess: () => { toast.success("Usuário removido"); setConfirmaRemover(false); onMudou(); onOpenChange(false); }, onError: (e: Error) => toast.error(e.message),
  });

  const acessos = useQuery({
    queryKey: ["mads", "admin", "acessos", u?.user_id],
    enabled: !!u,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("mads_acessos").select("id, acao, recurso, detalhes, created_at").eq("user_id", u!.user_id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <Sheet open={!!u} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[640px] overflow-y-auto">
        {u && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">{u.nome ?? u.email}{u.is_admin && <Badge variant="brand"><ShieldCheck className="h-3 w-3" />Admin</Badge>}<StatusPill tone={u.ativo ? "success" : "danger"}>{u.ativo ? "ativo" : "inativo"}</StatusPill></SheetTitle>
              <SheetDescription>{u.email}{u.liberado_em && ` · liberado ${formatDistanceToNow(new Date(u.liberado_em), { locale: ptBR, addSuffix: true })}`}</SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="dados" className="mt-5">
              <TabsList className="w-full">
                <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
                <TabsTrigger value="permissoes" className="flex-1">Permissões</TabsTrigger>
                <TabsTrigger value="acessos" className="flex-1">Acessos</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-5 mt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="ed-nome">Nome</Label>
                  <div className="flex gap-2">
                    <Input id="ed-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                    <Button variant="outline" onClick={() => salvarDados.mutate()} disabled={salvarDados.isPending || nome === (u.nome ?? "")}>Salvar</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Empresas</div>
                  <div className="rounded-xl border border-border/70 divide-y divide-border/60">
                    {empresas.map((e) => {
                      const v = vinculos.find((x) => x.empresa_id === e.id);
                      return (
                        <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-2">
                          <label className="flex items-center gap-2.5 text-sm cursor-pointer min-w-0">
                            <Checkbox checked={!!v} onCheckedChange={(c) => setVinculos((vs) => (c === true ? [...vs, { empresa_id: e.id, papel: "membro" }] : vs.filter((x) => x.empresa_id !== e.id)))} />
                            <span className="truncate">{e.nome}</span>
                            {!e.ativo && <Badge variant="neutral">inativa</Badge>}
                          </label>
                          {v && (
                            <Select value={v.papel} onValueChange={(p) => setVinculos((vs) => vs.map((x) => (x.empresa_id === e.id ? { ...x, papel: p as any } : x)))}>
                              <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="membro">Membro</SelectItem><SelectItem value="admin">Admin da empresa</SelectItem></SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {vinculosMudaram && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setVinculos(u.vinculos ?? [])}>Desfazer</Button>
                      <Button size="sm" onClick={() => salvarEmpresas.mutate()} disabled={salvarEmpresas.isPending || vinculos.length === 0}>Salvar empresas</Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
                  <div><div className="text-sm font-medium">Administrador IAplicada</div><div className="text-xs text-muted-foreground">Acesso total a todas as empresas e a esta administração</div></div>
                  <Switch checked={u.is_admin} disabled={souEu || toggleAdmin.isPending} onCheckedChange={(v) => toggleAdmin.mutate(v)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
                  <div><div className="text-sm font-medium">Acesso ativo</div><div className="text-xs text-muted-foreground">Desativar impede o login sem apagar a conta</div></div>
                  <Switch checked={u.ativo} disabled={souEu || toggleAtivo.isPending} onCheckedChange={(v) => toggleAtivo.mutate(v)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ed-senha">Redefinir senha</Label>
                  <div className="flex gap-2">
                    <Input id="ed-senha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Nova senha (mín. 8)" autoComplete="new-password" className="font-mono" />
                    <Button type="button" variant="outline" size="icon" onClick={() => setNovaSenha(gerarSenha())} aria-label="Gerar"><RefreshCw className="h-4 w-4" /></Button>
                    <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard?.writeText(novaSenha); toast.success("Senha copiada"); }} aria-label="Copiar" disabled={!novaSenha}><Copy className="h-4 w-4" /></Button>
                    <Button variant="outline" onClick={() => redefinirSenha.mutate()} disabled={novaSenha.length < 8 || redefinirSenha.isPending}><KeyRound className="h-4 w-4" />Aplicar</Button>
                  </div>
                </div>
                {!souEu && (
                  <div className="pt-2 border-t border-border/60">
                    <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmaRemover(true)}><Trash2 className="h-4 w-4" />Remover usuário</Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="permissoes" className="mt-5 space-y-4">
                {u.is_admin ? (
                  <EmptyState icon={ShieldCheck} title="Administrador tem acesso total" description="Para restringir, desmarque Administrador na aba Dados." />
                ) : u.vinculos.length === 0 ? (
                  <EmptyState icon={Building2} title="Sem empresa" description="Vincule a pessoa a uma empresa na aba Dados." />
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Empresa</Label>
                      <Select value={empresaPerm} onValueChange={trocarEmpresaPerm}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{u.vinculos.map((v) => <SelectItem key={v.empresa_id} value={v.empresa_id}>{empresas.find((e) => e.id === v.empresa_id)?.nome ?? "—"}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {papelPerm === "admin" ? (
                      <EmptyState icon={ShieldCheck} title="Admin da empresa" description="Acessa e edita todos os módulos liberados para esta empresa. Mude o papel na aba Dados para escolher telas." />
                    ) : (
                    <>
                    <MatrizPermissoes valor={perms} onChange={setPerms} recursos={recursosDaEmpresa(empPerm)} interna={!!empPerm?.interna} />
                    <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-background/90 backdrop-blur border-t border-border/60 flex justify-end gap-2">
                      <Button variant="outline" onClick={() => trocarEmpresaPerm(empresaPerm)}>Desfazer</Button>
                      <Button onClick={() => salvarPerms.mutate()} disabled={salvarPerms.isPending}>{salvarPerms.isPending ? "Salvando…" : "Salvar permissões"}</Button>
                    </div>
                    </>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="acessos" className="mt-5">
                {acessos.isLoading && <Skeleton className="h-24 w-full" />}
                {!acessos.isLoading && (acessos.data ?? []).length === 0 && <EmptyState icon={Activity} title="Nenhum acesso registrado" />}
                {(acessos.data ?? []).length > 0 && (
                  <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden">
                    {(acessos.data ?? []).map((a: any) => (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <Badge variant={a.acao === "login" ? "success" : a.acao === "acao" ? "brand" : a.acao === "admin" ? "warning" : "neutral"} className="shrink-0">{ACAO_LABEL[a.acao] ?? a.acao}</Badge>
                        <span className="truncate flex-1">{rotuloRecurso(a.recurso)}{a.detalhes?.fn && <span className="text-muted-foreground"> · {a.detalhes.fn}</span>}{a.detalhes?.op && <span className="text-muted-foreground"> · {a.detalhes.op}</span>}</span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{new Date(a.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>

      <AlertDialog open={confirmaRemover} onOpenChange={setConfirmaRemover}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {u?.email}?</AlertDialogTitle>
            <AlertDialogDescription>A conta é apagada e a pessoa não consegue mais entrar. O histórico de acessos é mantido. Se preferir só bloquear, desative o acesso.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-white hover:bg-danger/90" onClick={() => remover.mutate()}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
