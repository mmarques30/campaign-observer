import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Network,
  BrainCircuit,
  LayoutDashboard,
  Megaphone,
  Image,
  Activity,
  RefreshCw,
  LogOut,
  Globe,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Users,
  Webhook,
  Film,
  Sparkles,
  ChevronDown,
  Clapperboard,
  BookOpen,
  Music2,
  Wand2,
  Palette,
  Search,
  Bell,
  Sun,
  Moon,
  Monitor,
  Check,
  GalleryHorizontalEnd,
  ImagePlus,
  BookMarked,
  Send,
  FileText,
  Bot,
  ShieldCheck,
  ScrollText,
  Lock,
  Building2,
  Wallet,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme, type Theme } from "@/lib/theme";
import { Logo, LogoMark } from "@/components/ads/Logo";
import { cn } from "@/lib/utils";
import { usePermissoes, recursoDoPath, registrarAcesso, trocarEmpresa, primeiraTelaLiberada } from "@/lib/permissoes";

type NavItem ={ to: string; label: string; icon: any; exact?: boolean; keywords?: string };
type NavGroup = { id: string; label: string; icon: any; items: NavItem[] };

// Item avulso no topo.
const DASHBOARD: NavItem = {
  to: "/ads",
  label: "Dashboard",
  icon: LayoutDashboard,
  exact: true,
  keywords: "inicio visão geral kpis",
};

// Menus agrupados por assunto (colapsáveis).
const GROUPS: NavGroup[] = [
  {
    id: "midia",
    label: "Mídia paga",
    icon: Megaphone,
    items: [
      {
        to: "/ads/campanhas",
        label: "Campanhas",
        icon: Megaphone,
        keywords: "meta campanha gasto cpl",
      },
      { to: "/ads/anuncios", label: "Anúncios", icon: Image, keywords: "ads top anúncios ctr" },
      { to: "/ads/criativos", label: "Criativos", icon: Film, keywords: "vídeo imagem cpmql" },
      { to: "/ads/audiencias", label: "Audiências", icon: Users, keywords: "público segmentação" },
    ],
  },
  {
    id: "conversao",
    label: "Conversão",
    icon: Globe,
    items: [
      { to: "/ads/lps", label: "Landing Pages", icon: Globe, keywords: "lp página cvr clarity" },
      {
        to: "/ads/capi-events",
        label: "Eventos CAPI",
        icon: Webhook,
        keywords: "conversions api pixel",
      },
      {
        to: "/ads/automacoes",
        label: "Automações do Instagram",
        icon: Bot,
        keywords: "comentário dm manychat palavra-chave resposta automática",
      },
    ],
  },
  {
    // Performance Analyst: o cérebro de IA que conecta referência, roteiro, edição,
    // publicação, anúncio e funil, e estima a chance de cada caminho dar resultado.
    id: "performance",
    label: "Performance Analyst",
    icon: BrainCircuit,
    items: [
      { to: "/ads/conexoes", label: "Conexões", icon: Network, keywords: "performance analyst mapa neural correlação referências roteiros vídeos publicados anúncios funil viralizar probabilidade" },
    ],
  },
  {
    id: "analise",
    label: "Análise & Saúde",
    icon: Sparkles,
    items: [
      { to: "/ads/insights", label: "Insights", icon: Sparkles, keywords: "recomendações análise" },
      {
        to: "/ads/saude",
        label: "Saúde",
        icon: Activity,
        keywords: "health check alertas sync falhas",
      },
    ],
  },
  {
    // Editor de vídeo com IA: edita, renderiza e publica sem sair do Ads.
    id: "edicao",
    label: "Edição de vídeos",
    icon: Clapperboard,
    items: [
      {
        to: "/ads/edicao",
        label: "Estúdio",
        icon: Clapperboard,
        exact: true,
        keywords: "vídeo editor reels",
      },
      { to: "/ads/edicao/efeitos", label: "Efeitos", icon: Wand2, keywords: "legenda animação" },
      {
        to: "/ads/edicao/trilhas",
        label: "Trilhas",
        icon: Music2,
        keywords: "música trilha sonora fundo",
      },
      {
        to: "/ads/edicao/pesquisa",
        label: "Pesquisa",
        icon: Search,
        keywords: "nicho reels virais roteiro concorrentes",
      },
      {
        to: "/ads/edicao/referencias",
        label: "Referências",
        icon: BookOpen,
        keywords: "reels análise técnicas benchmark",
      },
      {
        to: "/ads/edicao/roteiros",
        label: "Roteiros",
        icon: FileText,
        keywords: "roteiro script pausas estrutura idioma",
      },
      {
        to: "/ads/edicao/publicados",
        label: "Publicados",
        icon: Send,
        keywords: "publicado agendado instagram performance alcance reaproveitar",
      },
      {
        to: "/ads/edicao/marca",
        label: "Marca",
        icon: Palette,
        keywords: "cores fontes identidade",
      },
    ],
  },
  {
    // Carrosséis e posts únicos com as fotos da Mariana: estúdio de fotos com IA e referências.
    id: "criativos",
    label: "Edição criativos",
    icon: GalleryHorizontalEnd,
    items: [
      {
        to: "/ads/criar",
        label: "Criativos",
        icon: GalleryHorizontalEnd,
        exact: true,
        keywords: "carrossel post imagem instagram",
      },
      {
        to: "/ads/criar/fotos",
        label: "Minhas fotos",
        icon: ImagePlus,
        keywords: "fotos estúdio ia retrato comandos",
      },
      {
        to: "/ads/criar/referencias",
        label: "Referências",
        icon: BookMarked,
        keywords: "carrossel referência estilo",
      },
      {
        to: "/ads/criar/publicados",
        label: "Publicados",
        icon: Send,
        keywords: "publicado agendado instagram performance alcance reaproveitar",
      },
    ],
  },
  {
    // Consumo de IA da empresa ativa, com fechamento por semana.
    id: "conta",
    label: "Conta",
    icon: Wallet,
    items: [
      { to: "/ads/gastos", label: "Gasto de API", icon: Wallet, keywords: "custo api ia tokens consumo fechamento semana fatura" },
    ],
  },
];

