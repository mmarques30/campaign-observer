/**
 * Permissões do IAplicada Ads por empresa, menu/submenu (recurso) e log de acessos.
 *
 * Multiempresa:
 * - A pessoa entra numa EMPRESA ATIVA (IAplicada ou uma empresa cliente). Os dados
 *   de Edição de vídeos / criativos já chegam filtrados pela empresa ativa (RLS).
 * - Cada empresa cliente tem os módulos (recursos) liberados pela IAplicada; a
 *   permissão efetiva = permissão da pessoa NAQUELA empresa ∩ módulos liberados.
 * - Admin IAplicada (profiles.is_admin) e admin da empresa editam tudo que está
 *   liberado. A IAplicada (interna) tem todos os módulos.
 * - Recursos compartilhados (efeitos, trilhas) ficam no máximo em "ver" fora da
 *   IAplicada: são bibliotecas da IAplicada usadas pelas empresas.
 *
 * - `usePermissoes()` carrega o contexto do usuário logado (cacheado).
 * - `exigirEdicao()` é o bloqueio central usado por `callEdgeFunction`.
 * - `registrarAcesso()` grava login, telas abertas e ações em `mads_acessos`.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Nivel = "none" | "view" | "edit";

export type Recurso = {
  key: string;
  label: string;
  grupo: string;
  path: string;
  exact?: boolean;
  /** Pode ser liberado para empresas clientes (dados isolados por empresa). */
  empresa?: boolean;
  /** Biblioteca da IAplicada usada pelas empresas: fora da IAplicada, no máximo "ver". */
  compartilhado?: boolean;
};

export const GRUPOS: { id: string; label: string }[] = [
  { id: "geral", label: "Geral" },
  { id: "midia", label: "Mídia paga" },
  { id: "conversao", label: "Conversão" },
  { id: "analise", label: "Análise & Saúde" },
  { id: "edicao", label: "Edição de vídeos" },
  { id: "criativos", label: "Edição criativos" },
  { id: "conta", label: "Conta" },
];

export const RECURSOS: Recurso[] = [
  { key: "dashboard", label: "Dashboard", grupo: "geral", path: "/ads", exact: true },
  { key: "campanhas", label: "Campanhas", grupo: "midia", path: "/ads/campanhas" },
  { key: "anuncios", label: "Anúncios", grupo: "midia", path: "/ads/anuncios" },
  { key: "criativos", label: "Criativos", grupo: "midia", path: "/ads/criativos" },
  { key: "audiencias", label: "Audiências", grupo: "midia", path: "/ads/audiencias" },
  { key: "lps", label: "Landing Pages", grupo: "conversao", path: "/ads/lps" },
  { key: "capi", label: "Eventos CAPI", grupo: "conversao", path: "/ads/capi-events" },
  { key: "automacoes", label: "Automações do Instagram", grupo: "conversao", path: "/ads/automacoes" },
  { key: "insights", label: "Insights", grupo: "analise", path: "/ads/insights" },
  { key: "saude", label: "Saúde", grupo: "analise", path: "/ads/saude" },
  { key: "edicao", label: "Estúdio", grupo: "edicao", path: "/ads/edicao", exact: true, empresa: true },
  { key: "edicao.efeitos", label: "Efeitos", grupo: "edicao", path: "/ads/edicao/efeitos", empresa: true, compartilhado: true },
  { key: "edicao.trilhas", label: "Trilhas", grupo: "edicao", path: "/ads/edicao/trilhas", empresa: true, compartilhado: true },
  { key: "edicao.pesquisa", label: "Pesquisa", grupo: "edicao", path: "/ads/edicao/pesquisa" },
  { key: "edicao.referencias", label: "Referências", grupo: "edicao", path: "/ads/edicao/referencias", empresa: true },
  { key: "edicao.roteiros", label: "Roteiros", grupo: "edicao", path: "/ads/edicao/roteiros", empresa: true },
  { key: "edicao.publicados", label: "Publicados", grupo: "edicao", path: "/ads/edicao/publicados", empresa: true },
  { key: "edicao.marca", label: "Marca", grupo: "edicao", path: "/ads/edicao/marca", empresa: true },
  { key: "criar", label: "Criativos", grupo: "criativos", path: "/ads/criar", exact: true, empresa: true },
  { key: "criar.fotos", label: "Minhas fotos", grupo: "criativos", path: "/ads/criar/fotos", empresa: true },
  { key: "criar.referencias", label: "Referências", grupo: "criativos", path: "/ads/criar/referencias", empresa: true },
  { key: "criar.publicados", label: "Publicados", grupo: "criativos", path: "/ads/criar/publicados", empresa: true },
  { key: "gastos", label: "Gasto de API", grupo: "conta", path: "/ads/gastos", empresa: true },
];

