import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Megaphone, Image, Activity, RefreshCw, LogOut, Globe, Menu, PanelLeftClose, PanelLeftOpen, X,
  Users, Webhook, Film, Sparkles, ChevronDown, Clapperboard, Wand2, Palette, Search, Bell, Sun, Moon, Monitor, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
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

type NavItem = { to: string; label: string; icon: any; exact?: boolean; keywords?: string };
type NavGroup = { id: string; label: string; icon: any; items: NavItem[] };

// Item avulso no topo.
const DASHBOARD: NavItem = { to: "/ads", label: "Dashboard", icon: LayoutDashboard, exact: true, keywords: "inicio visão geral kpis" };

// Menus agrupados por assunto (colapsáveis).
const GROUPS: NavGroup[] = [
  {
    id: "midia", label: "Mídia paga", icon: Megaphone, items: [
      { to: "/ads/campanhas", label: "Campanhas", icon: Megaphone, keywords: "meta campanha gasto cpl" },
      { to: "/ads/anuncios", label: "Anúncios", icon: Image, keywords: "ads top anúncios ctr" },
      { to: "/ads/criativos", label: "Criativos", icon: Film, keywords: "vídeo imagem cpmql" },
      { to: "/ads/audiencias", label: "Audiências", icon: Users, keywords: "público segmentação" },
    ],
  },
  {
    id: "conversao", label: "Conversão", icon: Globe, items: [
      { to: "/ads/lps", label: "Landing Pages", icon: Globe, keywords: "lp página cvr clarity" },
      { to: "/ads/capi-events", label: "Eventos CAPI", icon: Webhook, keywords: "conversions api pixel" },
    ],
  },
  {
    id: "analise", label: "Análise & Saúde", icon: Sparkles, items: [
      { to: "/ads/insights", label: "Insights", icon: Sparkles, keywords: "recomendações análise" },
      { to: "/ads/saude", label: "Saúde", icon: Activity, keywords: "health check alertas sync falhas" },
    ],
  },
  {
    // Editor de vídeo com IA: edita, renderiza e publica sem sair do Ads.
    id: "edicao", label: "Edição", icon: Clapperboard, items: [
      { to: "/ads/edicao", label: "Estúdio", icon: Clapperboard, exact: true, keywords: "vídeo editor reels" },
      { to: "/ads/edicao/efeitos", label: "Efeitos", icon: Wand2, keywords: "legenda animação" },
      { to: "/ads/edicao/marca", label: "Marca", icon: Palette, keywords: "cores fontes identidade" },
    ],
  },
];