// Administração: só aparece para administradores (profiles.is_admin).
const ADMIN_GROUP: NavGroup = {
  id: "admin",
  label: "Administração",
  icon: ShieldCheck,
  items: [
    { to: "/ads/admin", label: "Usuários", icon: Users, exact: true, keywords: "usuários permissões acessos cadastro senha" },
    { to: "/ads/admin/empresas", label: "Empresas", icon: Building2, keywords: "empresas clientes módulos liberar acesso" },
    { to: "/ads/admin/acessos", label: "Log de acessos", icon: ScrollText, keywords: "log auditoria quem acessou" },
  ],
};
const TODOS_GRUPOS: NavGroup[] = [...GROUPS, ADMIN_GROUP];

// Lista achatada (modo recolhido e busca).
const ALL_ITEMS: NavItem[] = [DASHBOARD, ...TODOS_GRUPOS.flatMap((g) => g.items)];

const COLLAPSE_KEY = "ads-sidebar-collapsed";
const GROUPS_KEY = "ads-sidebar-groups";

const THEME_OPTS: { v: Theme; l: string; icon: any }[] = [
  { v: "dark", l: "Escuro", icon: Moon },
  { v: "light", l: "Claro", icon: Sun },
  { v: "system", l: "Sistema", icon: Monitor },
];