/** Módulos que podem ser liberados para empresas clientes. */
export const RECURSOS_EMPRESA = RECURSOS.filter((r) => r.empresa);
/** Módulos já marcados ao cadastrar uma empresa nova. */
export const RECURSOS_EMPRESA_PADRAO = RECURSOS_EMPRESA.map((r) => r.key);

/** Rotas que pertencem a um recurso sem compartilhar o prefixo do menu. */
const ALIASES: Record<string, string> = {
  "/ads/adsets": "campanhas",
  "/ads/rotinas": "saude",
};

/** Recurso (tela) de um pathname. Projetos de edição (/ads/edicao/<id>) caem em "edicao". */
export function recursoDoPath(pathname: string): Recurso | undefined {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p.startsWith("/ads/admin")) return { key: "admin", label: "Administração", grupo: "admin", path: "/ads/admin" };
  for (const [prefix, key] of Object.entries(ALIASES)) {
    if (p === prefix || p.startsWith(prefix + "/")) return RECURSOS.find((r) => r.key === key);
  }
  const hits = RECURSOS.filter((r) => (r.exact ? p === r.path : p === r.path || p.startsWith(r.path + "/")));
  if (hits.length) return hits.sort((a, b) => b.path.length - a.path.length)[0];
  // Subrota de um grupo (ex. /ads/edicao/<uuid>) → recurso raiz do grupo.
  if (p.startsWith("/ads/edicao/")) return RECURSOS.find((r) => r.key === "edicao");
  if (p.startsWith("/ads/criar/")) return RECURSOS.find((r) => r.key === "criar");
  return undefined;
}

/* ── Empresas ────────────────────────────────────────────────────────────── */
export type Empresa = {
  id: string;
  nome: string;
  slug: string | null;
  interna: boolean;
  recursos: string[];
  logo_url: string | null;
  papel: "admin" | "membro" | null;
  ativa: boolean;
};

/* ── Contexto do usuário ─────────────────────────────────────────────────── */
export type Permissoes = {
  userId: string | null;
  email: string | null;
  nome: string | null;
  isAdmin: boolean;
  ativo: boolean;
  /** Empresa ativa (null = sem nenhuma empresa liberada). */
  empresa: Empresa | null;
  /** Empresas que a pessoa pode abrir. */
  empresas: Empresa[];
  /** Permissões da pessoa na empresa ativa. */
  niveis: Record<string, Nivel>;
};

const VAZIO: Permissoes = {
  userId: null, email: null, nome: null, isAdmin: false, ativo: false, empresa: null, empresas: [], niveis: {},
};

let cache: Permissoes | null = null;
let carregando: Promise<Permissoes> | null = null;

export async function carregarPermissoes(force = false): Promise<Permissoes> {
  if (cache && !force) return cache;
  if (carregando && !force) return carregando;
  carregando = (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { cache = VAZIO; return cache; }
    const [prof, mu, emps] = await Promise.all([
      supabase.from("profiles").select("is_admin, full_name").eq("id", user.id).maybeSingle(),
      (supabase as any).from("mads_usuarios").select("ativo").eq("user_id", user.id).maybeSingle(),
      (supabase as any).rpc("mads_minhas_empresas"),
    ]);
    const empresas = ((emps.data ?? []) as Empresa[]).map((e) => ({ ...e, recursos: e.recursos ?? [] }));
    const empresa = empresas.find((e) => e.ativa) ?? empresas[0] ?? null;
    const niveis: Record<string, Nivel> = {};
    if (empresa) {
      const { data: perms } = await (supabase as any)
        .from("mads_permissoes").select("recurso, nivel").eq("user_id", user.id).eq("empresa_id", empresa.id);
      for (const r of (perms ?? []) as any[]) niveis[r.recurso] = r.nivel;
    }
    cache = {
      userId: user.id,
      email: user.email ?? null,
      nome: (prof.data as any)?.full_name ?? null,
      isAdmin: !!(prof.data as any)?.is_admin,
      ativo: (mu.data as any)?.ativo ?? false,
      empresa,
      empresas,
      niveis,
    };
    return cache;
  })();
  try { return await carregando; } finally { carregando = null; }
}

export function limparPermissoesCache() { cache = null; }