// Lista achatada (modo recolhido e busca).
const ALL_ITEMS: NavItem[] = [DASHBOARD, ...GROUPS.flatMap((g) => g.items)];

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
  });
  const lastSync = lastSyncQ.data ?? null;
  const syncStale = !!lastSync && Date.now() - lastSync.getTime() > 2 * 3600 * 1000;

  // Alertas de saúde (campanhas com problema de conexão) → sino no topo.
  const healthQ = useQuery({
    queryKey: ["mads", "health_badge"],
    queryFn: async () => {
      const { data } = await supabase.from("mads_v_health_check").select("status_conexao, total_campanhas");
      return (data ?? []).filter((h: any) => h.status_conexao !== "ok").reduce((a: number, h: any) => a + (h.total_campanhas ?? 0), 0);
    },
    refetchInterval: 5 * 60_000,
  });
  const alertas = healthQ.data ?? 0;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  // Desktop: icon-only collapse. Mobile: off-canvas drawer.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(GROUPS_KEY) ?? "{}"); } catch { return {}; }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved != null) setCollapsed(saved === "1");
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => { try { localStorage.setItem(GROUPS_KEY, JSON.stringify(openGroups)); } catch { /* ignore */ } }, [openGroups]);

  // Fecha o drawer mobile ao navegar.
  useEffect(() => { setMobileOpen(false); }, [path]);

  useEffect(() => {
    // Re-lê o banco periodicamente (a sync na Meta roda no servidor via cron a
    // cada 15 min). O tick só reanima o "há X min".
    const i = setInterval(() => { qc.invalidateQueries(); }, 5 * 60 * 1000);
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => { clearInterval(i); clearInterval(t); };
  }, [qc]);

  // ⌘K / Ctrl+K abre a busca.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (to: string, exact = false) => exact ? path === to : path === to || path.startsWith(to + "/");

  // Grupo e item da página atual (título do topo + auto-expand do grupo).
  const activeGroup = useMemo(() => GROUPS.find((g) => g.items.some((it) => isActive(it.to, it.exact))), [path]);
  const activeItem = useMemo(() => {
    const hits = ALL_ITEMS.filter((it) => isActive(it.to, it.exact));
    return hits.sort((a, b) => b.to.length - a.to.length)[0] ?? (path.startsWith("/ads") ? DASHBOARD : undefined);
  }, [path]);
  useEffect(() => {
    if (activeGroup) setOpenGroups((o) => (o[activeGroup.id] ? o : { ...o, [activeGroup.id]: true }));
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
      toast.success(`Sincronizado — ${j?.statuses_updated ?? 0} status atualizados, ${j?.days_synced ?? 0} dia(s) de métricas.`);
    } catch (e) {
      toast.error(`Sync falhou: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const go = (to: string) => { setCmdOpen(false); navigate({ to: to as any }); };

  // No mobile a sidebar nunca fica só-ícones; é largura cheia dentro do drawer.
  const showLabels = isMobile ? true : !collapsed;
  const initials = (email ?? "IA").slice(0, 2).toUpperCase();

  const itemClass = (active: boolean, indent = false) => cn(
    "group relative flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors duration-150",
    showLabels ? (indent ? "pl-9 pr-3 py-2" : "px-3 py-2") : "px-0 py-2.5 justify-center",
    active
      ? "bg-primary/12 text-primary"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
    // Rail lime à esquerda do item ativo.
    active && showLabels && "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-r-full before:bg-primary",
  );

  const NavLink = ({ it, indent = false }: { it: NavItem; indent?: boolean }) => {
    const active = isActive(it.to, it.exact);
    const link = (
      <Link to={it.to as any} className={itemClass(active, indent)} aria-current={active ? "page" : undefined}>
        <it.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-150", !showLabels && "group-hover:scale-110")} strokeWidth={active ? 2.25 : 1.75} />
        {showLabels && <span className="truncate">{it.label}</span>}
      </Link>
    );
    if (showLabels) return link;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{it.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-dvh flex bg-background text-foreground bg-grain">
        {/* Backdrop do drawer mobile */}
        {isMobile && mobileOpen && (
          <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={cn(
            "z-50 flex flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-md transition-[width,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
            isMobile
              ? cn("fixed inset-y-0 left-0 w-72 shadow-elevated", mobileOpen ? "translate-x-0" : "-translate-x-full")
              : cn("sticky top-0 h-dvh", collapsed ? "w-[4.25rem]" : "w-[15.5rem]"),
          )}
          aria-label="Navegação principal"
        >
          <div className={cn("h-16 flex items-center border-b border-sidebar-border/70", showLabels ? "px-5 gap-2" : "px-0 justify-center")}>
            <Link to="/ads" className="flex items-center min-w-0" aria-label="Ir para o Dashboard">
              {showLabels ? <Logo size={22} /> : <LogoMark size={28} />}
            </Link>
            {showLabels && <span className="ml-1.5 mt-0.5 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.14em] text-primary">Ads</span>}
            {isMobile && (
              <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-3", showLabels ? "px-3 space-y-0.5" : "px-2.5 space-y-1")}>
            {!showLabels ? (
              ALL_ITEMS.map((it) => <NavLink key={it.to} it={it} />)
            ) : (
              <>
                <NavLink it={DASHBOARD} />
                {GROUPS.map((g) => {
                  const open = !!openGroups[g.id];
                  const groupActive = g.items.some((it) => isActive(it.to, it.exact));
                  return (
                    <div key={g.id} className="pt-2">
                      <button
                        type="button"
                        onClick={() => setOpenGroups((o) => ({ ...o, [g.id]: !o[g.id] }))}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors",
                          groupActive ? "text-sidebar-foreground" : "text-sidebar-foreground/45 hover:text-sidebar-foreground/80",
                        )}
                        aria-expanded={open}
                      >
                        <span className="truncate flex-1 text-left">{g.label}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", open ? "rotate-180" : "")} />
                      </button>
                      <div
                        className={cn("grid transition-[grid-template-rows,opacity] duration-200 ease-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
                      >
                        <div className="overflow-hidden">
                          <div className="space-y-0.5 pt-0.5">
                            {g.items.map((it) => <NavLink key={it.to} it={it} indent />)}
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
          <div className={cn("border-t border-sidebar-border/70 p-3", !showLabels && "px-2.5")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg transition-colors hover:bg-sidebar-accent",
                    showLabels ? "px-2 py-1.5 text-left" : "justify-center py-1.5",
                  )}
                  aria-label="Conta"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-border/60">
                    <AvatarFallback className="rounded-lg bg-primary/15 text-primary text-[11px] font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  {showLabels && (
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{email?.split("@")[0] ?? "Conta"}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{email ?? "IAplicada"}</div>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">{email ?? "Conta IAplicada"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Tema</DropdownMenuLabel>
                {THEME_OPTS.map((o) => (
                  <DropdownMenuItem key={o.v} onClick={() => setTheme(o.v)} className="gap-2">
                    <o.icon className="h-4 w-4" />{o.l}
                    {theme === o.v && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="gap-2 text-danger focus:text-danger">
                  <LogOut className="h-4 w-4" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* ── Conteúdo ────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <header className="h-14 sticky top-0 z-30 flex items-center justify-between gap-3 px-3 sm:px-5 border-b border-border/60 bg-background/70 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                onClick={() => (isMobile ? setMobileOpen(true) : setCollapsed((c) => !c))}
                aria-label={isMobile ? "Abrir menu" : collapsed ? "Expandir menu" : "Recolher menu"}
              >
                {isMobile ? <Menu className="h-4.5 w-4.5" /> : collapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
              </Button>
              <div className="min-w-0 hidden sm:block">
                {activeGroup && <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground leading-none mb-0.5">{activeGroup.label}</div>}
                <div className="text-sm font-semibold leading-none truncate">{activeItem?.label ?? "IAplicada Ads"}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Busca / command palette */}
              <Button variant="outline" size="sm" onClick={() => setCmdOpen(true)} className="h-8 gap-2 text-muted-foreground font-normal pr-1.5 hidden sm:inline-flex" aria-label="Buscar (⌘K)">
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Buscar…</span>
                <kbd className="ml-3 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setCmdOpen(true)} className="sm:hidden text-muted-foreground" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </Button>

              {/* Sync */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={refresh}
                    disabled={syncing}
                    className={cn(
                      "h-8 inline-flex items-center gap-2 rounded-lg border px-2.5 text-xs transition-colors",
                      syncStale ? "border-warning/40 bg-warning-soft text-warning" : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-accent",
                      syncing && "opacity-70",
                    )}
                    aria-label="Atualizar dados da Meta"
                  >
                    <span className="relative flex h-2 w-2">
                      {!syncStale && !syncing && <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />}
                      <span className={cn("relative inline-flex h-2 w-2 rounded-full", syncStale ? "bg-warning" : "bg-success")} />
                    </span>
                    <span className="hidden md:inline" key={tick}>
                      {syncing ? "Sincronizando…" : lastSync ? `há ${formatDistanceToNow(lastSync, { locale: ptBR })}` : "sem registro"}
                    </span>
                    <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {lastSync ? `Última sincronização: ${lastSync.toLocaleString("pt-BR")}` : "Sem registro de sincronização"} · clique para forçar agora
                </TooltipContent>
              </Tooltip>

              {/* Alertas de saúde */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/ads/saude" className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label={`${alertas} alertas de saúde`}>
                    <Bell className="h-4 w-4" />
                    {alertas > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background">
                        {alertas > 9 ? "9+" : alertas}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">{alertas > 0 ? `${alertas} campanha(s) com problema de conexão` : "Tudo saudável"}</TooltipContent>
              </Tooltip>

              {/* Tema */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="Tema">
                    {resolved === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {THEME_OPTS.map((o) => (
                    <DropdownMenuItem key={o.v} onClick={() => setTheme(o.v)} className="gap-2">
                      <o.icon className="h-4 w-4" />{o.l}
                      {theme === o.v && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-aurora">
            <div className="relative z-[1] p-4 sm:p-6 lg:p-8 w-full max-w-[1680px] mx-auto">
              <Outlet />
            </div>
            <footer className="relative z-[1] mt-6 py-4 px-6 text-center text-[11px] text-muted-foreground/70">
              Dados da Meta sincronizados automaticamente a cada 15 min · use o indicador no topo para forçar agora.
            </footer>
          </div>
        </main>

        {/* ── Command palette (⌘K) ────────────────────────────────────── */}
        <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
          <CommandInput placeholder="Ir para… ou executar uma ação" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup heading="Navegar">
              {ALL_ITEMS.map((it) => (
                <CommandItem key={it.to} value={`${it.label} ${it.keywords ?? ""}`} onSelect={() => go(it.to)} className="gap-2">
                  <it.icon className="h-4 w-4 text-muted-foreground" />{it.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Ações">
              <CommandItem value="atualizar sincronizar dados meta" onSelect={() => { setCmdOpen(false); refresh(); }} className="gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />Atualizar dados da Meta agora
              </CommandItem>
              {THEME_OPTS.map((o) => (
                <CommandItem key={o.v} value={`tema ${o.l}`} onSelect={() => { setTheme(o.v); setCmdOpen(false); }} className="gap-2">
                  <o.icon className="h-4 w-4 text-muted-foreground" />Tema {o.l.toLowerCase()}
                </CommandItem>
              ))}
              <CommandItem value="sair logout" onSelect={signOut} className="gap-2 text-danger">
                <LogOut className="h-4 w-4" />Sair<CommandShortcut>⇧⌘Q</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </TooltipProvider>
  );
}