export function AdsLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const { theme, resolved, setTheme } = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [tick, setTick] = useState(0);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  // Permissões por tela: a sidebar e a busca só mostram o que a pessoa pode ver;
  // Administração só para admins. Enquanto carrega, mostra tudo (evita piscar).
  const perm = usePermissoes();
  const visivel = (it: NavItem) => {
    const r = recursoDoPath(it.to);
    if (!r) return true;
    if (r.key === "admin") return perm.isAdmin;
    return !perm.carregando && perm.podeVer(r.key);
  };
  const dashVisivel = visivel(DASHBOARD);
  const gruposVisiveis = TODOS_GRUPOS.map((g) => ({ ...g, items: g.items.filter(visivel) })).filter(
    (g) => g.items.length > 0,
  );
  const itensVisiveis = [DASHBOARD, ...gruposVisiveis.flatMap((g) => g.items)].filter(visivel);
  const recursoAtual = recursoDoPath(path);
  const semAcesso =
    !perm.carregando &&
    !!perm.userId &&
    !!recursoAtual &&
    (recursoAtual.key === "admin" ? !perm.isAdmin : !perm.podeVer(recursoAtual.key));

  // Empresa ativa: a IAplicada vê mídia paga (Meta); empresas clientes, não.
  const ehInterna = !!perm.empresa?.interna;
  const [trocando, setTrocando] = useState(false);
  async function mudarEmpresa(id: string) {
    if (id === perm.empresa?.id) return;
    setTrocando(true);
    try {
      const p = await trocarEmpresa(id);
      qc.clear(); // nada da empresa anterior fica em cache
      toast.success(`Agora em ${p.empresa?.nome ?? "outra empresa"}`);
      navigate({ to: primeiraTelaLiberada(p) as any });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTrocando(false);
    }
  }

  // Na raiz (/ads) sem permissão de Dashboard, vai direto para a primeira tela
  // liberada em vez de mostrar "sem acesso" — a raiz não foi escolha da pessoa.
  useEffect(() => {
    if (semAcesso && path === "/ads") {
      const destino = itensVisiveis.find((it) => it.to !== "/ads")?.to;
      if (destino) navigate({ to: destino as any, replace: true });
    }
  }, [semAcesso, path]);

  // Log de acessos: registra cada tela aberta.
  useEffect(() => {
    void registrarAcesso("page_view", recursoDoPath(path)?.key ?? path);
  }, [path]);

  // Última sincronização REAL: vem do banco (quando a meta-ads-sync gravou por
  // último), não do relógio do navegador.
  const lastSyncQ = useQuery({
    queryKey: ["mads", "last_sync"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mads_campaigns")
        .select("ultima_sincronizacao_em")
        .order("ultima_sincronizacao_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.ultima_sincronizacao_em ? new Date(data.ultima_sincronizacao_em) : null;
    },
    refetchInterval: 60_000,
    enabled: ehInterna,
  });
  const lastSync = lastSyncQ.data ?? null;
  const syncStale = !!lastSync && Date.now() - lastSync.getTime() > 2 * 3600 * 1000;

  // Alertas de saúde (campanhas com problema de conexão) → sino no topo.
  const healthQ = useQuery({
    queryKey: ["mads", "health_badge"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mads_v_health_check")
        .select("status_conexao, total_campanhas");
      return (data ?? [])
        .filter((h: any) => h.status_conexao !== "ok")
        .reduce((a: number, h: any) => a + (h.total_campanhas ?? 0), 0);
    },
    refetchInterval: 5 * 60_000,
    enabled: ehInterna,
  });
  const alertas = healthQ.data ?? 0;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  // Desktop: icon-only collapse. Mobile: off-canvas drawer.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(GROUPS_KEY) ?? "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved != null) setCollapsed(saved === "1");
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);
  useEffect(() => {
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(openGroups));
    } catch {
      /* ignore */
    }
  }, [openGroups]);

  // Fecha o drawer mobile ao navegar.
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  useEffect(() => {
    // Re-lê o banco periodicamente (a sync na Meta roda no servidor via cron a
    // cada 15 min). O tick só reanima o "há X min".
    const i = setInterval(
      () => {
        qc.invalidateQueries();
      },
      5 * 60 * 1000,
    );
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => {
      clearInterval(i);
      clearInterval(t);
    };
  }, [qc]);

  // ⌘K / Ctrl+K abre a busca.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (to: string, exact = false) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  // Grupo e item da página atual (título do topo + auto-expand do grupo).
  // Editores (vídeo e criativo) ocupam a altura toda: sem rodapé e sem margem extra
  // embaixo, alinhados com a base da sidebar.
  const telaCheia = /^\/ads\/(edicao|criar)\/[0-9a-f]{8}-[0-9a-f-]{27}\/?$/i.test(path);
  const activeGroup = useMemo(
    () => TODOS_GRUPOS.find((g) => g.items.some((it) => isActive(it.to, it.exact))),
    [path],
  );
  const activeItem = useMemo(() => {
    let hits = ALL_ITEMS.filter((it) => isActive(it.to, it.exact));
    // Subpáginas (ex.: /ads/edicao/<id>) herdam o item do pai mesmo quando ele é "exact".
    if (!hits.length) hits = ALL_ITEMS.filter((it) => it.to !== "/ads" && isActive(it.to, false));
    return (
      hits.sort((a, b) => b.to.length - a.to.length)[0] ??
      (path.startsWith("/ads") ? DASHBOARD : undefined)
    );
  }, [path]);
  useEffect(() => {
    if (activeGroup)
      setOpenGroups((o) => (o[activeGroup.id] ? o : { ...o, [activeGroup.id]: true }));
  }, [activeGroup?.id]);

  async function refresh() {
    setSyncing(true);
    toast.info("Sincronizando dados Meta...");
    try {
      // meta-ads-sync (token META_ADS_TOKEN) — a função que está funcionando.
      const r = await fetch("https://ciwdlceyjsnlnunktqzx.supabase.co/functions/v1/meta-ads-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.error) throw new Error(j?.error || `Sync falhou (${r.status})`);
      await qc.invalidateQueries();
      await lastSyncQ.refetch();
      toast.success(
        `Sincronizado — ${j?.statuses_updated ?? 0} status atualizados, ${j?.days_synced ?? 0} dia(s) de métricas.`,
      );
    } catch (e) {
      toast.error(`Sync falhou: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function signOut() {
    await registrarAcesso("logout");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const go = (to: string) => {
    setCmdOpen(false);
    navigate({ to: to as any });
  };

  // A sidebar sempre renderiza completa (com rótulos). No desktop, "ocultar"
  // esconde o painel inteiro deslizando para fora — não existe modo só-ícones.
  // O botão no topo (com o símbolo da marca) traz de volta.
  const showLabels = true;
  const initials = (email ?? "IA").slice(0, 2).toUpperCase();

  const itemClass = (active: boolean, indent = false) =>
    cn(
      "group relative flex items-center gap-3 text-[13px] font-medium transition-all duration-200",
      showLabels
        ? indent
          ? "h-9 rounded-xl px-3"
          : "h-10 rounded-xl px-3"
        : "h-10 rounded-xl px-0 justify-center",
      active
        ? indent
          ? // Subitem ativo: pílula translúcida com brilho de marca.
            "bg-primary/15 text-sidebar-foreground ring-1 ring-primary/30 shadow-[0_0_20px_-8px_var(--color-primary)] [&_svg]:text-primary"
          : // Item principal ativo: pílula lime sólida.
            "bg-primary text-primary-foreground shadow-[0_8px_22px_-10px_var(--color-primary)]"
        : "text-sidebar-foreground/65 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground hover:translate-x-0.5",
      // Ponto na guia vertical à esquerda do subitem ativo.
      active &&
        indent &&
        showLabels &&
        "before:absolute before:-left-[14.5px] before:top-1/2 before:-translate-y-1/2 before:h-2 before:w-2 before:rounded-full before:bg-primary before:shadow-[0_0_10px_var(--color-primary)]",
    );

  const NavLink = ({ it, indent = false }: { it: NavItem; indent?: boolean }) => {
    const active = isActive(it.to, it.exact);
    const link = (
      <Link
        to={it.to as any}
        className={itemClass(active, indent)}
        aria-current={active ? "page" : undefined}
      >
        <it.icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-150",
            !showLabels && "group-hover:scale-110",
          )}
          strokeWidth={active ? 2.25 : 1.75}
        />
        {showLabels && <span className="truncate" title={it.label}>{it.label}</span>}
      </Link>
    );
    if (showLabels) return link;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {it.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative isolate min-h-dvh flex bg-background text-foreground bg-grain">
        {/* Fundo único da aplicação (sidebar e conteúdo sobre a mesma camada). */}
        <div aria-hidden className="app-bg" />
        {/* Backdrop do drawer mobile */}
        {isMobile && mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={cn(
            "z-50 flex flex-col bg-sidebar/95 backdrop-blur-xl transition-[width,transform,margin] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
            "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--color-primary)_7%,transparent),transparent_30%)]",
            isMobile
              ? cn(
                  "fixed inset-y-0 left-0 w-72 shadow-elevated border-r border-sidebar-border",
                  mobileOpen ? "translate-x-0" : "-translate-x-full",
                )
              : cn(
                  // Painel flutuante com cantos arredondados (estrutura das referências).
                  "sticky top-3 h-[calc(100dvh-1.5rem)] my-3 rounded-3xl border border-sidebar-border/80 shadow-elevated overflow-hidden",
                  collapsed
                    ? "w-0 ml-0 -translate-x-full border-0 pointer-events-none"
                    : "w-[17.5rem] ml-3 translate-x-0",
                ),
          )}
          aria-label="Navegação principal"
        >
          <div
            className={cn(
              "h-16 shrink-0 flex items-center",
              showLabels ? "px-5 gap-2" : "px-0 justify-center",
            )}
          >
            <Link to="/ads" className="flex items-center min-w-0" aria-label="Ir para o Dashboard">
              {showLabels ? <Logo size={22} /> : <LogoMark size={28} />}
            </Link>
            {showLabels && (
              <span className="ml-2 inline-flex h-[18px] items-center self-center rounded-md bg-primary px-1.5 text-[10px] font-bold leading-none tracking-[0.12em] text-primary-foreground">
                ADS
              </span>
            )}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Empresa ativa (troca sem sair do sistema) */}
          {perm.empresa && (
            <div className="px-3 pt-3">
              {perm.empresas.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={trocando}
                      className="w-full flex items-center gap-2.5 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent disabled:opacity-60"
                      aria-label="Trocar de empresa"
                    >
                      <span className="h-7 w-7 shrink-0 rounded-md bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
                        {perm.empresa.nome.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] text-muted-foreground leading-none mb-0.5">Empresa</span>
                        <span className="block text-[13px] font-semibold truncate leading-tight">{perm.empresa.nome}</span>
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[14rem]">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Trocar de empresa</DropdownMenuLabel>
                    {perm.empresas.map((e) => (
                      <DropdownMenuItem key={e.id} onClick={() => mudarEmpresa(e.id)} className="gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{e.nome}</span>
                        {e.id === perm.empresa?.id && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
                  <span className="h-7 w-7 shrink-0 rounded-md bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
                    {perm.empresa.nome.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] text-muted-foreground leading-none mb-0.5">Empresa</span>
                    <span className="block text-[13px] font-semibold truncate leading-tight">{perm.empresa.nome}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          <nav
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(180deg,transparent,black_12px,black_calc(100%-24px),transparent)]",
              showLabels ? "px-3 space-y-0.5" : "px-2.5 space-y-1",
            )}
          >
            {!showLabels ? (
              ALL_ITEMS.map((it) => <NavLink key={it.to} it={it} />)
            ) : (
              <>
                {dashVisivel && <NavLink it={DASHBOARD} />}
                {gruposVisiveis.map((g) => {
                  const open = !!openGroups[g.id];
                  const groupActive = g.items.some((it) => isActive(it.to, it.exact));
                  return (
                    <div key={g.id} className="pt-1">
                      <button
                        type="button"
                        onClick={() => setOpenGroups((o) => ({ ...o, [g.id]: !o[g.id] }))}
                        className={cn(
                          "w-full h-10 flex items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-200",
                          groupActive
                            ? "bg-sidebar-accent text-sidebar-foreground ring-1 ring-sidebar-border"
                            : open
                              ? "text-sidebar-foreground hover:bg-sidebar-accent/70"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                        )}
                        aria-expanded={open}
                      >
                        <span
                          className={cn(
                            "h-6 w-6 shrink-0 rounded-lg flex items-center justify-center transition-colors",
                            groupActive ? "bg-primary/20 text-primary shadow-[0_0_14px_-4px_var(--color-primary)]" : "text-sidebar-foreground/60",
                          )}
                        >
                          <g.icon className="h-4 w-4" strokeWidth={1.9} />
                        </span>
                        <span className="truncate flex-1 text-left">{g.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                            open ? "rotate-180" : "",
                          )}
                        />
                      </button>
                      <div
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="space-y-0.5 pt-1 pb-1.5 ml-[1.2rem] pl-2.5 border-l border-sidebar-border">
                            {g.items.map((it) => (
                              <NavLink key={it.to} it={it} indent />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </nav>

          {/* Usuário */}
          {/* Cartão de marca no rodapé do menu (estrutura dos anexos 3 e 4). */}
          {showLabels && (
            <div className="px-3 pb-3 shrink-0 [@media(max-height:860px)]:hidden">
              <div className="relative overflow-hidden rounded-2xl p-3.5 hero-art border border-white/10 text-white">
                <img src="/brand/iaplicada-mark.png" alt="" aria-hidden className="absolute -right-5 -bottom-6 h-24 opacity-30 drop-shadow-[0_0_24px_rgba(175,192,65,0.6)]" />
                <div className="relative">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AFC041]">IAplicada</div>
                  <p className="mt-1 text-[12px] leading-snug text-white/80">
                    IA aplicada ao que dá resultado: mídia, criativo e edição no mesmo lugar.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCmdOpen(true)}
                    className="mt-2.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-[#AFC041] px-3 text-[11px] font-semibold text-[#10120b] shadow-[0_6px_16px_-6px_#AFC041] transition-transform hover:-translate-y-px"
                  >
                    <Search className="h-3 w-3" /> Ir para…
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Rodapé da conta (referências 3 e 4): cartão de perfil com avatar em anel de
              marca e ações visíveis — tema e Sair — em vez de escondidas num menu. */}
          <div className={cn("p-3 pt-2 shrink-0", !showLabels && "px-2")}>
            {showLabels ? (
              <div className="rounded-2xl border border-sidebar-border/80 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--color-foreground)_4%,transparent),transparent)] p-2.5 shadow-card">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9 rounded-full ring-2 ring-primary/50 ring-offset-2 ring-offset-sidebar shadow-[0_0_14px_-3px_var(--color-primary)]">
                      <AvatarFallback className="rounded-full bg-primary/15 text-primary text-[11px] font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-sidebar" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold truncate">{email?.split("@")[0] ?? "Conta"}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">{email ?? "IAplicada"}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <div className="flex items-center rounded-full bg-muted/60 p-0.5 ring-1 ring-border/60" role="radiogroup" aria-label="Tema">
                    {THEME_OPTS.map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        role="radio"
                        aria-checked={theme === o.v}
                        aria-label={o.l}
                        title={o.l}
                        onClick={() => setTheme(o.v)}
                        className={cn(
                          "h-7 w-7 rounded-full inline-flex items-center justify-center transition-all duration-200",
                          theme === o.v ? "bg-card text-primary shadow-sm ring-1 ring-primary/30" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <o.icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    className="ml-auto h-8 inline-flex items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground ring-1 ring-border/70 bg-card/60 transition-all duration-200 hover:text-danger hover:ring-danger/40 hover:bg-danger-soft hover:shadow-[0_6px_16px_-8px_var(--color-danger)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sair
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Avatar className="h-8 w-8 rounded-full ring-2 ring-primary/50 ring-offset-2 ring-offset-sidebar">
                  <AvatarFallback className="rounded-full bg-primary/15 text-primary text-[10px] font-bold">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sair"
                  title="Sair"
                  className="h-8 w-8 rounded-full inline-flex items-center justify-center text-muted-foreground ring-1 ring-border/70 transition-colors hover:text-danger hover:bg-danger-soft hover:ring-danger/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Conteúdo ────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 relative z-[1] h-dvh overflow-y-auto">
          {/* Barra superior enxuta, flutuante em vidro: só onde a pessoa está e as ações
              rápidas. A navegação completa fica na sidebar (sem repetir itens aqui). */}
          <header className="shrink-0 h-[72px] lg:h-[76px] sticky top-3 z-30 mx-2 sm:mx-4 lg:mx-6 mt-3 flex items-center justify-between gap-4 px-4 sm:px-5 rounded-2xl glass">
            <div className="flex items-center gap-2 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-muted-foreground",
                      collapsed && !isMobile && "text-primary bg-primary/10 hover:bg-primary/15",
                    )}
                    onClick={() => (isMobile ? setMobileOpen(true) : setCollapsed((c) => !c))}
                    aria-label={
                      isMobile ? "Abrir menu" : collapsed ? "Mostrar menu" : "Ocultar menu"
                    }
                    aria-expanded={isMobile ? mobileOpen : !collapsed}
                  >
                    {isMobile ? (
                      <Menu className="h-5 w-5" />
                    ) : collapsed ? (
                      <PanelLeftOpen className="h-5 w-5" />
                    ) : (
                      <PanelLeftClose className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isMobile ? "Abrir menu" : collapsed ? "Mostrar menu" : "Ocultar menu"}
                </TooltipContent>
              </Tooltip>
              {/* Com a sidebar oculta, o símbolo da marca aparece no topo e também reabre o menu. */}
              {collapsed && !isMobile && (
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="hidden sm:inline-flex items-center rounded-md p-1 hover:bg-accent transition-colors animate-fade-up"
                  aria-label="Mostrar menu"
                >
                  <LogoMark size={28} />
                </button>
              )}
              <div className="min-w-0 hidden sm:block">
                {activeGroup && (
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground leading-none mb-1.5">
                    {activeGroup.label}
                  </div>
                )}
                <div className="text-lg lg:text-xl font-semibold leading-tight truncate">
                  {activeItem?.label ?? "IAplicada Ads"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Busca / command palette */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCmdOpen(true)}
                className="h-11 gap-2.5 px-4 text-muted-foreground font-normal pr-2 min-w-[200px] justify-start hidden sm:inline-flex"
                aria-label="Buscar (⌘K)"
              >
                <Search className="h-4 w-4" />
                <span className="text-sm">Buscar…</span>
                <kbd className="ml-auto rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCmdOpen(true)}
                className="sm:hidden text-muted-foreground"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Sync */}
              {ehInterna && (
              <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={refresh}
                    disabled={syncing}
                    className={cn(
                      "h-11 inline-flex items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                      syncStale
                        ? "border-warning/40 bg-warning-soft text-warning"
                        : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-accent",
                      syncing && "opacity-70",
                    )}
                    aria-label="Atualizar dados da Meta"
                  >
                    <span className="relative flex h-2 w-2">
                      {!syncStale && !syncing && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
                      )}
                      <span
                        className={cn(
                          "relative inline-flex h-2 w-2 rounded-full",
                          syncStale ? "bg-warning" : "bg-success",
                        )}
                      />
                    </span>
                    <span className="hidden xl:inline whitespace-nowrap" key={tick}>
                      {syncing
                        ? "Sincronizando…"
                        : lastSync
                          ? `há ${formatDistanceToNow(lastSync, { locale: ptBR })}`
                          : "sem registro"}
                    </span>
                    <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {lastSync
                    ? `Última sincronização: ${lastSync.toLocaleString("pt-BR")}`
                    : "Sem registro de sincronização"}{" "}
                  · clique para forçar agora
                </TooltipContent>
              </Tooltip>

              {/* Alertas de saúde */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/ads/saude"
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label={`${alertas} alertas de saúde`}
                  >
                    <Bell className="h-5 w-5" />
                    {alertas > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background">
                        {alertas > 9 ? "9+" : alertas}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {alertas > 0 ? `${alertas} campanha(s) com problema de conexão` : "Tudo saudável"}
                </TooltipContent>
              </Tooltip>
              </>
              )}

              {/* Tema */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    aria-label="Tema"
                  >
                    {resolved === "dark" ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {THEME_OPTS.map((o) => (
                    <DropdownMenuItem key={o.v} onClick={() => setTheme(o.v)} className="gap-2">
                      <o.icon className="h-4 w-4" />
                      {o.l}
                      {theme === o.v && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="flex-1 relative">
            {/* Página de sistema ocupa toda a largura disponível (sem max-w + mx-auto):
                cards, gráficos e tabelas se adaptam à tela em vez de ficarem numa
                coluna centralizada com margens vazias. */}
            <div className={cn("page-content relative z-[1] p-4 sm:p-6 lg:p-8 w-full min-w-0", telaCheia && "pb-3 sm:pb-3 lg:pb-3")}>
              {semAcesso ? (
                <div className="min-h-[50vh] flex items-center justify-center animate-fade-up">
                  <div className="text-center max-w-sm">
                    <div className="mx-auto h-11 w-11 rounded-2xl bg-muted border border-border/60 flex items-center justify-center mb-3">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-base font-semibold">Sem acesso a {recursoAtual?.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Peça a um administrador para liberar esta tela para você.
                    </div>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link to={(itensVisiveis[0]?.to ?? "/ads") as any}>Ir para o início</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <Outlet />
              )}
            </div>
            {ehInterna && !telaCheia && (
              <footer className="relative z-[1] mt-6 py-4 px-6 text-center text-[11px] text-muted-foreground/70">
                Dados da Meta sincronizados automaticamente a cada 15 min · use o indicador no topo
                para forçar agora.
              </footer>
            )}
          </div>
        </main>

        {/* ── Command palette (⌘K) ────────────────────────────────────── */}
        <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
          <CommandInput placeholder="Ir para… ou executar uma ação" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup heading="Navegar">
              {itensVisiveis.map((it) => (
                <CommandItem
                  key={it.to}
                  value={`${it.label} ${it.keywords ?? ""}`}
                  onSelect={() => go(it.to)}
                  className="gap-2"
                >
                  <it.icon className="h-4 w-4 text-muted-foreground" />
                  {it.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Ações">
              {ehInterna && (
              <CommandItem
                value="atualizar sincronizar dados meta"
                onSelect={() => {
                  setCmdOpen(false);
                  refresh();
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Atualizar dados da Meta agora
              </CommandItem>
              )}
              {perm.empresas.length > 1 &&
                perm.empresas
                  .filter((e) => e.id !== perm.empresa?.id)
                  .map((e) => (
                    <CommandItem
                      key={e.id}
                      value={`empresa trocar ${e.nome}`}
                      onSelect={() => {
                        setCmdOpen(false);
                        void mudarEmpresa(e.id);
                      }}
                      className="gap-2"
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Ir para {e.nome}
                    </CommandItem>
                  ))}
              {THEME_OPTS.map((o) => (
                <CommandItem
                  key={o.v}
                  value={`tema ${o.l}`}
                  onSelect={() => {
                    setTheme(o.v);
                    setCmdOpen(false);
                  }}
                  className="gap-2"
                >
                  <o.icon className="h-4 w-4 text-muted-foreground" />
                  Tema {o.l.toLowerCase()}
                </CommandItem>
              ))}
              <CommandItem value="sair logout" onSelect={signOut} className="gap-2 text-danger">
                <LogOut className="h-4 w-4" />
                Sair<CommandShortcut>⇧⌘Q</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </TooltipProvider>
  );
}