/** O módulo está liberado para a empresa ativa? (IAplicada tem todos.) */
export function moduloLiberado(p: Permissoes, key: string): boolean {
  if (!p.empresa) return false;
  if (p.empresa.interna) return true;
  const r = RECURSOS.find((x) => x.key === key);
  return !!r?.empresa && p.empresa.recursos.includes(key);
}

export function nivelDe(p: Permissoes, key: string): Nivel {
  if (!p.empresa) return "none";
  if (!p.isAdmin && !p.ativo) return "none";
  if (!moduloLiberado(p, key)) return "none";
  let n: Nivel = p.isAdmin || p.empresa.papel === "admin" ? "edit" : (p.niveis[key] ?? "none");
  // Bibliotecas da IAplicada: empresas clientes só consultam.
  if (n === "edit" && !p.empresa.interna && RECURSOS.find((x) => x.key === key)?.compartilhado) n = "view";
  return n;
}
export const podeVer = (p: Permissoes, key: string) => nivelDe(p, key) !== "none";
export const podeEditar = (p: Permissoes, key: string) => nivelDe(p, key) === "edit";

/**
 * Primeira tela que a pessoa pode abrir, na ordem da sidebar. Usada para levar
 * direto ao lugar certo depois do login e ao trocar de empresa.
 */
export function primeiraTelaLiberada(p: Permissoes): string {
  const r = RECURSOS.find((x) => podeVer(p, x.key));
  return r?.path ?? "/ads";
}

/** Troca a empresa ativa (valida no banco) e recarrega as permissões. */
export async function trocarEmpresa(empresaId: string): Promise<Permissoes> {
  const { error } = await (supabase as any).rpc("mads_trocar_empresa", { _emp: empresaId });
  if (error) throw new Error(error.message?.includes("Sem acesso") ? "Você não tem acesso a esta empresa." : error.message);
  limparPermissoesCache();
  const p = await carregarPermissoes(true);
  void registrarAcesso("acao", "empresa", { op: "trocar_empresa", empresa: p.empresa?.nome });
  return p;
}

export function usePermissoes() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["mads", "permissoes"],
    queryFn: () => carregarPermissoes(true),
    staleTime: 60_000,
  });
  const p = q.data ?? cache ?? VAZIO;
  return {
    ...p,
    carregando: q.isLoading,
    nivel: (key: string) => nivelDe(p, key),
    podeVer: (key: string) => podeVer(p, key),
    podeEditar: (key: string) => podeEditar(p, key),
    moduloLiberado: (key: string) => moduloLiberado(p, key),
    recarregar: () => { limparPermissoesCache(); return qc.invalidateQueries({ queryKey: ["mads", "permissoes"] }); },
  };
}

/**
 * Bloqueio central de edição. Chamado por `callEdgeFunction` antes de qualquer
 * mutação: a tela atual (pathname) define o recurso; quem não tem "edit" nela
 * recebe erro antes de a requisição sair.
 */
export async function exigirEdicao(pathname: string = typeof window !== "undefined" ? window.location.pathname : "/") {
  const p = await carregarPermissoes();
  if (!p.userId) return;
  const r = recursoDoPath(pathname);
  if (!r) return; // tela fora do mapa: não bloqueia (ex.: fluxos internos)
  if (r.key === "admin") {
    if (p.isAdmin) return;
    throw new Error("Apenas administradores podem fazer isso.");
  }
  if (nivelDe(p, r.key) !== "edit") {
    throw new Error(`Você tem acesso somente de visualização em ${r.label}.`);
  }
}

/* ── Log de acessos ──────────────────────────────────────────────────────── */
let ultimoToque = 0;

export async function registrarAcesso(
  acao: "login" | "logout" | "page_view" | "acao",
  recurso?: string | null,
  detalhes?: Record<string, unknown>,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const emp = cache?.empresa?.nome;
    await (supabase as any).from("mads_acessos").insert({
      user_id: user.id,
      email: user.email ?? null,
      acao,
      recurso: recurso ?? null,
      detalhes: emp ? { ...(detalhes ?? {}), empresa: (detalhes as any)?.empresa ?? emp } : (detalhes ?? null),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
    // "último acesso" no máximo uma vez a cada 5 min.
    const agora = Date.now();
    if (acao === "login" || agora - ultimoToque > 5 * 60_000) {
      ultimoToque = agora;
      await (supabase as any)
        .from("mads_usuarios")
        .update({ ultimo_acesso_em: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  } catch { /* log nunca interrompe a navegação */ }
}

export const NIVEL_LABEL: Record<Nivel, string> = { none: "Sem acesso", view: "Ver", edit: "Editar" };
